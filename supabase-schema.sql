-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text not null default 'student' check (role in ('teacher', 'student')),
  created_at timestamptz default now()
);

-- Classes
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  schedule text,
  description text,
  created_at timestamptz default now()
);

-- Class enrollments
create table public.class_enrollments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes on delete cascade not null,
  student_id uuid references public.profiles on delete cascade not null,
  unique (class_id, student_id)
);

-- Assignments
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  due_date date,
  class_id uuid references public.classes on delete set null,
  created_at timestamptz default now()
);

-- Student assignments (join table with grade/feedback/status)
create table public.student_assignments (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments on delete cascade not null,
  student_id uuid references public.profiles on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'completed')),
  grade text,
  feedback text,
  unique (assignment_id, student_id)
);

-- Vocabulary
create table public.vocabulary (
  id uuid default gen_random_uuid() primary key,
  word text not null,
  definition text not null,
  example text,
  level text,
  created_at timestamptz default now()
);

-- Student vocabulary (join table with status)
create table public.student_vocabulary (
  id uuid default gen_random_uuid() primary key,
  vocabulary_id uuid references public.vocabulary on delete cascade not null,
  student_id uuid references public.profiles on delete cascade not null,
  status text default 'new' check (status in ('new', 'learning', 'mastered')),
  unique (vocabulary_id, student_id)
);

-- Feedback
create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.student_assignments enable row level security;
alter table public.vocabulary enable row level security;
alter table public.student_vocabulary enable row level security;
alter table public.feedback enable row level security;

-- Helper: is teacher
create or replace function public.is_teacher()
returns boolean language sql security definer as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') $$;

-- Profiles: users see their own; teacher sees all
create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_teacher());
create policy "Users update own profile" on public.profiles for update using (id = auth.uid());
create policy "Insert own profile" on public.profiles for insert with check (id = auth.uid());

-- Classes: everyone reads; only teacher writes
create policy "Anyone reads classes" on public.classes for select using (true);
create policy "Teacher manages classes" on public.classes for all using (public.is_teacher());

-- Enrollments: teacher manages; students see their own
create policy "Teacher manages enrollments" on public.class_enrollments for all using (public.is_teacher());
create policy "Students see own enrollments" on public.class_enrollments for select using (student_id = auth.uid());

-- Assignments: teacher manages; students see assigned
create policy "Teacher manages assignments" on public.assignments for all using (public.is_teacher());
create policy "Students see assignments" on public.assignments for select using (
  exists (select 1 from public.student_assignments where assignment_id = id and student_id = auth.uid())
);

-- Student assignments: teacher manages; students see/update own
create policy "Teacher manages student_assignments" on public.student_assignments for all using (public.is_teacher());
create policy "Students see own" on public.student_assignments for select using (student_id = auth.uid());
create policy "Students update own" on public.student_assignments for update using (student_id = auth.uid());

-- Vocabulary: teacher manages; students see assigned
create policy "Teacher manages vocabulary" on public.vocabulary for all using (public.is_teacher());
create policy "Students see vocabulary" on public.vocabulary for select using (
  exists (select 1 from public.student_vocabulary where vocabulary_id = id and student_id = auth.uid())
);

-- Student vocabulary: teacher manages; students see/update own
create policy "Teacher manages student_vocab" on public.student_vocabulary for all using (public.is_teacher());
create policy "Students see own vocab" on public.student_vocabulary for select using (student_id = auth.uid());
create policy "Students update own vocab" on public.student_vocabulary for update using (student_id = auth.uid());

-- Feedback: teacher manages; students see their own
create policy "Teacher manages feedback" on public.feedback for all using (public.is_teacher());
create policy "Students see own feedback" on public.feedback for select using (student_id = auth.uid());

-- ── Auto-create profile on signup ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Create teacher account (run AFTER creating auth user) ─────────────────────
-- After signing up with aimee.o.souza@gmail.com, run this:
-- update public.profiles set role = 'teacher' where email = 'aimee.o.souza@gmail.com';
