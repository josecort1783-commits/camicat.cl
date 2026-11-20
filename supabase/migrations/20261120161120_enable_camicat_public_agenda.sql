-- Public event details only. The existing Camicat member list controls writes.
create table public.camicat_agenda (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 2 and 80),
 location text not null check (char_length(btrim(location)) between 2 and 130),
 starts_on date check (starts_on between date '2020-01-01' and date '2100-12-31'),
 hours text not null default '' check (char_length(hours) <= 55),
 published boolean not null default true
);
alter table public.camicat_agenda enable row level security;
revoke all on public.camicat_agenda from public, anon, authenticated;
grant select on public.camicat_agenda to anon, authenticated;
grant insert (name, location, starts_on, hours, published), update (name, location, starts_on, hours, published) on public.camicat_agenda to authenticated;
create policy camicat_agenda_public_read on public.camicat_agenda for select to anon, authenticated
using (published and (starts_on is null or starts_on >= (now() at time zone 'America/Santiago')::date));
create policy camicat_agenda_member_read on public.camicat_agenda for select to authenticated
using ((select exists(select 1 from public.camicat_admin_members where user_id = (select auth.uid()))));
create policy camicat_agenda_member_insert on public.camicat_agenda for insert to authenticated
with check ((select exists(select 1 from public.camicat_admin_members where user_id = (select auth.uid()))));
create policy camicat_agenda_member_update on public.camicat_agenda for update to authenticated
using ((select exists(select 1 from public.camicat_admin_members where user_id = (select auth.uid()))))
with check ((select exists(select 1 from public.camicat_admin_members where user_id = (select auth.uid()))));
create index camicat_agenda_public_order on public.camicat_agenda (starts_on, name) where published;
