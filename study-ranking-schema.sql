-- Run this in your Supabase SQL editor
-- Tracks which calendar days each student opened their Notebook, and exposes
-- a ranking (name + day count only, no other profile data) that every
-- logged-in student can read — not just their own row.

create table public.study_days (
  student_id uuid references public.profiles on delete cascade not null,
  study_date date not null,
  primary key (student_id, study_date)
);

alter table public.study_days enable row level security;

create policy "Teacher manages study_days" on public.study_days for all using (public.is_teacher());
create policy "Students check in own days" on public.study_days for insert with check (student_id = auth.uid());
create policy "Students see own study days" on public.study_days for select using (student_id = auth.uid());

-- Views run with the owner's privileges by default (not the caller's), so
-- this can aggregate across every student's row even though the students
-- table policies above only let each student see their own study_days.
--
-- Tie-break is account age (student_since, oldest first): until real
-- study_days history builds up, everyone ties at 0 days, so this keeps the
-- ranking stable instead of reordering randomly on every load.
create view public.study_ranking as
select
  p.id as student_id,
  coalesce(p.full_name, split_part(p.email, '@', 1)) as full_name,
  count(sd.study_date) as days_studied,
  p.created_at as student_since
from public.profiles p
left join public.study_days sd on sd.student_id = p.id
where p.role = 'student'
group by p.id, p.full_name, p.email, p.created_at
order by days_studied desc, student_since asc;

grant select on public.study_ranking to authenticated;
