-- Run this in your Supabase SQL editor to enable the "Fill in the Blank"
-- vocabulary exercise. Additive only, existing tables/data untouched.

-- Teacher-authored cloze sentence per word, using the literal token {blank}
-- where the word should go, e.g. "He {blank} every day." for the word "run".
alter table public.vocabulary
  add column if not exists cloze_sentence text;

-- Manual per-student on/off switch, set by the teacher in the dashboard.
alter table public.profiles
  add column if not exists fill_blank_enabled boolean not null default false;
