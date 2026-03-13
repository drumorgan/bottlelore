-- ============================================================================
-- BottleLore — Complete Supabase Database Schema
-- ============================================================================
-- Run each step separately in the Supabase SQL Editor.
-- Verify after each step before moving to the next.
-- ============================================================================


-- ============================================================================
-- STEP 1: Create tables
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ── Super Admins ────────────────────────────────────────────────────────────
-- Platform-level admins (you). Separate from winery roles.
-- After running this migration, INSERT your own auth.users id here.

create table public.super_admins (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null unique references auth.users(id) on delete cascade,
    created_at  timestamptz not null default now()
);


-- ── Wineries ────────────────────────────────────────────────────────────────

create table public.wineries (
    id              uuid primary key default gen_random_uuid(),
    slug            text not null unique,
    name            text not null,
    description     text,
    logo_url        text,
    location        text,
    website_url     text,
    phone           text,
    hours           text,
    social_facebook text,
    social_instagram text,
    social_twitter  text,
    is_active       boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);


-- ── Wines ────────────────────────────────────────────────────────────────────

create table public.wines (
    id             uuid primary key default gen_random_uuid(),
    winery_id      uuid not null references public.wineries(id) on delete cascade,
    name           text not null,
    varietal       text,
    vintage_year   integer,
    region         text,
    description    text,
    tasting_notes  text,
    price          text,
    food_pairings  text[],
    image_url      text,
    sort_order     integer not null default 0,
    is_active      boolean not null default true,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);


-- ── Flights ──────────────────────────────────────────────────────────────────

create table public.flights (
    id          uuid primary key default gen_random_uuid(),
    winery_id   uuid not null references public.wineries(id) on delete cascade,
    name        text not null,
    description text,
    sort_order  integer not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);


-- ── Flight Wines (join table) ────────────────────────────────────────────────

create table public.flight_wines (
    id          uuid primary key default gen_random_uuid(),
    flight_id   uuid not null references public.flights(id) on delete cascade,
    wine_id     uuid not null references public.wines(id) on delete cascade,
    sort_order  integer not null default 0,
    unique(flight_id, wine_id)
);


-- ── Winery Admins ────────────────────────────────────────────────────────────
-- Links auth users to wineries with a role.
-- 'owner' = full control of their winery (profile, wines, flights, staff)
-- 'staff' = manage wines and flights only

create table public.winery_admins (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    winery_id   uuid not null references public.wineries(id) on delete cascade,
    role        text not null default 'staff' check (role in ('owner', 'staff')),
    created_at  timestamptz not null default now(),
    unique(user_id, winery_id)
);


-- ============================================================================
-- STEP 2: Auto-update updated_at triggers
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.wineries
    for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.wines
    for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.flights
    for each row execute function public.handle_updated_at();


-- ============================================================================
-- STEP 3: Helper function — is the current user a super admin?
-- ============================================================================

create or replace function public.is_super_admin()
returns boolean as $$
begin
    return exists (
        select 1 from public.super_admins
        where user_id = auth.uid()
    );
end;
$$ language plpgsql security definer stable;


-- ============================================================================
-- STEP 4: Helper function — does the current user admin a specific winery?
-- ============================================================================

create or replace function public.is_winery_admin(check_winery_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.winery_admins
        where winery_id = check_winery_id
          and user_id = auth.uid()
    );
end;
$$ language plpgsql security definer stable;


-- ============================================================================
-- STEP 5: Helper — is the current user an OWNER of a specific winery?
-- ============================================================================

create or replace function public.is_winery_owner(check_winery_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.winery_admins
        where winery_id = check_winery_id
          and user_id = auth.uid()
          and role = 'owner'
    );
end;
$$ language plpgsql security definer stable;


-- ============================================================================
-- STEP 6: Enable Row Level Security
-- ============================================================================

alter table public.super_admins   enable row level security;
alter table public.wineries       enable row level security;
alter table public.wines          enable row level security;
alter table public.flights        enable row level security;
alter table public.flight_wines   enable row level security;
alter table public.winery_admins  enable row level security;


-- ============================================================================
-- STEP 7: RLS Policies — Super Admins table
-- ============================================================================

-- Only super admins can read the super_admins table
create policy "Super admins can read own row"
    on public.super_admins for select
    using (user_id = auth.uid());


