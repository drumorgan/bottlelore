-- ============================================================================
-- BottleLore Phase 3 — Supabase Database Schema
-- ============================================================================
-- Run each step separately in the Supabase SQL Editor.
-- Verify after each step before moving to the next.
-- ============================================================================


-- ============================================================================
-- STEP 1: Create tables
-- ============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Wineries
create table public.wineries (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);

-- Wines
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
    is_active      boolean not null default true,
    created_at     timestamptz not null default now()
);

-- Winery admins (links auth users to a winery)
create table public.winery_admins (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    winery_id   uuid not null references public.wineries(id) on delete cascade,
    role        text not null default 'staff' check (role in ('owner', 'staff')),
    created_at  timestamptz not null default now(),
    unique(user_id, winery_id)
);


-- ============================================================================
-- STEP 2: Enable Row Level Security
-- ============================================================================

alter table public.wineries       enable row level security;
alter table public.wines          enable row level security;
alter table public.winery_admins  enable row level security;


-- ============================================================================
-- STEP 3: RLS Policies
-- ============================================================================

-- ── Wineries ────────────────────────────────────────────────────────────────

-- Anyone can read active wineries (needed for public bottle page)
create policy "Public can view active wineries"
    on public.wineries for select
    using (is_active = true);

-- Admins can update their own winery
create policy "Admins can update own winery"
    on public.wineries for update
    using (
        exists (
            select 1 from public.winery_admins
            where winery_admins.winery_id = wineries.id
              and winery_admins.user_id = auth.uid()
        )
    );

-- ── Wines ────────────────────────────────────────────────────────────────────

-- Anyone can read active wines (the QR scan page is public)
create policy "Public can view active wines"
    on public.wines for select
    using (is_active = true);

-- Admins can insert wines for their winery only
create policy "Admins can insert wines for own winery"
    on public.wines for insert
    with check (
        exists (
            select 1 from public.winery_admins
            where winery_admins.winery_id = wines.winery_id
              and winery_admins.user_id = auth.uid()
        )
    );

-- Admins can update wines for their winery only
create policy "Admins can update wines for own winery"
    on public.wines for update
    using (
        exists (
            select 1 from public.winery_admins
            where winery_admins.winery_id = wines.winery_id
              and winery_admins.user_id = auth.uid()
        )
    );

-- ── Winery Admins ─────────────────────────────────────────────────────────────

-- Users can only read their own admin row
create policy "Admins can read own row"
    on public.winery_admins for select
    using (user_id = auth.uid());


-- ============================================================================
-- STEP 4: Seed test data
-- ============================================================================

-- Insert a test winery
insert into public.wineries (slug, name)
values ('test-winery', 'Test Winery');

-- Insert two test wines
insert into public.wines (
    winery_id,
    name,
    varietal,
    vintage_year,
    region,
    description,
    tasting_notes,
    price,
    food_pairings
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
    ARRAY['Grilled ribeye', 'Aged cheddar', 'Lamb chops']
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
    ARRAY['Pan-seared halibut', 'Brie', 'Roasted chicken']
);


-- ============================================================================
-- STEP 5: Verify public access works
-- ============================================================================

-- Run this as an unauthenticated check (should return both wines)
select
    w.name,
    w.varietal,
    w.vintage_year,
    w.price,
    wn.name as winery_name,
    wn.slug as winery_slug
from public.wines w
join public.wineries wn on wn.id = w.winery_id
where w.is_active = true;
