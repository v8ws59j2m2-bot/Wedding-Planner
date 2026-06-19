-- ─────────────────────────────────────────────────────────────────────────────
-- Jamie & Beth Wedding Planner — Supabase schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- Single row of app data stored as JSONB per authenticated user
-- This mirrors the current localStorage structure exactly.

create table if not exists app_data (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null unique,
  guests      jsonb not null default '[]'::jsonb,
  budget      jsonb not null default '[]'::jsonb,
  checklist   jsonb not null default '[]'::jsonb,
  vendors     jsonb not null default '[]'::jsonb,
  mood_images jsonb not null default '[]'::jsonb,
  events      jsonb not null default '[]'::jsonb,
  travel_info jsonb not null default '[]'::jsonb,
  timeline    jsonb not null default '[]'::jsonb,  -- day-of timeline (Checklist page)
  updated_at  timestamptz not null default now()
);

-- Wedding details (separate table, mirrors jb-wedding-details localStorage key)
create table if not exists wedding_details (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  partner1   text not null default 'Jamie',
  partner2   text not null default 'Beth',
  date       text not null default '2028-04-05',
  venue      text not null default 'Private Villa Estate',
  time       text not null default '14:00',
  location   text not null default 'Canggu, Bali, Indonesia',
  theme      text not null default 'Romantic Balinese Minimalist',
  updated_at timestamptz not null default now()
);

-- Seating chart (separate table, mirrors jb-seating localStorage key)
create table if not exists seating_data (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  tables     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Accommodation (separate table, mirrors jb-accommodation localStorage key)
create table if not exists accommodation_data (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  rooms      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Mood board (separate table, mirrors jb-moodboard localStorage key)
-- images: [{ id, src, caption, category, notes? }]  — src is a Supabase Storage URL when logged in
-- swatches: [{ id, hex, name }]
create table if not exists moodboard_data (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null unique,
  images     jsonb not null default '[]'::jsonb,
  swatches   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Each user can only read and write their own rows.

alter table app_data          enable row level security;
alter table wedding_details   enable row level security;
alter table seating_data      enable row level security;
alter table accommodation_data enable row level security;
alter table moodboard_data      enable row level security;

-- app_data policies
create policy "Users can read own app_data"
  on app_data for select using (auth.uid() = user_id);
create policy "Users can insert own app_data"
  on app_data for insert with check (auth.uid() = user_id);
create policy "Users can update own app_data"
  on app_data for update using (auth.uid() = user_id);

-- wedding_details policies
create policy "Users can read own wedding_details"
  on wedding_details for select using (auth.uid() = user_id);
create policy "Users can insert own wedding_details"
  on wedding_details for insert with check (auth.uid() = user_id);
create policy "Users can update own wedding_details"
  on wedding_details for update using (auth.uid() = user_id);

-- seating_data policies
create policy "Users can read own seating_data"
  on seating_data for select using (auth.uid() = user_id);
create policy "Users can insert own seating_data"
  on seating_data for insert with check (auth.uid() = user_id);
create policy "Users can update own seating_data"
  on seating_data for update using (auth.uid() = user_id);

-- accommodation_data policies
create policy "Users can read own accommodation_data"
  on accommodation_data for select using (auth.uid() = user_id);
create policy "Users can insert own accommodation_data"
  on accommodation_data for insert with check (auth.uid() = user_id);
create policy "Users can update own accommodation_data"
  on accommodation_data for update using (auth.uid() = user_id);

-- moodboard_data policies
create policy "Users can read own moodboard_data"
  on moodboard_data for select using (auth.uid() = user_id);
create policy "Users can insert own moodboard_data"
  on moodboard_data for insert with check (auth.uid() = user_id);
create policy "Users can update own moodboard_data"
  on moodboard_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Auto-update timestamps ────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger app_data_updated_at
  before update on app_data
  for each row execute function update_updated_at();

create trigger wedding_details_updated_at
  before update on wedding_details
  for each row execute function update_updated_at();

create trigger seating_data_updated_at
  before update on seating_data
  for each row execute function update_updated_at();

create trigger accommodation_data_updated_at
  before update on accommodation_data
  for each row execute function update_updated_at();

create trigger moodboard_data_updated_at
  before update on moodboard_data
  for each row execute function update_updated_at();

-- ── Realtime (cross-tab / cross-device sync) ─────────────────────────────────
-- Run once. Skip any line that errors with "already member of publication".
alter publication supabase_realtime add table app_data;
alter publication supabase_realtime add table seating_data;
alter publication supabase_realtime add table accommodation_data;
alter publication supabase_realtime add table moodboard_data;

-- ── Storage: moodboard image bucket ───────────────────────────────────────────
-- Images are uploaded to {user_id}/{timestamp}.{ext} and served via getPublicUrl().
-- Create the bucket (public read; authenticated write to own folder only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moodboard',
  'moodboard',
  true,
  10485760,  -- 10 MB per image
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users upload to their own folder
create policy "Users can upload moodboard images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (required for getPublicUrl)
create policy "Public read moodboard images"
  on storage.objects for select to public
  using (bucket_id = 'moodboard');

-- Users can delete their own uploads
create policy "Users can delete own moodboard images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'moodboard'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Existing projects: add columns that may be missing ────────────────────────
-- Safe to run on an already-provisioned database.
alter table app_data add column if not exists timeline jsonb not null default '[]'::jsonb;
