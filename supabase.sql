-- BudgetWise: run once in Supabase › SQL Editor.
-- One row per account holding that person's whole budget.
-- Row Level Security means each signed-in person can only read and change their own row.

create table if not exists public.budgets (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;

drop policy if exists "read own budget"   on public.budgets;
drop policy if exists "add own budget"    on public.budgets;
drop policy if exists "change own budget" on public.budgets;
drop policy if exists "delete own budget" on public.budgets;

create policy "read own budget"   on public.budgets for select using (auth.uid() = user_id);
create policy "add own budget"    on public.budgets for insert with check (auth.uid() = user_id);
create policy "change own budget" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own budget" on public.budgets for delete using (auth.uid() = user_id);

-- Signed-out visitors get nothing.
revoke all on public.budgets from anon;
grant select, insert, update, delete on public.budgets to authenticated;
