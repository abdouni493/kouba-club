-- =============================================================================
--  ORANGE FC / PROFOOT — Feature expansion migration  (2026-07-05)
-- =============================================================================
--  Adds the schema needed for:
--    * Club "cachet" (official stamp) image
--    * Player address / photo / scanned documents
--    * Medical status history (set by admin/worker/doctor)
--    * Insurance (assurance) with types + expiry tracking
--    * Attendance (presence / absence) history per timing
--    * Player evaluations (speed, ball control, dribbling, passing, fitness, discipline)
--    * Matches / appointments + their expenses
--    * Doctors module (login accounts, money entries, payments) — mirrors workers
--
--  HOW TO RUN
--    Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--
--  This script is ADDITIVE and IDEMPOTENT: it only creates things that don't
--  exist yet and can be re-run safely. It does not touch or drop any existing
--  data. Run it AFTER supabase/schema.sql has already been applied.
-- =============================================================================

-- =============================================================================
-- 1. COLUMN ADDITIONS ON EXISTING TABLES
-- =============================================================================

-- ---------- club_info: official stamp/seal image ----------------------------
alter table public.club_info add column if not exists cachet_url text not null default '';

-- ---------- players: address, photo, scanned documents ----------------------
alter table public.players add column if not exists address       text   not null default '';
alter table public.players add column if not exists photo_url      text   not null default '';
alter table public.players add column if not exists document_urls  text[] not null default '{}';

-- =============================================================================
-- 2. NEW LOOKUP TABLE — insurance types (created inline from the app UI)
-- =============================================================================
create table if not exists public.insurance_types (
  id   text primary key,
  name text not null
);

-- =============================================================================
-- 3. NEW DATA TABLES
-- =============================================================================