-- ============================================================================
-- STEP 8: RLS Policies — Wineries
-- ============================================================================

-- Guests see active wineries
create policy "Public can view active wineries"
    on public.wineries for select
    using (is_active = true);

-- Super admin sees ALL wineries (including inactive)
create policy "Super admin can view all wineries"
    on public.wineries for select
    using (public.is_super_admin());

-- Winery admins see their own winery (even if inactive)
create policy "Winery admins can view own winery"
    on public.wineries for select
    using (public.is_winery_admin(id));

-- Super admin can create wineries
create policy "Super admin can create wineries"
    on public.wineries for insert
    with check (public.is_super_admin());

-- Super admin can update any winery
create policy "Super admin can update any winery"
    on public.wineries for update
    using (public.is_super_admin());

-- Winery OWNERS can update their own winery profile
create policy "Winery owners can update own winery"
    on public.wineries for update
    using (public.is_winery_owner(id));


-- ============================================================================
-- STEP 9: RLS Policies — Wines
-- ============================================================================

-- Guests see active wines
create policy "Public can view active wines"
    on public.wines for select
    using (is_active = true);

-- Super admin sees all wines
create policy "Super admin can view all wines"
    on public.wines for select
    using (public.is_super_admin());

-- Winery admins see all their wines (including inactive)
create policy "Winery admins can view own wines"
    on public.wines for select
    using (public.is_winery_admin(winery_id));

-- Super admin can insert wines for any winery
create policy "Super admin can insert wines"
    on public.wines for insert
    with check (public.is_super_admin());

-- Winery admins (owner or staff) can insert wines for their winery
create policy "Winery admins can insert wines for own winery"
    on public.wines for insert
    with check (public.is_winery_admin(winery_id));

-- Super admin can update any wine
create policy "Super admin can update any wine"
    on public.wines for update
    using (public.is_super_admin());

-- Winery admins can update their own wines
create policy "Winery admins can update own wines"
    on public.wines for update
    using (public.is_winery_admin(winery_id));


-- ============================================================================
-- STEP 10: RLS Policies — Flights
-- ============================================================================

-- Guests see active flights
create policy "Public can view active flights"
    on public.flights for select
    using (is_active = true);

-- Super admin sees all flights
create policy "Super admin can view all flights"
    on public.flights for select
    using (public.is_super_admin());

-- Winery admins see all their flights (including inactive)
create policy "Winery admins can view own flights"
    on public.flights for select
    using (public.is_winery_admin(winery_id));

-- Super admin can insert flights
create policy "Super admin can insert flights"
    on public.flights for insert
    with check (public.is_super_admin());

-- Winery admins can insert flights for their winery
create policy "Winery admins can insert flights for own winery"
    on public.flights for insert
    with check (public.is_winery_admin(winery_id));

-- Super admin can update any flight
create policy "Super admin can update any flight"
    on public.flights for update
    using (public.is_super_admin());

-- Winery admins can update their own flights
create policy "Winery admins can update own flights"
    on public.flights for update
    using (public.is_winery_admin(winery_id));


-- ============================================================================
-- STEP 11: RLS Policies — Flight Wines (join table)
-- ============================================================================

-- Guests can see wines in active flights (via join to active flight)
create policy "Public can view wines in active flights"
    on public.flight_wines for select
    using (
        exists (
            select 1 from public.flights
            where flights.id = flight_wines.flight_id
              and flights.is_active = true
        )
    );

-- Super admin sees all flight_wines
create policy "Super admin can view all flight wines"
    on public.flight_wines for select
    using (public.is_super_admin());

-- Winery admins see their flight_wines
create policy "Winery admins can view own flight wines"
    on public.flight_wines for select
    using (
        exists (
            select 1 from public.flights
            where flights.id = flight_wines.flight_id
              and public.is_winery_admin(flights.winery_id)
        )
    );

-- Super admin can add wines to any flight
create policy "Super admin can insert flight wines"
    on public.flight_wines for insert
    with check (public.is_super_admin());

-- Winery admins can add wines to their flights
create policy "Winery admins can insert own flight wines"
    on public.flight_wines for insert
    with check (
        exists (
            select 1 from public.flights
            where flights.id = flight_wines.flight_id
              and public.is_winery_admin(flights.winery_id)
        )
    );

