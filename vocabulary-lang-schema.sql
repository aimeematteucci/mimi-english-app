-- Run this in your Supabase SQL editor
-- Adds a per-word language so the pronunciation button reads each word
-- in the right voice (e.g. pt-BR for Sophie's Portuguese words, en-US for
-- everyone else's English words).

alter table public.vocabulary
  add column if not exists lang text not null default 'en-US';
