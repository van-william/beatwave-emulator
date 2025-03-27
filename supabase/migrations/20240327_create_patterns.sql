-- Create patterns table
create table public.patterns (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  name text not null,
  bpm integer not null,
  steps jsonb not null,
  is_public boolean default false
);

-- Set up RLS (Row Level Security)
alter table public.patterns enable row level security;

-- Create policies
create policy "Users can view their own patterns"
  on patterns for select
  using (auth.uid() = user_id);

create policy "Users can view public patterns"
  on patterns for select
  using (is_public = true);

create policy "Users can insert their own patterns"
  on patterns for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own patterns"
  on patterns for update
  using (auth.uid() = user_id);

create policy "Users can delete their own patterns"
  on patterns for delete
  using (auth.uid() = user_id); 