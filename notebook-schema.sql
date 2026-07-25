-- Run this in your Supabase SQL editor to enable the Notebook file uploads.
-- Nothing here touches or drops existing tables.

-- ── student_files ────────────────────────────────────────────────────────────

create table public.student_files (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles on delete cascade not null,
  file_name text not null,
  storage_path text not null,
  uploaded_at timestamptz default now()
);

alter table public.student_files enable row level security;

create policy "Students manage own files" on public.student_files for all using (student_id = auth.uid());
create policy "Teacher reads all files" on public.student_files for select using (public.is_teacher());

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Private bucket. Files are stored under a path like {student_id}/{timestamp}-{filename}.

insert into storage.buckets (id, name, public)
values ('student-files', 'student-files', false)
on conflict (id) do nothing;

create policy "Students upload own files" on storage.objects for insert
  with check (bucket_id = 'student-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Students read own files" on storage.objects for select
  using (bucket_id = 'student-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Students delete own files" on storage.objects for delete
  using (bucket_id = 'student-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Teacher reads all student files" on storage.objects for select
  using (bucket_id = 'student-files' and public.is_teacher());

-- ── Lesson suggestions ────────────────────────────────────────────────────────
-- No new table needed: the Notebook saves these into the existing `feedback`
-- table using type = 'suggestion', the same pattern already used for 'preference'.