-- Super admin can remove wines from any flight
create policy "Super admin can delete flight wines"
    on public.flight_wines for delete
    using (public.is_super_admin());

-- Winery admins can remove wines from their flights
create policy "Winery admins can delete own flight wines"
    on public.flight_wines for delete
    using (
        exists (
            select 1 from public.flights
            where flights.id = flight_wines.flight_id
              and public.is_winery_admin(flights.winery_id)
        )
    );


-- ============================================================================
-- STEP 12: RLS Policies — Winery Admins
-- ============================================================================

-- Users can read their own admin row (to know which winery they belong to)
create policy "Users can read own admin row"
    on public.winery_admins for select
    using (user_id = auth.uid());

-- Super admin can read all admin rows
create policy "Super admin can read all admin rows"
    on public.winery_admins for select
    using (public.is_super_admin());

-- Winery owners can see other admins of their winery
create policy "Winery owners can view own winery admins"
    on public.winery_admins for select
    using (
        exists (
            select 1 from public.winery_admins wa
            where wa.winery_id = winery_admins.winery_id
              and wa.user_id = auth.uid()
              and wa.role = 'owner'
        )
    );

-- Super admin can create winery admin links
create policy "Super admin can create winery admins"
    on public.winery_admins for insert
    with check (public.is_super_admin());

-- Winery owners can add staff to their winery
create policy "Winery owners can add staff"
    on public.winery_admins for insert
    with check (
        exists (
            select 1 from public.winery_admins wa
            where wa.winery_id = winery_admins.winery_id
              and wa.user_id = auth.uid()
              and wa.role = 'owner'
        )
    );

-- Super admin can update winery admin roles
create policy "Super admin can update winery admins"
    on public.winery_admins for update
    using (public.is_super_admin());

-- Super admin can remove winery admins
create policy "Super admin can delete winery admins"
    on public.winery_admins for delete
    using (public.is_super_admin());

-- Winery owners can remove staff from their winery (but not themselves)
create policy "Winery owners can remove staff"
    on public.winery_admins for delete
    using (
        exists (
            select 1 from public.winery_admins wa
            where wa.winery_id = winery_admins.winery_id
              and wa.user_id = auth.uid()
              and wa.role = 'owner'
        )
        and winery_admins.user_id != auth.uid()
    );


-- ============================================================================
-- STEP 13: Indexes for performance
-- ============================================================================

create index idx_wines_winery_id on public.wines(winery_id);
create index idx_wines_active on public.wines(is_active) where is_active = true;
create index idx_flights_winery_id on public.flights(winery_id);
create index idx_flights_active on public.flights(is_active) where is_active = true;
create index idx_flight_wines_flight_id on public.flight_wines(flight_id);
create index idx_flight_wines_wine_id on public.flight_wines(wine_id);
create index idx_winery_admins_user_id on public.winery_admins(user_id);
create index idx_winery_admins_winery_id on public.winery_admins(winery_id);
create index idx_wineries_slug on public.wineries(slug);
create index idx_wineries_active on public.wineries(is_active) where is_active = true;


-- ============================================================================
-- STEP 14: Supabase Edge Function — Invite winery user (account creation)
-- ============================================================================
-- This is a database function that super admins or winery owners call
-- from the admin UI. It uses Supabase's auth.admin API via a server-side
-- function. The JS gateway will call supabase.auth.admin.inviteUserByEmail()
-- for the actual invite, then this function links them to the winery.
--
-- The FLOW from the admin UI:
--   1. Super admin enters email + picks winery + picks role
--   2. JS calls supabase.auth.admin.inviteUserByEmail(email)
--   3. That returns the new user's id
--   4. JS calls this function to link user → winery
--   5. New user gets an email, clicks link, sets password
--
-- NOTE: supabase.auth.admin.inviteUserByEmail() requires the service_role
-- key. This must be called from a Supabase Edge Function or server-side,
-- NEVER from the browser. The admin UI will call an Edge Function endpoint.

create or replace function public.link_user_to_winery(
    target_user_id uuid,
    target_winery_id uuid,
    target_role text default 'staff'
)
returns uuid as $$
declare
    new_id uuid;
