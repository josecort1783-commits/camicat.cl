-- Recipient addresses and the audit permission are private server configuration.
create table public.camicat_order_staff_policy (
 email text primary key check(email=lower(email)),
 can_read_audit boolean not null default false,
 notify_orders boolean not null default true
);
alter table public.camicat_order_staff_policy enable row level security;
revoke all on public.camicat_order_staff_policy from public,anon,authenticated;
grant select on public.camicat_order_staff_policy to service_role;
