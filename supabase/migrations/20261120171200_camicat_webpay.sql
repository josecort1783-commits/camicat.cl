create table public.camicat_payment_quotes (
 order_id uuid primary key references public.camicat_orders(id),
 mode text not null check (mode in ('integration', 'production')),
 amount integer not null check (amount between 1 and 99999999),
 delivery text not null check (delivery in ('retiro', 'envio')),
 shipping integer not null check (shipping >= 0 and shipping <= amount and (delivery <> 'retiro' or shipping = 0)),
 detail text not null check (length(detail) between 5 and 260),
 approved_by uuid not null references public.camicat_admin_members(user_id),
 approved_at timestamptz not null default now()
);

create table public.camicat_payment_attempts (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.camicat_payment_quotes(order_id),
 mode text not null check (mode in ('integration', 'production')),
 amount integer not null check (amount between 1 and 99999999),
 buy_order varchar(26) not null unique,
 session_id varchar(61) not null unique,
 token varchar(64) unique,
 state text not null default 'creating' check (state in ('creating', 'pending', 'review', 'paid', 'failed', 'cancelled')),
 authorization_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index camicat_payment_one_active on public.camicat_payment_attempts(order_id)
 where state in ('creating','pending','review','paid');
create index camicat_payment_attempt_recent on public.camicat_payment_attempts(order_id,created_at desc);

alter table public.camicat_payment_quotes enable row level security;
alter table public.camicat_payment_attempts enable row level security;
revoke all on public.camicat_payment_quotes,public.camicat_payment_attempts from public,anon,authenticated;
grant select,insert,update on public.camicat_payment_quotes,public.camicat_payment_attempts to service_role;

create function public.camicat_enable_payment(p jsonb) returns public.camicat_payment_quotes
language plpgsql security invoker set search_path='' as $$
declare
 o public.camicat_orders;
 q public.camicat_payment_quotes;
begin
 select * into o from public.camicat_orders where id=(p->>'order_id')::uuid for update;
 if not found or o.status<>'confirmado' or o.total is null or o.total<=0 or o.total is distinct from (p->>'amount')::integer then
  raise exception 'camicat_quote_not_ready';
 end if;
 if exists (select 1 from public.camicat_payment_attempts where order_id=o.id and state in ('creating','pending','review','paid')) then
  raise exception 'camicat_payment_locked';
 end if;
 insert into public.camicat_payment_quotes(order_id,mode,amount,delivery,shipping,detail,approved_by)
 values(o.id,p->>'mode',o.total,p->>'delivery',(p->>'shipping')::integer,p->>'detail',(p->>'actor')::uuid)
 on conflict(order_id) do update set mode=excluded.mode,amount=excluded.amount,delivery=excluded.delivery,
   shipping=excluded.shipping,detail=excluded.detail,approved_by=excluded.approved_by,approved_at=now()
 returning * into q;
 insert into public.camicat_order_events(order_id,status,detail)
 values(o.id,'pago_habilitado','Camicat confirmó el monto y la entrega.');
 return q;
end $$;

create function public.camicat_claim_payment(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 o public.camicat_orders;
 q public.camicat_payment_quotes;
 a public.camicat_payment_attempts;
begin
 select * into o from public.camicat_orders where token_hash=p->>'token_hash' for update;
 if not found or o.status<>'confirmado' then raise exception 'camicat_quote_not_ready'; end if;
 select * into q from public.camicat_payment_quotes where order_id=o.id;
 if not found or q.mode is distinct from p->>'mode' or q.amount is distinct from o.total
   or q.amount is distinct from (p->>'amount')::integer or q.approved_at is distinct from (p->>'approved_at')::timestamptz then
  raise exception 'camicat_quote_not_ready';
 end if;
 -- A token is never sent to a browser until its attempt is persisted, so an old
 -- creation claim without a token may be discarded safely.
 update public.camicat_payment_attempts set state='failed',updated_at=now()
 where order_id=o.id and state='creating' and created_at<now()-interval '90 seconds';
 select * into a from public.camicat_payment_attempts where order_id=o.id and state in ('creating','pending','review','paid');
 if found then return jsonb_build_object('attempt',to_jsonb(a),'claimed',false); end if;
 insert into public.camicat_payment_attempts(order_id,mode,amount,buy_order,session_id)
 values(o.id,q.mode,q.amount,p->>'buy_order',p->>'session_id') returning * into a;
 return jsonb_build_object('attempt',to_jsonb(a),'claimed',true);
end $$;

create function public.camicat_finish_payment(p jsonb) returns text
language plpgsql security invoker set search_path='' as $$
declare
 a public.camicat_payment_attempts;
 incoming text := p->>'state';
begin
 if incoming is null or incoming not in ('paid','failed','cancelled','review') then raise exception 'camicat_invalid_payment'; end if;
 select * into a from public.camicat_payment_attempts where token=p->>'token' and mode=p->>'mode';
 if not found then raise exception 'camicat_invalid_payment'; end if;
 perform 1 from public.camicat_orders where id=a.order_id for update;
 select * into a from public.camicat_payment_attempts where id=a.id for update;
 if a.state not in ('pending','review') then return a.state; end if;
 if incoming='paid' and ((p->>'amount')::integer is distinct from a.amount
   or p->>'buy_order' is distinct from a.buy_order or p->>'session_id' is distinct from a.session_id
   or nullif(p->>'authorization_code','') is null) then incoming:='review'; end if;
 update public.camicat_payment_attempts set state=incoming,updated_at=now(),
  authorization_code=case when incoming='paid' then p->>'authorization_code' end where id=a.id;
 if incoming='paid' then
  insert into public.camicat_order_events(order_id,status,detail)
  values(a.order_id,'pago_confirmado',case when a.mode='integration' then 'Pago de prueba confirmado.' else 'Webpay confirmó el pago.' end);
 end if;
 return incoming;
end $$;

create function public.camicat_protect_payment_order() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if old.status='confirmado' and new.status='preparando'
   and exists (select 1 from public.camicat_payment_quotes where order_id=old.id and amount=old.total)
   and not exists (select 1 from public.camicat_payment_attempts where order_id=old.id and state='paid') then
  raise exception 'camicat_payment_required';
 end if;
 if not exists (select 1 from public.camicat_payment_attempts where order_id=old.id and state in ('creating','pending','review','paid')) then return new; end if;
 if new.total is distinct from old.total or new.status='cancelado' then raise exception 'camicat_payment_locked'; end if;
 if new.status is distinct from old.status and exists (
  select 1 from public.camicat_payment_attempts where order_id=old.id and state in ('creating','pending','review')
 ) then raise exception 'camicat_payment_locked'; end if;
 return new;
end $$;
create trigger camicat_protect_payment_order before update of total,status on public.camicat_orders
 for each row execute function public.camicat_protect_payment_order();

revoke all on function public.camicat_enable_payment(jsonb),public.camicat_claim_payment(jsonb),
 public.camicat_finish_payment(jsonb),public.camicat_protect_payment_order() from public,anon,authenticated;
grant execute on function public.camicat_enable_payment(jsonb),public.camicat_claim_payment(jsonb),
 public.camicat_finish_payment(jsonb),public.camicat_protect_payment_order() to service_role;