-- ---------- player insurances (assurance) — history + current ---------------
-- "Current" insurance for a player = the row with the latest end_date.
create table if not exists public.player_insurances (
  id          text primary key,
  player_id   text not null references public.players(id) on delete cascade,
  type_id     text references public.insurance_types(id) on delete set null,
  price       integer not null default 0,
  start_date  date not null default current_date,
  end_date    date not null default current_date,
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- medical records (green/red status set by doctor/admin/worker) ----
-- "Current" status for a player = the most recent record.
create table if not exists public.player_medical_records (
  id          text primary key,
  player_id   text not null references public.players(id) on delete cascade,
  status      boolean not null default true,          -- true = OK (green), false = problem (red)
  description text not null default '',
  date        date not null default current_date,
  doctor_id   text,                                    -- optional: which doctor set it (soft ref)
  created_at  timestamptz not null default now()
);

-- ---------- attendance (presence / absence) per timing ----------------------
create table if not exists public.attendance_records (
  id         text primary key,
  player_id  text not null references public.players(id) on delete cascade,
  timing_id  text references public.timings(id) on delete set null,
  date       date not null default current_date,
  status     text not null default 'present' check (status in ('present','absent')),
  scanned_at timestamptz,                              -- set when it came from a card scan
  created_at timestamptz not null default now(),
  constraint attendance_unique_day unique (player_id, timing_id, date)
);

-- ---------- player evaluations ----------------------------------------------
create table if not exists public.player_evaluations (
  id          text primary key,
  player_id   text not null references public.players(id) on delete cascade,
  date        date not null default current_date,
  speed        smallint not null default 0,
  ball_control smallint not null default 0,
  dribbling    smallint not null default 0,
  passing      smallint not null default 0,
  fitness      smallint not null default 0,
  discipline   smallint not null default 0,
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- matches / appointments ------------------------------------------
create table if not exists public.matches (
  id          text primary key,
  category_id text references public.categories(id) on delete set null,
  stadium_id  text references public.stadiums(id) on delete set null,
  match_date  date not null default current_date,
  opponent    text not null default '',
  description text not null default '',               -- opponent formation / notes
  created_at  timestamptz not null default now()
);

create table if not exists public.match_expenses (
  id         text primary key,
  match_id   text not null references public.matches(id) on delete cascade,
  name       text not null,                            -- e.g. Transport, Hôtel, or custom
  amount     integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- doctors (mirrors workers: login accounts + HR data) -------------
create table if not exists public.doctors (
  id             text primary key,
  full_name      text not null,
  phone          text not null default '',
  address        text not null default '',
  pay_type       text not null default 'month' check (pay_type in ('day','month','session')),
  pay_amount     integer not null default 0,
  account_active boolean not null default false,
  email          text,
  username       text,
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  created_at     date not null default current_date,
  constraint doctors_username_key unique (username)
);

create table if not exists public.doctor_money_entries (
  id          text primary key,
  doctor_id   text not null references public.doctors(id) on delete cascade,
  kind        text not null check (kind in ('acompte','absence')),
  amount      integer not null default 0,
  description text not null default '',
  date        date not null default current_date
);

create table if not exists public.doctor_payments (
  id             text primary key,
  doctor_id      text not null references public.doctors(id) on delete cascade,
  date           date not null default current_date,
  description    text not null default '',
  amount         integer not null default 0,
  months_covered text[] not null default '{}',
  acompte_ids    text[] not null default '{}',
  absence_ids    text[] not null default '{}'
);

-- =============================================================================
-- 4. INDEXES
-- =============================================================================
create index if not exists idx_player_insurances_player   on public.player_insurances(player_id);
create index if not exists idx_medical_records_player      on public.player_medical_records(player_id);
create index if not exists idx_attendance_player           on public.attendance_records(player_id);
create index if not exists idx_attendance_timing_date      on public.attendance_records(timing_id, date);
create index if not exists idx_evaluations_player          on public.player_evaluations(player_id);
create index if not exists idx_match_expenses_match        on public.match_expenses(match_id);
create index if not exists idx_doctor_money_doctor         on public.doctor_money_entries(doctor_id);
create index if not exists idx_doctor_payments_doctor      on public.doctor_payments(doctor_id);
create index if not exists idx_doctors_auth_user           on public.doctors(auth_user_id);

-- =============================================================================
-- 5. ROLE: allow 'doctor' in profiles.role
-- =============================================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin','worker','doctor'));

-- =============================================================================
-- 6. HELPER FUNCTIONS (doctors) + is_active_staff update
-- =============================================================================

create or replace function public.is_active_doctor()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.doctors d
    where d.auth_user_id = auth.uid() and d.account_active = true
  )
$$;

create or replace function public.current_doctor_id()
returns text
language sql stable security definer set search_path = public as $$
  select id from public.doctors where auth_user_id = auth.uid()
$$;

-- Extend "active staff" (used by all shared-read policies) to include doctors,
-- so a signed-in doctor can read players / subscriptions / analysis data.
create or replace function public.is_active_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.workers w where w.auth_user_id = auth.uid() and w.account_active = true)
      or exists (select 1 from public.doctors d where d.auth_user_id = auth.uid() and d.account_active = true)
$$;

grant execute on function public.is_active_doctor()  to authenticated;
grant execute on function public.current_doctor_id() to authenticated;
grant execute on function public.is_active_staff()   to authenticated;

-- =============================================================================
-- 7. ADMIN RPCs — doctor login accounts (mirror the worker RPCs)
-- =============================================================================

create or replace function public.admin_upsert_doctor_account(
  p_doctor_id text, p_email text, p_username text, p_password text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_doctor public.doctors;
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage doctor accounts';
  end if;

  select * into v_doctor from public.doctors where id = p_doctor_id;
  if not found then
    raise exception 'Doctor % not found', p_doctor_id;
  end if;

  if v_doctor.auth_user_id is not null then
    v_user_id := v_doctor.auth_user_id;

    update auth.users
      set email = lower(p_email),
          raw_user_meta_data = raw_user_meta_data
            || jsonb_build_object('username', p_username, 'full_name', v_doctor.full_name, 'role', 'doctor'),
          updated_at = now()
      where id = v_user_id;

    update auth.identities
      set identity_data = jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email), 'email_verified', true),
          updated_at = now()
      where user_id = v_user_id and provider = 'email';

    if p_password is not null and length(p_password) > 0 then
      if length(p_password) < 6 then
        raise exception 'Password must be at least 6 characters';
      end if;
      update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
      where id = v_user_id;
    end if;

    update public.profiles set email = lower(p_email), username = p_username where id = v_user_id;
  else
    if p_password is null or length(p_password) < 6 then
      raise exception 'A password of at least 6 characters is required to create a new account';
    end if;
    v_user_id := public.create_auth_user(p_email, p_password, v_doctor.full_name, p_username, 'doctor');
  end if;

  update public.doctors
    set auth_user_id = v_user_id, account_active = true, email = lower(p_email), username = p_username
    where id = p_doctor_id;

  return v_user_id;
