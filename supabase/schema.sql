-- =============================================================================
--  ORANGE FC — Full Supabase schema (tables, RLS, auth, storage, seed data)
-- =============================================================================
--  Target project : https://cmevytjzvaptrffmpghu.supabase.co
--
--  HOW TO RUN
--  1. Open the Supabase Dashboard → SQL Editor → New query.
--  2. Paste this ENTIRE file and click "Run".
--  3. Go to Authentication → Providers → Email and turn OFF "Confirm email"
--     (required so the "create admin account" button on the login page and
--     worker accounts created by the admin can sign in immediately).
--  4. That's it — see the bottom of this file for the seeded login credentials.
--
--  This script is idempotent: it can be re-run safely if something fails
--  partway through (tables/policies/functions are dropped & recreated, seed
--  rows use ON CONFLICT DO NOTHING, seed auth users are only created if they
--  don't already exist).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- ---------- profiles (1 row per Supabase Auth user; role drives access) -----
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'worker' check (role in ('admin','worker')),
  full_name  text not null default '',
  username   text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_email_key unique (email)
);

-- ---------- club singleton tables -------------------------------------------
create table if not exists public.club_info (
  id          smallint primary key default 1 check (id = 1),
  logo_url    text not null default '',
  name        text not null default 'Orange FC',
  description text not null default '',
  email       text not null default '',
  phone       text not null default '',
  address     text not null default '',
  nif         text not null default '',
  nis         text not null default '',
  article     text not null default '',
  rc          text not null default '',
  reg_fee_amount numeric not null default 0
);

create table if not exists public.club_contact (
  id         smallint primary key default 1 check (id = 1),
  facebook   text not null default '',
  instagram  text not null default '',
  tiktok     text not null default '',
  map        text not null default '',
  phone      text not null default '',
  whatsapp   text not null default '',
  email      text not null default ''
);

-- ---------- simple lookup tables (created inline from the app UI) ----------
create table if not exists public.categories (
  id   text primary key,
  name text not null
);

create table if not exists public.player_groups (
  id   text primary key,
  name text not null
);

create table if not exists public.sports (
  id   text primary key,
  name text not null
);

create table if not exists public.stadiums (
  id   text primary key,
  name text not null
);

create table if not exists public.roles (
  id   text primary key,
  name text not null
);

create table if not exists public.expense_categories (
  id   text primary key,
  name text not null
);

-- ---------- trainers ---------------------------------------------------------
create table if not exists public.trainers (
  id             text primary key,
  full_name      text not null,
  phone          text not null default '',
  email          text not null default '',
  address        text not null default '',
  payment_type   text not null default 'month' check (payment_type in ('month','percentage')),
  monthly_amount integer,
  percentage     integer,
  created_at     date not null default current_date
);

create table if not exists public.trainer_money_entries (
  id          text primary key,
  trainer_id  text not null references public.trainers(id) on delete cascade,
  kind        text not null check (kind in ('acompte','absence')),
  amount      integer not null default 0,
  description text not null default '',
  date        date not null default current_date
);

create table if not exists public.trainer_payments (
  id               text primary key,
  trainer_id       text not null references public.trainers(id) on delete cascade,
  date             date not null default current_date,
  description      text not null default '',
  amount           integer not null default 0,
  months_covered   text[] not null default '{}',
  acompte_ids      text[] not null default '{}',
  absence_ids      text[] not null default '{}',
  subscription_ids text[] not null default '{}'
);

-- ---------- planificateur -----------------------------------------------------
create table if not exists public.timings (
  id          text primary key,
  name        text not null,
  category_id text references public.categories(id) on delete set null,
  group_id    text references public.player_groups(id) on delete set null,
  sport_id    text references public.sports(id) on delete set null,
  stadium_id  text references public.stadiums(id) on delete set null,
  trainer_id  text references public.trainers(id) on delete set null,
  days        text[] not null default '{}',
  start_time  text not null default '',
  end_time    text not null default ''
);

create table if not exists public.subscriptions (
  id                text primary key,
  name              text not null,
  timing_id         text references public.timings(id) on delete set null,
  period_days       integer not null default 30,
  total_seances     integer not null default 0,
  price_per_seance  integer not null default 0,
  total_price       integer not null default 0
);

-- ---------- parents & players -------------------------------------------------
create table if not exists public.parents (
  id         text primary key,
  first_name text not null,
  last_name  text not null,
  phone      text not null default '',
  address    text not null default '',
  email      text not null default ''
);

