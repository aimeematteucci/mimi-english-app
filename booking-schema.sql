-- Run this in your Supabase SQL editor
-- Class credits + self-service booking.
--
-- How it works:
--   * credit_grants is a ledger: each row gives a student N credits that can
--     be spent on classes starting inside [valid_from, expires_at).
--     Monthly-plan credits are valid for that calendar month only; credit
--     packs you sell have no expiry (expires_at null).
--   * Classes are small groups: each availability window has a capacity
--     (default 5). A slot stays open until that many students book it.
--   * A booking spends 1 credit from the grant that expires soonest.
--     Bookings with status 'booked' or 'late_cancelled' count as spent;
--     'cancelled' (12h+ notice, or cancelled by the teacher) gives it back.
--   * Students never write these tables directly — they go through the
--     book_class / cancel_booking functions, which enforce the rules.
--   * Times are defined in the teacher's timezone (America/Sao_Paulo) and
--     stored as timestamptz, so students abroad see their own local time.

-- ── Monthly plans (teacher-only; NOT on profiles, which students can edit) ──
create table public.credit_plans (
  student_id uuid primary key references public.profiles on delete cascade,
  monthly_credits int not null check (monthly_credits > 0)
);

alter table public.credit_plans enable row level security;
create policy "Teacher manages credit_plans" on public.credit_plans for all using (public.is_teacher());
create policy "Students see own plan" on public.credit_plans for select using (student_id = auth.uid());

-- ── Credit ledger ──
create table public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade not null,
  amount int not null check (amount > 0),
  reason text not null check (reason in ('monthly', 'purchase', 'gift')),
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  -- 'YYYY-MM' for monthly grants, so the monthly job can't double-grant
  plan_month text,
  note text,
  created_at timestamptz not null default now()
);

create unique index credit_grants_one_monthly_per_month
  on public.credit_grants (student_id, plan_month) where reason = 'monthly';

alter table public.credit_grants enable row level security;
create policy "Teacher manages credit_grants" on public.credit_grants for all using (public.is_teacher());
create policy "Students see own grants" on public.credit_grants for select using (student_id = auth.uid());

-- ── Weekly availability (in America/Sao_Paulo wall-clock time) ──
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  slot_minutes int not null default 60 check (slot_minutes between 15 and 180),
  capacity int not null default 5 check (capacity between 1 and 20), -- students per class
  check (end_time > start_time)
);

alter table public.availability enable row level security;
create policy "Teacher manages availability" on public.availability for all using (public.is_teacher());

-- ── Time off (vacations, holidays) — no slots offered inside these ranges ──
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null, -- inclusive
  note text,
  check (ends_on >= starts_on)
);

alter table public.time_off enable row level security;
create policy "Teacher manages time_off" on public.time_off for all using (public.is_teacher());

-- ── Bookings ──
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles on delete cascade not null,
  grant_id uuid references public.credit_grants on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'late_cancelled')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

-- A student can hold at most one seat in a given class
create unique index bookings_one_seat_per_student on public.bookings (student_id, starts_at) where status = 'booked';
create index bookings_starts_at_idx on public.bookings (starts_at) where status = 'booked';
create index bookings_grant_idx on public.bookings (grant_id);

alter table public.bookings enable row level security;
create policy "Teacher manages bookings" on public.bookings for all using (public.is_teacher());
create policy "Students see own bookings" on public.bookings for select using (student_id = auth.uid());

-- ── Remaining credits per grant (security_invoker → RLS still applies) ──
create view public.credit_grant_balances with (security_invoker = true) as
select
  g.*,
  count(b.id) filter (where b.status in ('booked', 'late_cancelled'))::int as used,
  g.amount - count(b.id) filter (where b.status in ('booked', 'late_cancelled'))::int as remaining
from public.credit_grants g
left join public.bookings b on b.grant_id = g.id
group by g.id;

grant select on public.credit_grant_balances to authenticated;

-- ── Open classes between two dates (São Paulo calendar days, inclusive) ──
-- Leaves out full classes and ones the caller already booked.
-- security definer so students can see how many seats are taken without
-- seeing who took them.
create or replace function public.available_slots(p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz, capacity int, spots_left int)
language sql stable security definer set search_path = public as
$$
  select s.starts_at, s.starts_at + make_interval(mins => a.slot_minutes), a.capacity, a.capacity - taken.n
  from generate_series(p_from::timestamp, least(p_to, p_from + 62)::timestamp, interval '1 day') d(day)
  join public.availability a on a.weekday = extract(dow from d.day)
  cross join lateral generate_series(
    (d.day::date + a.start_time) at time zone 'America/Sao_Paulo',
    (d.day::date + a.end_time) at time zone 'America/Sao_Paulo' - make_interval(mins => a.slot_minutes),
    make_interval(mins => a.slot_minutes)
  ) s(starts_at)
  cross join lateral (
    select count(*)::int as n from public.bookings b where b.status = 'booked' and b.starts_at = s.starts_at
  ) taken
  where s.starts_at >= now() + interval '12 hours'
    and taken.n < a.capacity
    and not exists (select 1 from public.time_off t where d.day::date between t.starts_on and t.ends_on)
    and not exists (
      select 1 from public.bookings b
      where b.status = 'booked' and b.starts_at = s.starts_at and b.student_id = auth.uid()
    )
  order by 1
