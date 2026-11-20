-- Private transactional outbox. Only the Edge Function's service role can use it.
create table public.camicat_order_notifications (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.camicat_orders(id) on delete cascade,
 event_key text not null,
 kind text not null check (kind in ('customer_receipt','owner_request','customer_update','owner_paid','customer_paid')),
 snapshot jsonb not null,
 tracking_token text,
 message jsonb,
 state text not null default 'pending' check (state in ('pending','sending','sent','failed','review')),
 attempts integer not null default 0,
 lease_id uuid,
 lease_until timestamptz,
 first_attempt_at timestamptz,
 retry_after timestamptz not null default now(),
 sent_at timestamptz,
 created_at timestamptz not null default now(),
 unique(order_id,event_key,kind)
);
alter table public.camicat_order_notifications enable row level security;
revoke all on public.camicat_order_notifications from public, anon, authenticated;
grant select,insert,update on public.camicat_order_notifications to service_role;
create index camicat_notifications_due on public.camicat_order_notifications(order_id,retry_after) where state in ('pending','failed','sending');

create function public.camicat_notify_order_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.camicat_orders; verified boolean := false;
begin
 select * into o from public.camicat_orders where id=new.order_id;
 if new.status='recibido' then
  insert into public.camicat_order_notifications(order_id,event_key,kind,snapshot) values(o.id,new.id::text,'owner_request',to_jsonb(o));
 elsif new.status in ('cotizado','confirmado','preparando','listo','enviado','entregado','cancelado') then
  insert into public.camicat_order_notifications(order_id,event_key,kind,snapshot) values(o.id,new.id::text,'customer_update',to_jsonb(o)||jsonb_build_object('status',new.status,'next_step',new.detail));
 elsif new.status='pago_confirmado' and to_regclass('public.camicat_payment_attempts') is not null then
  -- Compatible with the future Webpay integration; test payments never notify as real sales.
  execute 'select exists(select 1 from public.camicat_payment_attempts where order_id=$1 and state=''paid'' and mode=''production'')' into verified using o.id;
  if verified then
   insert into public.camicat_order_notifications(order_id,event_key,kind,snapshot)
    select o.id,new.id::text,k,to_jsonb(o) from unnest(array['owner_paid','customer_paid']) k;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.camicat_notify_order_event() from public,anon,authenticated;
create trigger camicat_order_email_event after insert on public.camicat_order_events for each row execute function public.camicat_notify_order_event();

create function public.camicat_queue_receipt(p jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.camicat_orders;
begin
 select * into o from public.camicat_orders where id=(p->>'id')::uuid;
 if o.id is null or p->>'token' is null or encode(extensions.digest(p->>'token','sha256'),'hex')<>o.token_hash then raise exception 'camicat_order_missing'; end if;
 insert into public.camicat_order_notifications(order_id,event_key,kind,snapshot,tracking_token)
 values(o.id,'receipt','customer_receipt',to_jsonb(o),p->>'token') on conflict do nothing;
end $$;
revoke all on function public.camicat_queue_receipt(jsonb) from public,anon,authenticated;
grant execute on function public.camicat_queue_receipt(jsonb) to service_role;

create function public.camicat_claim_notifications(p jsonb) returns setof public.camicat_order_notifications language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- After the provider's 24-hour deduplication window, ambiguous attempts need review.
 update public.camicat_order_notifications set state='review',lease_id=null,lease_until=null
 where order_id=(p->>'id')::uuid and state in ('failed','sending') and first_attempt_at < now()-interval '23 hours';
 return query
 with due as (
  select id from public.camicat_order_notifications where order_id=(p->>'id')::uuid
   and ((state in ('pending','failed') and retry_after<=now()) or (state='sending' and lease_until<now()))
  order by created_at,id limit 6 for update skip locked
 )
 update public.camicat_order_notifications n set state='sending',attempts=n.attempts+1,
 lease_id=gen_random_uuid(),lease_until=now()+interval '90 seconds',first_attempt_at=coalesce(n.first_attempt_at,now())
 from due where n.id=due.id returning n.*;
end $$;
revoke all on function public.camicat_claim_notifications(jsonb) from public,anon,authenticated;
grant execute on function public.camicat_claim_notifications(jsonb) to service_role;