create table if not exists public.players (
  id                     text primary key,
  first_name             text not null,
  last_name              text not null,
  birth_date             date,
  birth_place            text not null default '',
  phone                  text not null default '',
  email                  text not null default '',
  parent_id              text references public.parents(id) on delete set null,
  created_at             date not null default current_date,
  subscription_cost_paid boolean not null default false,
  -- flattened "assignedSubscription" (nullable = no active subscription)
  sub_subscription_id    text references public.subscriptions(id) on delete set null,
  sub_timing_id          text references public.timings(id) on delete set null,
  sub_start_date         date,
  sub_expiry_date        date,
  sub_price              integer,
  sub_amount_paid        integer,
  sub_rest               integer,
  sub_status             text check (sub_status in ('payed','debt'))
);

create table if not exists public.player_payments (
  id        text primary key,
  player_id text not null references public.players(id) on delete cascade,
  date      date not null default current_date,
  amount    integer not null default 0,
  note      text not null default '',
  kind      text not null default 'subscription' check (kind in ('subscription','debt','fee'))
);

-- ---------- workers (employees) ------------------------------------------------
create table if not exists public.workers (
  id             text primary key,
  full_name      text not null,
  birth_date     date,
  id_card        text,
  phone          text not null default '',
  role_id        text references public.roles(id) on delete set null,
  pay_active     boolean not null default false,
  pay_type       text not null default 'month' check (pay_type in ('day','month')),
  pay_amount     integer not null default 0,
  account_active boolean not null default false,
  email          text,
  username       text,
  permissions    jsonb not null default '{"pages": [], "actions": {}}'::jsonb,
  start_date     date not null default current_date,
  auth_user_id   uuid unique references auth.users(id) on delete set null,
  constraint workers_username_key unique (username)
);

create table if not exists public.worker_money_entries (
  id          text primary key,
  worker_id   text not null references public.workers(id) on delete cascade,
  kind        text not null check (kind in ('acompte','absence')),
  amount      integer not null default 0,
  description text not null default '',
  date        date not null default current_date
);

create table if not exists public.worker_payments (
  id             text primary key,
  worker_id      text not null references public.workers(id) on delete cascade,
  date           date not null default current_date,
  description    text not null default '',
  amount         integer not null default 0,
  months_covered text[] not null default '{}',
  acompte_ids    text[] not null default '{}',
  absence_ids    text[] not null default '{}'
);

-- ---------- expenses & caisse --------------------------------------------------
create table if not exists public.expenses (
  id          text primary key,
  name        text not null,
  category_id text references public.expense_categories(id) on delete set null,
  description text not null default '',
  amount      integer not null default 0,
  date        date not null default current_date
);

create table if not exists public.caisse_transactions (
  id          text primary key,
  type        text not null check (type in ('deposit','withdraw')),
  amount      integer not null default 0,
  date        date not null default current_date,
  description text not null default ''
);

-- ---------- public website -----------------------------------------------------
create table if not exists public.activities (
  id          text primary key,
  name        text not null,
  description text not null default '',
  image       text not null default 'grad-1'
);

-- ---------- indexes --------------------------------------------------------
create index if not exists idx_timings_trainer on public.timings(trainer_id);
create index if not exists idx_subscriptions_timing on public.subscriptions(timing_id);
create index if not exists idx_players_parent on public.players(parent_id);
create index if not exists idx_players_sub_timing on public.players(sub_timing_id);
create index if not exists idx_player_payments_player on public.player_payments(player_id);
create index if not exists idx_trainer_money_trainer on public.trainer_money_entries(trainer_id);
create index if not exists idx_trainer_payments_trainer on public.trainer_payments(trainer_id);
create index if not exists idx_worker_money_worker on public.worker_money_entries(worker_id);
create index if not exists idx_worker_payments_worker on public.worker_payments(worker_id);
create index if not exists idx_expenses_category on public.expenses(category_id);
create index if not exists idx_workers_auth_user on public.workers(auth_user_id);

-- =============================================================================
-- 2. HELPER FUNCTIONS (security definer — used inside RLS policies)
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.worker_has_page(p_page text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workers w
    where w.auth_user_id = auth.uid()
      and w.account_active = true
      and (w.permissions -> 'pages') ? p_page
  )
$$;

create or replace function public.is_active_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.workers w where w.auth_user_id = auth.uid() and w.account_active = true
  )