$$;

revoke execute on function public.available_slots(date, date) from public, anon;
grant execute on function public.available_slots(date, date) to authenticated;

-- ── Book a class (student) ──
create or replace function public.book_class(p_starts_at timestamptz)
returns public.bookings
language plpgsql security definer set search_path = public as
$$
declare
  v_slot record;
  v_grant uuid;
  v_booking public.bookings;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  -- Serialize this student's bookings so two clicks can't spend one credit twice,
  -- and serialize bookings for this class so the last seat can't be sold twice
  perform 1 from public.profiles where id = auth.uid() for update;
  perform pg_advisory_xact_lock(hashtext('class:' || p_starts_at::text));

  select * into v_slot from public.available_slots(
    (p_starts_at at time zone 'America/Sao_Paulo')::date,
    (p_starts_at at time zone 'America/Sao_Paulo')::date
  ) s where s.starts_at = p_starts_at;
  if not found then raise exception 'That class is full or no longer available'; end if;

  select g.id into v_grant
  from public.credit_grant_balances g
  where g.student_id = auth.uid()
    and g.remaining > 0
    and p_starts_at >= g.valid_from
    and (g.expires_at is null or p_starts_at < g.expires_at)
  order by g.expires_at asc nulls last, g.created_at asc
  limit 1;
  if v_grant is null then raise exception 'You have no credits valid for that date'; end if;

  insert into public.bookings (student_id, grant_id, starts_at, ends_at)
  values (auth.uid(), v_grant, v_slot.starts_at, v_slot.ends_at)
  returning * into v_booking;
  return v_booking;
exception when unique_violation then
  raise exception 'You are already booked in that class';
end
$$;

revoke execute on function public.book_class(timestamptz) from public, anon;
grant execute on function public.book_class(timestamptz) to authenticated;

-- ── Cancel a class ──
-- Student, 12h+ before → credit returned. Student, later → late_cancelled
-- (credit kept by the teacher). Teacher → always returned.
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as
$$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or (v_booking.student_id <> auth.uid() and not public.is_teacher()) then
    raise exception 'Booking not found';
  end if;
  if v_booking.status <> 'booked' then raise exception 'This class is already cancelled'; end if;

  update public.bookings
  set status = case
        when public.is_teacher() or v_booking.starts_at - now() >= interval '12 hours' then 'cancelled'
        else 'late_cancelled'
      end,
      cancelled_at = now()
  where id = p_booking_id
  returning * into v_booking;
  return v_booking;
end
$$;

revoke execute on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- ── Give this month's plan credits to everyone on a monthly plan ──
-- Safe to run more than once: each student gets at most one monthly grant
-- per month. Returns how many students received credits.
create or replace function public.grant_monthly_credits(p_month date default null)
returns int
language plpgsql security definer set search_path = public as
$$
declare
  v_month_start date := date_trunc('month', coalesce(p_month, (now() at time zone 'America/Sao_Paulo')::date))::date;
  v_count int;
begin
  -- Callable by the teacher from the app, or by pg_cron (no auth.uid())
  if auth.uid() is not null and not public.is_teacher() then raise exception 'Teacher only'; end if;

  insert into public.credit_grants (student_id, amount, reason, valid_from, expires_at, plan_month)
  select p.student_id, p.monthly_credits, 'monthly',
         v_month_start::timestamp at time zone 'America/Sao_Paulo',
         (v_month_start + interval '1 month')::timestamp at time zone 'America/Sao_Paulo',
         to_char(v_month_start, 'YYYY-MM')
  from public.credit_plans p
  on conflict (student_id, plan_month) where reason = 'monthly' do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke execute on function public.grant_monthly_credits(date) from public, anon;
grant execute on function public.grant_monthly_credits(date) to authenticated;

-- ── OPTIONAL: grant monthly credits automatically on the 1st ──
-- Enable the pg_cron extension first (Database → Extensions → pg_cron),
-- then run this once. 03:05 UTC = 00:05 in São Paulo.
--
-- select cron.schedule('grant-monthly-credits', '5 3 1 * *', $$select public.grant_monthly_credits()$$);
