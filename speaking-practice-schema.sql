-- Run this in your Supabase SQL editor to enable the Speaking Practice block:
-- students record/upload audio, an AI agent (Groq Whisper + Claude) transcribes
-- and scores it, and Aimee reviews/approves before the student sees "Feedback
-- pela Aimee" instead of "Feedback by AI".
-- Nothing here touches or drops existing tables.

-- ── audio_submissions ──────────────────────────────────────────────────────────

create table public.audio_submissions (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles on delete cascade not null,
  storage_path text not null,
  topic text,

  status text not null default 'processing' check (status in ('processing', 'done', 'error')),
  error_message text,

  transcript text,
  ai_feedback jsonb,
  ai_score numeric(3,1),

  reviewed_by_teacher boolean not null default false,
  teacher_feedback text,
  teacher_score numeric(3,1),
  reviewed_at timestamptz,

  created_at timestamptz default now()
);

alter table public.audio_submissions enable row level security;

-- Deliberately NOT "for all": students get insert/select/delete on their own rows,
-- but no update policy, so they can't rewrite ai_score/teacher_score/reviewed_by_teacher
-- from the browser. The Netlify function writes transcript/ai_* via the service role
-- key (which bypasses RLS); the teacher's "for all" policy below covers her edits.
create policy "Students insert own submissions" on public.audio_submissions for insert
  with check (student_id = auth.uid());

create policy "Students read own submissions" on public.audio_submissions for select
  using (student_id = auth.uid());

create policy "Students delete own submissions" on public.audio_submissions for delete
  using (student_id = auth.uid());

create policy "Teacher manages all submissions" on public.audio_submissions for all
  using (public.is_teacher());

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Private bucket. Files are stored under a path like {student_id}/{timestamp}.webm

insert into storage.buckets (id, name, public)
values ('speaking-audio', 'speaking-audio', false)
on conflict (id) do nothing;

create policy "Students upload own speaking audio" on storage.objects for insert
  with check (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Students read own speaking audio" on storage.objects for select
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Students delete own speaking audio" on storage.objects for delete
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Teacher reads all speaking audio" on storage.objects for select
  using (bucket_id = 'speaking-audio' and public.is_teacher());

create policy "Teacher deletes all speaking audio" on storage.objects for delete
  using (bucket_id = 'speaking-audio' and public.is_teacher());
