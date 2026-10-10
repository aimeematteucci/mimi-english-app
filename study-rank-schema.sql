-- Run this in your Supabase SQL editor
-- Private monthly ranking: each student sees only their own position
-- ("You're #3 of 10 students this month"), never who is ahead of them.
--
-- A study day = a São Paulo calendar day with real activity:
--   * reviewed a vocabulary flashcard (student_vocabulary.last_reviewed_at)
--   * sent a speaking recording (audio_submissions insert)
--   * marked an assigned activity as completed (student_lessons)
--   * attended a booked class (bookings, computed — not logged)
-- Days are logged by triggers, not by the browser, so students can't fake
-- them. This replaces study_days (which counted just opening the Notebook);
-- that table is left untouched but no longer used.

create table public.activity_days (
  student_id uuid references public.profiles on delete cascade not null,
  activity_date date not null,
  primary key (student_id, activity_date)
);

alter table public.activity_days enable row level security;
create policy "Teacher manages activity_days" on public.activity_days for all using (public.is_teacher());
create policy "Students see own activity days" on public.activity_days for select using (student_id = auth.uid());

create or replace function public.log_activity_day()
returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  insert into public.activity_days (student_id, activity_date)
  values (new.student_id, (now() at time zone 'America/Sao_Paulo')::date)
  on conflict do nothing;
  return new;
end
$$;

revoke execute on function public.log_activity_day() from public, anon, authenticated;

create trigger log_vocab_review_day
  after update of last_reviewed_at on public.student_vocabulary
  for each row when (new.last_reviewed_at is distinct from old.last_reviewed_at)
  execute function public.log_activity_day();

create trigger log_speaking_day
  after insert on public.audio_submissions
  for each row execute function public.log_activity_day();

create trigger log_lesson_completed_day
  after update of status on public.student_lessons
  for each row when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.log_activity_day();

-- Backfill: recover activity days already recorded elsewhere
insert into public.activity_days (student_id, activity_date)
select student_id, (ts at time zone 'America/Sao_Paulo')::date
from (
  select student_id, last_reviewed_at as ts from public.student_vocabulary where last_reviewed_at is not null
  union all
  select student_id, created_at from public.audio_submissions where created_at is not null
  union all
  select student_id, completed_at from public.student_lessons where status = 'completed' and completed_at is not null
) x
on conflict do nothing;

-- ── The caller's position this month ──
-- Ties share a position (two students with 5 days are both #2).
-- security definer so it can compare against everyone, but it only ever
-- returns the caller's own position and the number of students.
create or replace function public.my_study_rank()
returns table (study_position int, total_students int, days_studied int)
language sql stable security definer set search_path = public as
$$
  with bounds as (
    select date_trunc('month', (now() at time zone 'America/Sao_Paulo')::date)::date as month_start
  ),
  days as (
    select a.student_id, a.activity_date as d
    from public.activity_days a, bounds
    where a.activity_date >= bounds.month_start
    union
    select b.student_id, (b.starts_at at time zone 'America/Sao_Paulo')::date
    from public.bookings b, bounds
    where b.status = 'booked' and b.ends_at <= now()
      and (b.starts_at at time zone 'America/Sao_Paulo')::date >= bounds.month_start
  ),
  ranked as (
    select p.id,
           count(days.d)::int as n,
           rank() over (order by count(days.d) desc)::int as pos,
           count(*) over ()::int as total
    from public.profiles p
    left join days on days.student_id = p.id
    where p.role = 'student'
    group by p.id
  )
  select pos, total, n from ranked where id = auth.uid()
$$;

revoke execute on function public.my_study_rank() from public, anon;
grant execute on function public.my_study_rank() to authenticated;

-- The old top-5 view showed everyone's names; students shouldn't see it anymore.
revoke select on public.study_ranking from anon, authenticated;