begin
    -- Only super admins and winery owners can call this
    if not public.is_super_admin() and not public.is_winery_owner(target_winery_id) then
        raise exception 'Unauthorized';
    end if;

    -- Owners can only add staff, not other owners
    if not public.is_super_admin() and target_role = 'owner' then
        raise exception 'Only super admins can assign owner role';
    end if;

    insert into public.winery_admins (user_id, winery_id, role)
    values (target_user_id, target_winery_id, target_role)
    returning id into new_id;

    return new_id;
end;
$$ language plpgsql security definer;


-- ============================================================================
-- STEP 15: Seed test data
-- ============================================================================

-- Insert a test winery with full profile
insert into public.wineries (slug, name, description, location, website_url, phone, hours)
values (
    'test-winery',
    'Test Winery',
    'A beautiful family-owned winery in the heart of Napa Valley.',
    'Napa Valley, CA',
    'https://example.com',
    '(707) 555-0123',
    'Daily 10am–5pm'
);

-- Insert test wines
insert into public.wines (
    winery_id, name, varietal, vintage_year, region,
    description, tasting_notes, price, food_pairings, sort_order
)
values
(
    (select id from public.wineries where slug = 'test-winery'),
    'Estate Cabernet Sauvignon',
    'Cabernet Sauvignon',
    2021,
    'Napa Valley',
    'A bold, full-bodied red from our hillside estate block, aged 18 months in French oak.',
    'Dark cherry, cassis, and cedar on the nose. Structured tannins with a long, silky finish.',
    '$58 / bottle',
    ARRAY['Grilled ribeye', 'Aged cheddar', 'Lamb chops'],
    1
),
(
    (select id from public.wineries where slug = 'test-winery'),
    'Reserve Chardonnay',
    'Chardonnay',
    2022,
    'Russian River Valley',
    'Whole-cluster pressed and barrel fermented in neutral French oak for an elegant, restrained style.',
    'Lemon curd, toasted brioche, and subtle vanilla. Bright acidity with a creamy mid-palate.',
    '$42 / bottle',
    ARRAY['Pan-seared halibut', 'Brie', 'Roasted chicken'],
    2
),
(
    (select id from public.wineries where slug = 'test-winery'),
    'Rosé of Pinot Noir',
    'Pinot Noir',
    2023,
    'Sonoma Coast',
    'A pale, Provençal-style rosé with bright fruit and refreshing acidity.',
    'Watermelon, white peach, and a hint of dried herbs. Crisp and dry with a mineral finish.',
    '$28 / bottle',
    ARRAY['Caprese salad', 'Grilled shrimp', 'Goat cheese'],
    3
);

-- Insert a test flight
insert into public.flights (winery_id, name, description, sort_order)
values (
    (select id from public.wineries where slug = 'test-winery'),
    'Summer Tasting Flight',
    'A curated selection of our favorite warm-weather wines.',
    1
);

-- Add wines to the flight
insert into public.flight_wines (flight_id, wine_id, sort_order)
values
(
    (select id from public.flights where name = 'Summer Tasting Flight'),
    (select id from public.wines where name = 'Reserve Chardonnay'),
    1
),
(
    (select id from public.flights where name = 'Summer Tasting Flight'),
    (select id from public.wines where name = 'Rosé of Pinot Noir'),
    2
);


-- ============================================================================
-- STEP 16: Verify everything works
-- ============================================================================

-- Public view: active wines with winery info
select
    w.name as wine,
    w.varietal,
    w.vintage_year,
    w.price,
    wn.name as winery,
    wn.slug,
    wn.location
from public.wines w
join public.wineries wn on wn.id = w.winery_id
where w.is_active = true
order by w.sort_order;

-- Public view: active flights with their wines
select
    f.name as flight,
    f.description as flight_desc,
    w.name as wine,
    w.varietal,
    fw.sort_order
from public.flights f
join public.flight_wines fw on fw.flight_id = f.id
join public.wines w on w.id = fw.wine_id
where f.is_active = true
order by f.sort_order, fw.sort_order;


-- ============================================================================
-- POST-SETUP: Register yourself as super admin
-- ============================================================================
-- After you create your Supabase auth account and sign in once,
-- run this with your actual auth.users id:
--
--   insert into public.super_admins (user_id)
--   values ('YOUR-AUTH-USER-UUID-HERE');
--
-- This is a one-time setup step. After this, you can do everything
-- else from the admin UI.
-- ============================================================================
