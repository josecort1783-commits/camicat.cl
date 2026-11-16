create table public.camicat_orders (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 public_number text not null unique default ('CAM-' || upper(encode(extensions.gen_random_bytes(8),'hex'))),
 token_hash text not null unique,
 rate_key text not null,
 kind text not null check (kind in ('catalogo','personalizada')),
 status text not null default 'recibido' check (status in ('recibido','cotizado','confirmado','preparando','listo','enviado','entregado','cancelado')),
 customer_name text not null check (length(customer_name) between 2 and 80),
 customer_email text not null check (length(customer_email) between 5 and 160),
 delivery text not null check (delivery in ('retiro','envio','por_definir')),
 commune text not null default '',
 region text not null default '',
 items jsonb not null default '[]',
 note text not null default '',
 estimate integer,
 total integer check (total >= 0),
 next_step text not null default '',
 tracking text not null default '',
 mail_status text not null default 'pending',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index camicat_orders_created_idx on public.camicat_orders(created_at desc);
create index camicat_orders_email_idx on public.camicat_orders(customer_email,created_at desc);
create index camicat_orders_rate_idx on public.camicat_orders(rate_key,created_at desc);
alter table public.camicat_orders enable row level security;
revoke all on public.camicat_orders from public,anon,authenticated;
grant select,insert,update on public.camicat_orders to service_role;

create table public.camicat_order_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.camicat_orders(id),
 status text not null,
 detail text not null default '',
 created_at timestamptz not null default now()
);
create index camicat_order_events_order_idx on public.camicat_order_events(order_id,created_at);
alter table public.camicat_order_events enable row level security;
revoke all on public.camicat_order_events from public,anon,authenticated;
grant select,insert on public.camicat_order_events to service_role;

create table public.camicat_audit (
 id uuid primary key default gen_random_uuid(),
 occurred_at timestamptz not null default now(),
 actor_id uuid,
 actor_label text not null,
 action text not null,
 subject text not null,
 detail jsonb not null default '{}'
);
create index camicat_audit_recent_idx on public.camicat_audit(occurred_at desc);
alter table public.camicat_audit enable row level security;
revoke all on public.camicat_audit from public,anon,authenticated;
grant select on public.camicat_audit to service_role;

create function public.camicat_receive_request(p jsonb) returns public.camicat_orders
 language plpgsql security invoker set search_path='' as $$
declare
 result public.camicat_orders;
 catalog jsonb;
 line jsonb;
 product jsonb;
 snapshot jsonb := '[]';
 qty integer;
 amount bigint := 0;
begin
 perform pg_advisory_xact_lock(81927365);
 select * into result from public.camicat_orders where request_id=(p->>'request_id')::uuid and token_hash=p->>'token_hash';
 if found then return result; end if;
 if (select count(*) from public.camicat_orders where created_at > now()-interval '1 hour')>=80
 or (select count(*) from public.camicat_orders where customer_email=p->>'email' and created_at>now()-interval '1 hour')>=3
 or (select count(*) from public.camicat_orders where rate_key=p->>'rate_key' and created_at>now()-interval '1 hour')>=12 then
   raise exception 'camicat_rate_limit';
 end if;
 if p->>'kind'='catalogo' then
  select products into catalog from public.camicat_public_catalog where id='main';
  for line in select value from jsonb_array_elements(p->'items') loop
   qty := (line->>'quantity')::int;
   select value into product from jsonb_array_elements(catalog) where value->>'id'=line->>'id' and value->'available'='true'::jsonb limit 1;
   if product is null or qty not between 1 and 20 then raise exception 'camicat_unavailable'; end if;
   amount := amount + (product->>'price')::bigint * qty;
   snapshot := snapshot || jsonb_build_array(jsonb_build_object('name',product->>'name','quantity',qty,'price',(product->>'price')::int));
  end loop;
  if jsonb_array_length(snapshot)<1 or amount>2147483647 then raise exception 'camicat_invalid_items'; end if;
 end if;
 insert into public.camicat_orders(request_id,token_hash,rate_key,kind,customer_name,customer_email,delivery,commune,region,items,note,estimate)
 values ((p->>'request_id')::uuid,p->>'token_hash',p->>'rate_key',p->>'kind',p->>'name',p->>'email',p->>'delivery',p->>'commune',p->>'region',snapshot,p->>'note',case when p->>'kind'='catalogo' then amount::integer end)
 returning * into result;
 insert into public.camicat_order_events(order_id,status) values(result.id,'recibido');
 return result;
