-- Run this in your Supabase SQL editor
-- Stores the results of the public placement test (/teste). Anyone can
-- submit (the test needs no login, so it can be shared on Instagram), but
-- only the teacher can read the leads.

create table public.placement_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  email text,
  level text not null,
  score int not null,
  total int not null,
  answers jsonb,
  source text,
  created_at timestamptz not null default now()
);

alter table public.placement_leads enable row level security;

create policy "Anyone submits a placement result" on public.placement_leads
  for insert to anon, authenticated with check (true);
create policy "Teacher reads placement leads" on public.placement_leads
  for select using (public.is_teacher());
create policy "Teacher deletes placement leads" on public.placement_leads
  for delete using (public.is_teacher());
