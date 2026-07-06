-- SQL MIGRATION FOR FLOWTIME
-- Run this in your Supabase SQL Editor to set up tables and RLS policies.

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  notes text,
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  estimated_duration integer not null, -- in minutes
  actual_duration integer default 0, -- in seconds
  planned_start timestamp with time zone,
  planned_end timestamp with time zone,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  tags text[] default '{}',
  status text check (status in ('not_started', 'running', 'paused', 'completed', 'skipped', 'cancelled')) default 'not_started',
  fixed_time boolean default false,
  color text default '#3b82f6',
  icon text default 'CheckSquare',
  sort_order integer default 0,
  date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for tasks
alter table public.tasks enable row level security;

create policy "Users can manage their own tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

-- Create task sessions table
create table if not exists public.task_sessions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  session_type text check (session_type in ('focus', 'break')) not null
);

-- Enable RLS for task sessions
alter table public.task_sessions enable row level security;

create policy "Users can manage sessions for their tasks"
  on public.task_sessions for all
  using (
    exists (
      select 1 from public.tasks
      where public.tasks.id = public.task_sessions.task_id
      and public.tasks.user_id = auth.uid()
    )
  );

-- Create settings table
create table if not exists public.settings (
  user_id uuid references auth.users on delete cascade primary key,
  theme text check (theme in ('light', 'dark', 'system')) default 'dark',
  notifications_enabled boolean default true,
  pomodoro_focus_duration integer default 25,
  pomodoro_short_break integer default 5,
  pomodoro_long_break integer default 15,
  pomodoro_long_break_interval integer default 4,
  work_start_time text default '09:00',
  work_end_time text default '22:00',
  default_task_duration integer default 30,
  calendar_sync_enabled boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for settings
alter table public.settings enable row level security;

create policy "Users can manage their own settings"
  on public.settings for all
  using (auth.uid() = user_id);

-- Create templates table
create table if not exists public.templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for templates
alter table public.templates enable row level security;

create policy "Users can manage their own templates"
  on public.templates for all
  using (auth.uid() = user_id);

-- Create template tasks table
create table if not exists public.template_tasks (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references public.templates on delete cascade not null,
  title text not null,
  description text,
  priority text default 'medium',
  estimated_duration integer not null,
  fixed_time boolean default false,
  planned_start_time text,
  color text default '#3b82f6',
  icon text default 'CheckSquare',
  sort_order integer default 0
);

-- Enable RLS for template tasks
alter table public.template_tasks enable row level security;

create policy "Users can manage template tasks for their templates"
  on public.template_tasks for all
  using (
    exists (
      select 1 from public.templates
      where public.templates.id = public.template_tasks.template_id
      and public.templates.user_id = auth.uid()
    )
  );

-- Trigger to automatically create a user profile and settings entry on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    now()
  );

  insert into public.settings (user_id, theme, notifications_enabled, updated_at)
  values (
    new.id,
    'dark',
    true,
    now()
  );

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
