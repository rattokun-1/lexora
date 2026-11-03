-- Only user-owned state is stored; vocabulary, world and reward definitions stay static.
create table if not exists public.user_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check(jsonb_typeof(state) = 'object'),
 updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
revoke all on public.user_data from anon;
grant select,insert,update,delete on public.user_data to authenticated;
create policy "read own data" on public.user_data for select to authenticated using((select auth.uid())=user_id);
create policy "insert own data" on public.user_data for insert to authenticated with check((select auth.uid())=user_id);
create policy "update own data" on public.user_data for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "delete own data" on public.user_data for delete to authenticated using((select auth.uid())=user_id);
create function public.touch_user_data() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger touch_user_data before update on public.user_data for each row execute function public.touch_user_data();