end;
$$;

grant execute on function public.admin_upsert_doctor_account(text,text,text,text) to authenticated;

create or replace function public.admin_set_doctor_account_active(p_doctor_id text, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage doctor accounts';
  end if;
  update public.doctors set account_active = p_active where id = p_doctor_id;
end;
$$;

grant execute on function public.admin_set_doctor_account_active(text,boolean) to authenticated;

create or replace function public.admin_delete_doctor(p_doctor_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_auth_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete doctors';
  end if;

  select auth_user_id into v_auth_id from public.doctors where id = p_doctor_id;
  delete from public.doctors where id = p_doctor_id;

  if v_auth_id is not null then
    delete from auth.users where id = v_auth_id;
  end if;
end;
$$;

grant execute on function public.admin_delete_doctor(text) to authenticated;

-- =============================================================================
-- 8. ROW LEVEL SECURITY
-- =============================================================================

alter table public.insurance_types        enable row level security;
alter table public.player_insurances       enable row level security;
alter table public.player_medical_records  enable row level security;
alter table public.attendance_records      enable row level security;
alter table public.player_evaluations      enable row level security;
alter table public.matches                 enable row level security;
alter table public.match_expenses          enable row level security;
alter table public.doctors                 enable row level security;
alter table public.doctor_money_entries    enable row level security;
alter table public.doctor_payments         enable row level security;

-- ---------- insurance_types (shared read; write with players page) ----------
drop policy if exists insurance_types_read on public.insurance_types;
create policy insurance_types_read on public.insurance_types for select to authenticated using (public.is_active_staff());
drop policy if exists insurance_types_write on public.insurance_types;
create policy insurance_types_write on public.insurance_types for all to authenticated
  using (public.can_write('players')) with check (public.can_write('players'));

-- ---------- player_insurances ----------------------------------------------
drop policy if exists player_insurances_read on public.player_insurances;
create policy player_insurances_read on public.player_insurances for select to authenticated using (public.is_active_staff());
drop policy if exists player_insurances_write on public.player_insurances;
create policy player_insurances_write on public.player_insurances for all to authenticated
  using (public.can_write('players')) with check (public.can_write('players'));

-- ---------- player_medical_records (doctors can also write) -----------------
drop policy if exists medical_records_read on public.player_medical_records;
create policy medical_records_read on public.player_medical_records for select to authenticated using (public.is_active_staff());
drop policy if exists medical_records_write on public.player_medical_records;
create policy medical_records_write on public.player_medical_records for all to authenticated
  using (public.can_write('players') or public.is_active_doctor())
  with check (public.can_write('players') or public.is_active_doctor());

-- ---------- attendance_records (writable from players OR presence page) ------
drop policy if exists attendance_read on public.attendance_records;
create policy attendance_read on public.attendance_records for select to authenticated using (public.is_active_staff());
drop policy if exists attendance_write on public.attendance_records;
create policy attendance_write on public.attendance_records for all to authenticated
  using (public.is_admin() or public.worker_has_page('presence') or public.worker_has_page('players'))
  with check (public.is_admin() or public.worker_has_page('presence') or public.worker_has_page('players'));

-- ---------- player_evaluations ----------------------------------------------
drop policy if exists evaluations_read on public.player_evaluations;
create policy evaluations_read on public.player_evaluations for select to authenticated using (public.is_active_staff());
drop policy if exists evaluations_write on public.player_evaluations;
create policy evaluations_write on public.player_evaluations for all to authenticated
  using (public.can_write('players')) with check (public.can_write('players'));

-- ---------- matches ---------------------------------------------------------
drop policy if exists matches_read on public.matches;
create policy matches_read on public.matches for select to authenticated using (public.is_active_staff());
drop policy if exists matches_write on public.matches;
create policy matches_write on public.matches for all to authenticated
  using (public.can_write('matches')) with check (public.can_write('matches'));

drop policy if exists match_expenses_read on public.match_expenses;
create policy match_expenses_read on public.match_expenses for select to authenticated using (public.is_active_staff());
drop policy if exists match_expenses_write on public.match_expenses;
create policy match_expenses_write on public.match_expenses for all to authenticated
  using (public.can_write('matches')) with check (public.can_write('matches'));

-- ---------- doctors & doctor HR data (admin-only writes, self-or-admin read) -
drop policy if exists doctors_read on public.doctors;
create policy doctors_read on public.doctors for select to authenticated
  using (public.is_admin() or auth_user_id = auth.uid());
drop policy if exists doctors_write on public.doctors;
create policy doctors_write on public.doctors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists doctor_money_entries_read on public.doctor_money_entries;
create policy doctor_money_entries_read on public.doctor_money_entries for select to authenticated
  using (public.is_admin() or doctor_id = public.current_doctor_id());
drop policy if exists doctor_money_entries_write on public.doctor_money_entries;
create policy doctor_money_entries_write on public.doctor_money_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists doctor_payments_read on public.doctor_payments;
create policy doctor_payments_read on public.doctor_payments for select to authenticated
  using (public.is_admin() or doctor_id = public.current_doctor_id());
drop policy if exists doctor_payments_write on public.doctor_payments;
create policy doctor_payments_write on public.doctor_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- 9. STORAGE BUCKETS — player photos & scanned documents
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('player-photos', 'player-photos', true),
  ('player-documents', 'player-documents', true)
on conflict (id) do nothing;

drop policy if exists "player-photos public read" on storage.objects;
create policy "player-photos public read" on storage.objects for select
  using (bucket_id = 'player-photos');
drop policy if exists "player-photos write" on storage.objects;
create policy "player-photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'player-photos' and public.can_write('players'));
drop policy if exists "player-photos update" on storage.objects;
create policy "player-photos update" on storage.objects for update to authenticated
  using (bucket_id = 'player-photos' and public.can_write('players'));
drop policy if exists "player-photos delete" on storage.objects;
create policy "player-photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'player-photos' and public.can_write('players'));

drop policy if exists "player-documents public read" on storage.objects;
create policy "player-documents public read" on storage.objects for select
  using (bucket_id = 'player-documents');
drop policy if exists "player-documents write" on storage.objects;
create policy "player-documents write" on storage.objects for insert to authenticated
  with check (bucket_id = 'player-documents' and public.can_write('players'));
drop policy if exists "player-documents update" on storage.objects;
create policy "player-documents update" on storage.objects for update to authenticated
  using (bucket_id = 'player-documents' and public.can_write('players'));
drop policy if exists "player-documents delete" on storage.objects;
create policy "player-documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'player-documents' and public.can_write('players'));

-- =============================================================================
-- 10. SEED — a couple of insurance types to get started (optional)
-- =============================================================================
insert into public.insurance_types (id, name) values
  ('ins_basic','Assurance de base'),
  ('ins_comp','Assurance complète')
on conflict (id) do nothing;

-- =============================================================================
--  DONE. New page keys usable in worker permissions.pages:
--    'presence'  -> Présences / Absences
--    'matches'   -> Matchs / Rendez-vous
--    'doctors'   -> Médecins   (admin-only in practice)
-- =============================================================================
