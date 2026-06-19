-- Run once in Supabase SQL Editor if moodboard_data UPDATE policy lacks WITH CHECK.
-- Fixes upsert UPDATE path for moodboard_data when RLS rejects row changes.

drop policy if exists "Users can update own moodboard_data" on moodboard_data;

create policy "Users can update own moodboard_data"
  on moodboard_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);