end $$;
revoke all on function public.camicat_receive_request(jsonb) from public,anon,authenticated;
grant execute on function public.camicat_receive_request(jsonb) to service_role;

create function public.camicat_move_request(p jsonb) returns public.camicat_orders
 language plpgsql security definer set search_path='' as $$
declare
 result public.camicat_orders;
 actor uuid := (p->>'actor')::uuid;
 actor_name text;
 next_status text := p->>'status';
 step text := trim(coalesce(p->>'detail',''));
 reference text := trim(coalesce(p->>'tracking',''));
 amount integer := (p->>'total')::integer;
 previous text;
begin
 select panel_label into actor_name from public.camicat_admin_members where user_id=actor;
 if actor_name is null then raise exception 'camicat_forbidden'; end if;
 select * into result from public.camicat_orders where id=(p->>'id')::uuid for update;
 if not found then raise exception 'camicat_order_missing'; end if;
 previous := result.status;
 if not (case previous
 when 'recibido' then next_status in ('cotizado','confirmado','cancelado')
 when 'cotizado' then next_status in ('confirmado','cancelado')
 when 'confirmado' then next_status in ('preparando','cancelado')
 when 'preparando' then next_status in ('listo','enviado','cancelado')
 when 'listo' then next_status in ('entregado','enviado','cancelado')
 when 'enviado' then next_status='entregado'
 else false end) then raise exception 'camicat_invalid_transition'; end if;
 if next_status in ('cotizado','confirmado') and (coalesce(amount,result.total) is null or length(step)<5) then raise exception 'camicat_need_total'; end if;
 if next_status='listo' and length(step)<5 then raise exception 'camicat_need_pickup'; end if;
 if next_status='enviado' and (length(reference)<3 or length(step)<3) then raise exception 'camicat_need_tracking'; end if;
 update public.camicat_orders set status=next_status,total=case when next_status in ('cotizado','confirmado') then coalesce(amount,result.total) else result.total end,
 next_step=step,tracking=case when next_status='enviado' then reference else result.tracking end,updated_at=now()
 where id=result.id returning * into result;
 insert into public.camicat_order_events(order_id,status,detail) values(result.id,next_status,step);
 insert into public.camicat_audit(actor_id,actor_label,action,subject,detail)
 values(actor,actor_name,'pedido_estado',result.public_number,jsonb_build_object('anterior',previous,'nuevo',next_status));
 return result;
end $$;
revoke all on function public.camicat_move_request(jsonb) from public,anon,authenticated;
grant execute on function public.camicat_move_request(jsonb) to service_role;

create function camicat_private.audit_catalog_revision() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 insert into public.camicat_audit(actor_id, actor_label,action,subject,detail)
 values (auth.uid(),coalesce((select panel_label from public.camicat_admin_members where user_id=auth.uid()),'Sistema'),
 'catalogo_publicado','Catálogo',jsonb_build_object('anterior',old.revision,'nueva',new.revision,
 'productos_antes',jsonb_array_length(old.products),'productos_despues',jsonb_array_length(new.products)));
 return null;
end $$;
revoke all on function camicat_private.audit_catalog_revision() from public,anon,authenticated;
create trigger camicat_log_catalog after update of products on public.camicat_catalog
 for each row execute function camicat_private.audit_catalog_revision();
