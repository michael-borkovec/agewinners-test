/*
 * File purpose
 * - Store small runtime-config values controlled from admin UI
 * - Seed current default reveal delay for post de-anonymization
 * - Allow public read of safe values, admin-only writes through server routes
 */

begin;

create table if not exists public.app_runtime_settings (
  setting_key text primary key,
  int_value integer null,
  text_value text null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

create or replace function public.app_runtime_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_runtime_settings_set_updated_at on public.app_runtime_settings;
create trigger app_runtime_settings_set_updated_at
before update on public.app_runtime_settings
for each row
execute function public.app_runtime_settings_set_updated_at();

alter table public.app_runtime_settings enable row level security;

drop policy if exists "app_runtime_settings_select_public" on public.app_runtime_settings;
create policy "app_runtime_settings_select_public"
  on public.app_runtime_settings
  for select
  using (true);

insert into public.app_runtime_settings (setting_key, int_value)
values ('post_reveal_delay_days', 10)
on conflict (setting_key) do update
set int_value = excluded.int_value;

commit;
