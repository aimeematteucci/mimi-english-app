-- Run this in your Supabase SQL editor to enable real spaced repetition
-- (SM-2) for Vocabulary Training. Additive only, existing tables/data untouched.
-- Existing rows backfill to these defaults, so every already-assigned word
-- becomes due today the moment this runs.

alter table public.student_vocabulary
  add column if not exists repetitions integer not null default 0,
  add column if not exists ease_factor numeric not null default 2.5,
  add column if not exists interval_days integer not null default 0,
  add column if not exists next_review_date date not null default current_date,
  add column if not exists last_reviewed_at timestamptz;
