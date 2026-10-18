-- Deen Companion schema. Paste into Supabase -> SQL Editor -> New query -> Run.

create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users primary key,
  name text,
  email text,
  avatar_url text,
  location_city text default 'London',
  location_country text default 'UK',
  location_lat float,
  location_lng float,
  language text default 'en',
  level text default 'beginner',
  created_at timestamptz default now()
);

create table prayer_logs (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  prayer text check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  date date not null,
  prayed boolean default false,
  on_time boolean default true,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, prayer, date)
);

create table quran_progress (
  user_id uuid references profiles(id) on delete cascade,
  surah_num int not null,
  last_verse_read int default 1,
  completed boolean default false,
  last_read timestamptz default now(),
  primary key (user_id, surah_num)
);

create table bookmarks (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  surah_num int not null,
  verse_num int not null,
  surah_name text,
  note text,
  highlight_color text,
  created_at timestamptz default now()
);

create table hifz_plan (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  surah_num int not null,
  surah_name text,
  total_verses int,
  memorized_verses int default 0,
  last_reviewed timestamptz,
  next_review date,
  ease_factor float default 2.5,
  interval_days int default 1,
  status text default 'not_started'
    check (status in ('not_started','in_progress','done'))
);

create table story_progress (
  user_id uuid references profiles(id) on delete cascade,
  story_id text not null,
  chapters_read int default 0,
  completed boolean default false,
  last_read timestamptz default now(),
  primary key (user_id, story_id)
);

create table daily_habits (
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  prayers_done int default 0,
  quran_minutes int default 0,
  dhikr_count int default 0,
  morning_adhkar boolean default false,
  evening_adhkar boolean default false,
  charity_done boolean default false,
  fasting boolean default false,
  islamic_reading boolean default false,
  spiritual_score int default 0,
  primary key (user_id, date)
);

create table quiz_scores (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  category text,
  score int,
  total int,
  time_taken_secs int,
  difficulty text default 'medium',
  taken_at timestamptz default now()
);

create table flashcard_reviews (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  card_id text not null,
  deck_id text not null,
  ease_factor float default 2.5,
  interval_days int default 1,
  repetitions int default 0,
  next_review date default current_date,
  last_reviewed timestamptz
);

create table donations (
  id serial primary key,
  user_id uuid references profiles(id),
  amount_usd decimal(10,2),
  cause_id text,
  cause_title text,
  donation_type text default 'one-time',
  stripe_payment_id text unique,
  status text default 'pending',
  donated_at timestamptz default now()
);

create table notification_settings (
  user_id uuid references profiles(id) primary key,
  push_token text,
  fajr bool default true, dhuhr bool default true,
  asr bool default true, maghrib bool default true,
  isha bool default true, daily_hadith bool default true,
  daily_quran bool default true, hifz_reminder bool default true,
  weekly_report bool default true
);

-- Row Level Security: users can only access their own rows.
alter table profiles enable row level security;
alter table prayer_logs enable row level security;
alter table quran_progress enable row level security;
alter table bookmarks enable row level security;
alter table hifz_plan enable row level security;
alter table story_progress enable row level security;
alter table daily_habits enable row level security;
alter table quiz_scores enable row level security;
alter table flashcard_reviews enable row level security;
alter table donations enable row level security;
alter table notification_settings enable row level security;

create policy "own" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own" on prayer_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on quran_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on hifz_plan for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on story_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on daily_habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on quiz_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on flashcard_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on donations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on notification_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile when someone signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Cross-device sync: one row per (user, app storage key). The app keeps working
-- fully offline/local; when signed in it merges by "newest write wins" per key.
-- Run this block if you set up the database before sync was added.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) <= 100),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table user_data enable row level security;

drop policy if exists "own rows" on user_data;
create policy "own rows" on user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