$$;

create or replace function public.can_write(p_page text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.worker_has_page(p_page)
$$;

create or replace function public.current_worker_id()
returns text
language sql stable security definer set search_path = public as $$
  select id from public.workers where auth_user_id = auth.uid()
$$;

-- Resolve a login "identifier" (username OR email) to the real email, so the
-- login form can accept either. Only returns an email string, nothing else.
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where lower(username) = lower(p_identifier) or lower(email) = lower(p_identifier)
  limit 1
$$;

-- Used by the login page's "create admin account" form to give a friendly
-- "already exists" error before calling supabase.auth.signUp().
create or replace function public.identifier_available(p_username text, p_email text)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(p_username) or lower(email) = lower(p_email)
  )
$$;

grant execute on function public.is_admin()                    to authenticated;
grant execute on function public.worker_has_page(text)         to authenticated;
grant execute on function public.is_active_staff()              to authenticated;
grant execute on function public.can_write(text)                to authenticated;
grant execute on function public.current_worker_id()            to authenticated;
grant execute on function public.resolve_login_email(text)      to anon, authenticated;
grant execute on function public.identifier_available(text,text) to anon, authenticated;

-- =============================================================================
-- 3. AUTH INTEGRATION — profiles auto-created for every new auth.users row
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'worker'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent a non-admin from ever promoting themselves to admin via a direct
-- "update profiles" call (self-service update only touches name/username/email).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- =============================================================================
-- 4. ADMIN RPCs — create/update/delete auth.users rows from the app
--    (SECURITY DEFINER so calling them never swaps the caller's own session)
-- =============================================================================

-- Internal helper: inserts a fully-confirmed auth user + identity row.
-- Not granted to anon/authenticated directly — only callable from the
-- SECURITY DEFINER functions below (or by the project owner in this script).
create or replace function public.create_auth_user(
  p_email text, p_password text, p_full_name text, p_username text, p_role text
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = lower(p_email)) then
    raise exception 'A user with email % already exists', p_email;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', p_full_name, 'username', p_username, 'role', p_role),
    false, now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );

  return v_user_id;
end;
$$;

revoke all on function public.create_auth_user(text,text,text,text,text) from public;

