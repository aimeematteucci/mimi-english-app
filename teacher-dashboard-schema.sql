-- Run this in your Supabase SQL editor to let the teacher dashboard delete
-- inappropriate student uploads. Everything else the dashboard needs
-- (writing lessons/feedback, updating profiles.join_link) already works.

create policy "Teacher deletes student files" on public.student_files for delete
  using (public.is_teacher());

create policy "Teacher deletes student file objects" on storage.objects for delete
  using (bucket_id = 'student-files' and public.is_teacher());