-- Admin-only: create a Supabase Auth login for a worker, or update an
-- existing one (email/username always updated; password only if provided).
create or replace function public.admin_upsert_worker_account(
  p_worker_id text, p_email text, p_username text, p_password text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_worker public.workers;
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage worker accounts';
  end if;

  select * into v_worker from public.workers where id = p_worker_id;
  if not found then
    raise exception 'Worker % not found', p_worker_id;
  end if;

  if v_worker.auth_user_id is not null then
    v_user_id := v_worker.auth_user_id;

    update auth.users
      set email = lower(p_email),
          raw_user_meta_data = raw_user_meta_data
            || jsonb_build_object('username', p_username, 'full_name', v_worker.full_name),
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
    v_user_id := public.create_auth_user(p_email, p_password, v_worker.full_name, p_username, 'worker');
  end if;

  update public.workers
    set auth_user_id = v_user_id, account_active = true, email = lower(p_email), username = p_username
    where id = p_worker_id;

  return v_user_id;
end;
$$;

grant execute on function public.admin_upsert_worker_account(text,text,text,text) to authenticated;

-- Admin-only: deactivate a worker's login without deleting the account.
create or replace function public.admin_set_worker_account_active(p_worker_id text, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage worker accounts';
  end if;
  update public.workers set account_active = p_active where id = p_worker_id;
end;
$$;

grant execute on function public.admin_set_worker_account_active(text,boolean) to authenticated;

-- Admin-only: delete a worker AND their Supabase Auth login (if any), so no
-- orphaned credentials survive an employee being removed.
create or replace function public.admin_delete_worker(p_worker_id text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_auth_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete workers';
  end if;

  select auth_user_id into v_auth_id from public.workers where id = p_worker_id;
  delete from public.workers where id = p_worker_id;

  if v_auth_id is not null then
    delete from auth.users where id = v_auth_id;
  end if;
end;
$$;

grant execute on function public.admin_delete_worker(text) to authenticated;

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================
-- Model:
--  * Every business table can be READ by any signed-in admin or active worker
--    (this mirrors the original app, where all in-app screens share one
--    in-memory dataset for cross-page lookups/totals).
--  * club_info / club_contact / activities are ALSO readable by anon (public
--    website at /website needs them without a login).
--  * WRITES (insert/update/delete) require is_admin() OR the worker having
--    the matching page enabled in permissions.pages — this is the real,
--    server-side enforcement of the admin-granted permissions.
--  * workers / worker_money_entries / worker_payments / profiles are the one
--    exception: considered HR data, so writes are admin-only and reads are
--    restricted to the admin or the worker's own row.
-- =============================================================================

alter table public.profiles                enable row level security;
alter table public.club_info                enable row level security;
alter table public.club_contact             enable row level security;
alter table public.categories               enable row level security;
alter table public.player_groups            enable row level security;
alter table public.sports                   enable row level security;
alter table public.stadiums                 enable row level security;
alter table public.roles                    enable row level security;
alter table public.expense_categories       enable row level security;
alter table public.trainers                 enable row level security;
alter table public.trainer_money_entries    enable row level security;
alter table public.trainer_payments         enable row level security;
alter table public.timings                  enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.parents                  enable row level security;
alter table public.players                  enable row level security;
alter table public.player_payments          enable row level security;
alter table public.workers                  enable row level security;
alter table public.worker_money_entries     enable row level security;
alter table public.worker_payments          enable row level security;
alter table public.expenses                 enable row level security;
alter table public.caisse_transactions      enable row level security;
alter table public.activities               enable row level security;

-- ---------- profiles ----------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_admin() or id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

-- profiles are inserted only by the handle_new_user trigger (security definer)

-- ---------- club_info -----------------------------------------------------
drop policy if exists club_info_public_read on public.club_info;
create policy club_info_public_read on public.club_info for select to anon, authenticated using (true);

drop policy if exists club_info_write on public.club_info;
create policy club_info_write on public.club_info for all to authenticated
  using (public.can_write('settings')) with check (public.can_write('settings'));

-- ---------- club_contact ---------------------------------------------------
drop policy if exists club_contact_public_read on public.club_contact;
create policy club_contact_public_read on public.club_contact for select to anon, authenticated using (true);

drop policy if exists club_contact_write on public.club_contact;
create policy club_contact_write on public.club_contact for all to authenticated
  using (public.can_write('website')) with check (public.can_write('website'));

-- ---------- activities ------------------------------------------------------
drop policy if exists activities_public_read on public.activities;
create policy activities_public_read on public.activities for select to anon, authenticated using (true);

drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities for all to authenticated
  using (public.can_write('website')) with check (public.can_write('website'));

-- ---------- generic "shared read, page-gated write" tables -----------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to authenticated using (public.is_active_staff());
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all to authenticated
  using (public.can_write('planificateur')) with check (public.can_write('planificateur'));

drop policy if exists player_groups_read on public.player_groups;
create policy player_groups_read on public.player_groups for select to authenticated using (public.is_active_staff());
drop policy if exists player_groups_write on public.player_groups;
create policy player_groups_write on public.player_groups for all to authenticated
  using (public.can_write('planificateur')) with check (public.can_write('planificateur'));

drop policy if exists sports_read on public.sports;
create policy sports_read on public.sports for select to authenticated using (public.is_active_staff());
drop policy if exists sports_write on public.sports;
create policy sports_write on public.sports for all to authenticated
  using (public.can_write('planificateur')) with check (public.can_write('planificateur'));

drop policy if exists stadiums_read on public.stadiums;
create policy stadiums_read on public.stadiums for select to authenticated using (public.is_active_staff());
drop policy if exists stadiums_write on public.stadiums;
create policy stadiums_write on public.stadiums for all to authenticated
  using (public.can_write('planificateur')) with check (public.can_write('planificateur'));

drop policy if exists timings_read on public.timings;
create policy timings_read on public.timings for select to authenticated using (public.is_active_staff());
drop policy if exists timings_write on public.timings;
create policy timings_write on public.timings for all to authenticated
  using (public.can_write('planificateur')) with check (public.can_write('planificateur'));

drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated using (public.is_active_staff());
drop policy if exists roles_write on public.roles;
create policy roles_write on public.roles for all to authenticated
  using (public.can_write('workers')) with check (public.can_write('workers'));

drop policy if exists expense_categories_read on public.expense_categories;
create policy expense_categories_read on public.expense_categories for select to authenticated using (public.is_active_staff());
drop policy if exists expense_categories_write on public.expense_categories;
create policy expense_categories_write on public.expense_categories for all to authenticated
  using (public.can_write('expenses')) with check (public.can_write('expenses'));

drop policy if exists trainers_read on public.trainers;
create policy trainers_read on public.trainers for select to authenticated using (public.is_active_staff());
drop policy if exists trainers_write on public.trainers;
create policy trainers_write on public.trainers for all to authenticated
  using (public.can_write('trainers')) with check (public.can_write('trainers'));

drop policy if exists trainer_money_entries_read on public.trainer_money_entries;
create policy trainer_money_entries_read on public.trainer_money_entries for select to authenticated using (public.is_active_staff());
drop policy if exists trainer_money_entries_write on public.trainer_money_entries;
create policy trainer_money_entries_write on public.trainer_money_entries for all to authenticated
  using (public.can_write('trainers')) with check (public.can_write('trainers'));

drop policy if exists trainer_payments_read on public.trainer_payments;
create policy trainer_payments_read on public.trainer_payments for select to authenticated using (public.is_active_staff());
drop policy if exists trainer_payments_write on public.trainer_payments;
create policy trainer_payments_write on public.trainer_payments for all to authenticated
  using (public.can_write('trainers')) with check (public.can_write('trainers'));

drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated using (public.is_active_staff());
drop policy if exists subscriptions_write on public.subscriptions;
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (public.can_write('subscriptions')) with check (public.can_write('subscriptions'));

drop policy if exists parents_read on public.parents;
create policy parents_read on public.parents for select to authenticated using (public.is_active_staff());
drop policy if exists parents_write on public.parents;
create policy parents_write on public.parents for all to authenticated
  using (public.can_write('parents')) with check (public.can_write('parents'));

drop policy if exists players_read on public.players;
create policy players_read on public.players for select to authenticated using (public.is_active_staff());
drop policy if exists players_write on public.players;
create policy players_write on public.players for all to authenticated
  using (public.can_write('players')) with check (public.can_write('players'));

drop policy if exists player_payments_read on public.player_payments;
create policy player_payments_read on public.player_payments for select to authenticated using (public.is_active_staff());
drop policy if exists player_payments_write on public.player_payments;
create policy player_payments_write on public.player_payments for all to authenticated
  using (public.can_write('players')) with check (public.can_write('players'));

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select to authenticated using (public.is_active_staff());
drop policy if exists expenses_write on public.expenses;
create policy expenses_write on public.expenses for all to authenticated
  using (public.can_write('expenses')) with check (public.can_write('expenses'));

drop policy if exists caisse_transactions_read on public.caisse_transactions;
create policy caisse_transactions_read on public.caisse_transactions for select to authenticated using (public.is_active_staff());
drop policy if exists caisse_transactions_write on public.caisse_transactions;
create policy caisse_transactions_write on public.caisse_transactions for all to authenticated
  using (public.can_write('caisse')) with check (public.can_write('caisse'));

-- ---------- workers & HR data: admin-only writes, self-or-admin reads -----
drop policy if exists workers_read on public.workers;
create policy workers_read on public.workers for select to authenticated
  using (public.is_admin() or auth_user_id = auth.uid());
drop policy if exists workers_write on public.workers;
create policy workers_write on public.workers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists worker_money_entries_read on public.worker_money_entries;
create policy worker_money_entries_read on public.worker_money_entries for select to authenticated
  using (public.is_admin() or worker_id = public.current_worker_id());
drop policy if exists worker_money_entries_write on public.worker_money_entries;
create policy worker_money_entries_write on public.worker_money_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists worker_payments_read on public.worker_payments;
create policy worker_payments_read on public.worker_payments for select to authenticated
  using (public.is_admin() or worker_id = public.current_worker_id());
drop policy if exists worker_payments_write on public.worker_payments;
create policy worker_payments_write on public.worker_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- 6. STORAGE BUCKETS — logo & image uploads
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('club-logo', 'club-logo', true),
  ('activity-images', 'activity-images', true)
on conflict (id) do nothing;

-- public read on both buckets (needed for <img> tags + public website)
drop policy if exists "club-logo public read" on storage.objects;
create policy "club-logo public read" on storage.objects for select
  using (bucket_id = 'club-logo');

drop policy if exists "activity-images public read" on storage.objects;
create policy "activity-images public read" on storage.objects for select
  using (bucket_id = 'activity-images');

-- writes gated by the same page permissions as the data they belong to
drop policy if exists "club-logo write" on storage.objects;
create policy "club-logo write" on storage.objects for insert to authenticated
  with check (bucket_id = 'club-logo' and public.can_write('settings'));
drop policy if exists "club-logo update" on storage.objects;
create policy "club-logo update" on storage.objects for update to authenticated
  using (bucket_id = 'club-logo' and public.can_write('settings'));
drop policy if exists "club-logo delete" on storage.objects;
create policy "club-logo delete" on storage.objects for delete to authenticated
  using (bucket_id = 'club-logo' and public.can_write('settings'));

drop policy if exists "activity-images write" on storage.objects;
create policy "activity-images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'activity-images' and public.can_write('website'));
drop policy if exists "activity-images update" on storage.objects;
create policy "activity-images update" on storage.objects for update to authenticated
  using (bucket_id = 'activity-images' and public.can_write('website'));
drop policy if exists "activity-images delete" on storage.objects;
create policy "activity-images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'activity-images' and public.can_write('website'));

-- =============================================================================
-- 7. SEED DATA — sample club data matching the original demo
-- =============================================================================

insert into public.club_info (id, logo_url, name, description, email, phone, address, nif, nis, article, rc) values
  (1, '', 'Orange FC', 'Club de football formateur — passion, discipline et excellence depuis 2010.',
   'contact@orangefc.dz', '0550 00 00 00', 'Cité Sportive, Alger',
   '000000000000000', '000000000000000', '00000000000', '16/00-0000000')
on conflict (id) do nothing;

insert into public.club_contact (id, facebook, instagram, tiktok, map, phone, whatsapp, email) values
  (1, 'https://facebook.com/orangefc', 'https://instagram.com/orangefc', 'https://tiktok.com/@orangefc',
   'https://maps.google.com', '0550 00 00 00', '213550000000', 'contact@orangefc.dz')
on conflict (id) do nothing;

insert into public.categories (id, name) values
  ('cat_u9','U9'), ('cat_u11','U11'), ('cat_u13','U13'), ('cat_u15','U15'), ('cat_sen','Seniors')
on conflict (id) do nothing;

insert into public.player_groups (id, name) values
  ('grp_a','Groupe A'), ('grp_b','Groupe B'), ('grp_c','Groupe C')
on conflict (id) do nothing;

insert into public.sports (id, name) values
  ('sp_foot','Football'), ('sp_futsal','Futsal'), ('sp_hand','Handball')
on conflict (id) do nothing;

insert into public.stadiums (id, name) values
  ('st_main','Stade Principal'), ('st_annex','Terrain Annexe'), ('st_hall','Salle Omnisport')
on conflict (id) do nothing;

insert into public.roles (id, name) values
  ('role_sec','Secrétaire'), ('role_guard','Gardien'), ('role_phys','Préparateur physique')
on conflict (id) do nothing;

insert into public.expense_categories (id, name) values
  ('ec_equip','Équipement'), ('ec_rent','Location'), ('ec_util','Charges'), ('ec_med','Médical')
on conflict (id) do nothing;

insert into public.trainers (id, full_name, phone, email, address, payment_type, monthly_amount, percentage, created_at) values
  ('tr_1','Karim Bensalah','0550 12 34 56','karim.b@club.dz','Alger Centre','month',45000,null, current_date - 120),
  ('tr_2','Yacine Mokrani','0661 98 76 54','yacine.m@club.dz','Bab Ezzouar','percentage',null,25, current_date - 90),
  ('tr_3','Sofiane Haddad','0770 45 67 89','sofiane.h@club.dz','Hydra','month',40000,null, current_date - 60)
on conflict (id) do nothing;

insert into public.trainer_money_entries (id, trainer_id, kind, amount, description, date) values
  ('ac_seed_1','tr_1','acompte',10000,'Avance mai', current_date - 40),
  ('ab_seed_1','tr_2','absence',3000,'Absence séance', current_date - 12)
on conflict (id) do nothing;

insert into public.timings (id, name, category_id, group_id, sport_id, stadium_id, trainer_id, days, start_time, end_time) values
  ('tm_1','U11 · Groupe A · Karim Bensalah','cat_u11','grp_a','sp_foot','st_main','tr_1', array['monday','wednesday'], '17:00','18:30'),
  ('tm_2','U13 · Groupe B · Yacine Mokrani','cat_u13','grp_b','sp_foot','st_main','tr_2', array['tuesday','thursday'], '18:00','19:30'),
  ('tm_3','U9 · Groupe A · Karim Bensalah','cat_u9','grp_a','sp_foot','st_annex','tr_1', array['saturday'], '10:00','11:30'),
  ('tm_4','U15 · Groupe C · Sofiane Haddad','cat_u15','grp_c','sp_futsal','st_hall','tr_3', array['friday','sunday'], '16:00','17:30')
on conflict (id) do nothing;

insert into public.subscriptions (id, name, timing_id, period_days, total_seances, price_per_seance, total_price) values
  ('sub_1','U11 · Groupe A · Karim Bensalah','tm_1',30,8,500,4000),
  ('sub_2','U13 · Groupe B · Yacine Mokrani','tm_2',30,8,625,5000),
  ('sub_3','U9 · Groupe A · Karim Bensalah','tm_3',30,4,750,3000),
  ('sub_4','U15 · Groupe C · Sofiane Haddad','tm_4',30,8,750,6000)
on conflict (id) do nothing;

insert into public.parents (id, first_name, last_name, phone, address, email) values
  ('par_1','Ahmed','Benali','0555 11 22 33','Kouba, Alger','ahmed.benali@mail.dz'),
  ('par_2','Fatima','Zerrouki','0666 44 55 66','El Biar, Alger','f.zerrouki@mail.dz'),
  ('par_3','Omar','Cherif','0777 77 88 99','Draria, Alger','omar.cherif@mail.dz'),
  ('par_4','Nadia','Slimani','0551 23 45 67','Birkhadem','nadia.s@mail.dz')
on conflict (id) do nothing;

insert into public.players (
  id, first_name, last_name, birth_date, birth_place, phone, email, parent_id, created_at,
  subscription_cost_paid, sub_subscription_id, sub_timing_id, sub_start_date, sub_expiry_date,
  sub_price, sub_amount_paid, sub_rest, sub_status
) values
  ('pl_1','Adem','Benali','2015-03-12','Alger','0555 11 22 33','adem@mail.dz','par_1', current_date - 80,
   true, 'sub_1','tm_1', current_date - 25, current_date + 5, 4000, 4000, 0, 'payed'),
  ('pl_2','Lina','Benali','2013-07-22','Alger','0555 11 22 33','lina@mail.dz','par_1', current_date - 70,
   true, 'sub_2','tm_2', current_date - 27, current_date + 3, 5000, 3000, 2000, 'debt'),
  ('pl_3','Rayan','Zerrouki','2014-11-05','Blida','0666 44 55 66','rayan@mail.dz','par_2', current_date - 60,
   false, 'sub_1','tm_1', current_date - 3, current_date + 27, 4000, 4000, 0, 'payed'),
  ('pl_4','Yasmine','Cherif','2016-01-18','Alger','0777 77 88 99','yasmine@mail.dz','par_3', current_date - 50,
   true, 'sub_3','tm_3', current_date - 28, current_date + 2, 3000, 1500, 1500, 'debt'),
  ('pl_5','Ilyes','Cherif','2012-09-30','Alger','0777 77 88 99','ilyes@mail.dz','par_3', current_date - 45,
   true, 'sub_4','tm_4', current_date - 20, current_date + 10, 6000, 6000, 0, 'payed'),
  ('pl_6','Amir','Slimani','2013-05-14','Alger','0551 23 45 67','amir@mail.dz','par_4', current_date - 40,
   false, 'sub_2','tm_2', current_date - 29, current_date + 1, 5000, 2000, 3000, 'debt'),
  ('pl_7','Sami','Toumi','2015-08-08','Alger','0699 00 11 22','sami@mail.dz', null, current_date - 20,
   false, null, null, null, null, null, null, null, null),
  ('pl_8','Nour','Belkacem','2014-02-27','Alger','0698 33 44 55','nour@mail.dz', null, current_date - 10,
   false, 'sub_1','tm_1', current_date - 33, current_date - 3, 4000, 4000, 0, 'payed')
on conflict (id) do nothing;

insert into public.player_payments (id, player_id, date, amount, note, kind) values
  ('pay_1','pl_1', current_date - 25, 4000, 'Abonnement complet', 'subscription'),
  ('pay_2','pl_2', current_date - 27, 3000, 'Acompte', 'subscription'),
  ('pay_3','pl_3', current_date - 3, 4000, 'Abonnement complet', 'subscription'),
  ('pay_4','pl_4', current_date - 28, 1500, 'Acompte', 'subscription'),
  ('pay_5','pl_5', current_date - 20, 6000, 'Abonnement complet', 'subscription'),
  ('pay_6','pl_6', current_date - 29, 2000, 'Acompte', 'subscription'),
  ('pay_8','pl_8', current_date - 33, 4000, 'Abonnement complet', 'subscription')
on conflict (id) do nothing;

insert into public.expenses (id, name, category_id, description, amount, date) values
  ('ex_1','Ballons Nike (x20)','ec_equip','Renouvellement matériel U11', 24000, current_date - 18),
  ('ex_2','Location terrain principal','ec_rent','Mensualité', 60000, current_date - 15),
  ('ex_3','Facture électricité','ec_util','Salle omnisport', 12000, current_date - 10),
  ('ex_4','Kit premiers soins','ec_med','Trousse médicale', 8000, current_date - 5),
  ('ex_5','Maillots entrainement','ec_equip','Lot 30 pièces', 45000, current_date - 2)
on conflict (id) do nothing;

insert into public.caisse_transactions (id, type, amount, date, description) values
  ('tx_1','deposit',100000, current_date - 30, 'Fonds initial'),
  ('tx_2','withdraw',15000, current_date - 12, 'Achat fournitures'),
  ('tx_3','deposit',25000, current_date - 4, 'Encaissement inscriptions')
on conflict (id) do nothing;

insert into public.activities (id, name, description, image) values
  ('act_1','École de Football','Formation des jeunes talents de 6 à 15 ans avec des entraîneurs diplômés.','grad-1'),
  ('act_2','Stage de vacances','Stages intensifs pendant les vacances scolaires, encadrement professionnel.','grad-2'),
  ('act_3','Tournois inter-clubs','Compétitions régulières et matchs amicaux contre les meilleurs clubs.','grad-3')
on conflict (id) do nothing;

insert into public.workers (
  id, full_name, birth_date, id_card, phone, role_id, pay_active, pay_type, pay_amount,
  account_active, email, username, permissions, start_date
) values
  ('wk_1','Mounir Saidi','1990-04-10','1990041012345','0550 99 88 77','role_sec', true,'month',35000,
   true, 'mounir@club.dz','mounir',
   '{"pages": ["dashboard","players","parents","subscriptions"], "actions": {}}'::jsonb, current_date - 200),
  ('wk_2','Salima Brahimi','1995-12-01', null, '0661 22 33 44','role_guard', true,'day',1500,
   false, null, null, '{"pages": [], "actions": {}}'::jsonb, current_date - 150)
on conflict (id) do nothing;

insert into public.worker_money_entries (id, worker_id, kind, amount, description, date) values
  ('wac_1','wk_1','acompte',8000,'Avance', current_date - 30),
  ('wab_1','wk_2','absence',1500,'Absence', current_date - 8)
on conflict (id) do nothing;

-- =============================================================================
-- 8. SEED AUTH USERS — real Supabase Auth accounts (admin + demo worker)
-- =============================================================================
--  These run through the SAME create_auth_user() helper used by the app, so
--  the accounts are fully functional (properly hashed passwords, confirmed
--  emails, linked profiles via the trigger above).
--
--  >>> CHANGE THESE PASSWORDS FROM THE APP (Paramètres → Compte) RIGHT AFTER
--  >>> YOUR FIRST LOGIN. They are stored in plain text only in this file. <<<
-- =============================================================================

do $$
declare
  v_admin_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'admin@orangefc.dz') then
    v_admin_id := public.create_auth_user(
      'admin@orangefc.dz', 'Admin#2026', 'Administrateur Principal', 'admin', 'admin'
    );
  end if;
end $$;

do $$
declare
  v_worker_auth_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'mounir@club.dz') then
    v_worker_auth_id := public.create_auth_user(
      'mounir@club.dz', 'Mounir#2026', 'Mounir Saidi', 'mounir', 'worker'
    );
    update public.workers set auth_user_id = v_worker_auth_id where id = 'wk_1';
  end if;
end $$;

-- =============================================================================
--  DONE.
--
--  Seeded accounts (change the passwords after first login!):
--    Admin  → username: admin   / email: admin@orangefc.dz   / password: Admin#2026
--    Worker → username: mounir  / email: mounir@club.dz      / password: Mounir#2026
--             (Mounir has permissions for: dashboard, players, parents, subscriptions)
--
--  Remember: Authentication → Providers → Email → turn OFF "Confirm email".
-- =============================================================================
