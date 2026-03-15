-- ============================================================================
-- Migration: Storage Buckets for Image Upload
-- ============================================================================
-- Creates Supabase Storage buckets for wine photos and winery logos,
-- with RLS policies for public read and authenticated upload.
--
-- Run in the Supabase SQL Editor after enabling Storage in your project.
-- ============================================================================


-- ============================================================================
-- STEP 1: Create storage buckets
-- ============================================================================
-- NOTE: You can also create these via the Supabase Dashboard → Storage.
-- If you prefer the dashboard, create two PUBLIC buckets named exactly
-- "wine-images" and "winery-logos", then skip to Step 2.

insert into storage.buckets (id, name, public)
values
  ('wine-images', 'wine-images', true),
  ('winery-logos', 'winery-logos', true);


-- ============================================================================
-- STEP 2: Public read access (both buckets)
-- ============================================================================
-- Guests (anon) need to view images on the bottle page without auth.
-- The buckets are marked public, but we still need SELECT policies.

create policy "Anyone can view wine images"
  on storage.objects for select
  using (bucket_id = 'wine-images');

create policy "Anyone can view winery logos"
  on storage.objects for select
  using (bucket_id = 'winery-logos');


-- ============================================================================
-- STEP 3: Authenticated upload — wine images
-- ============================================================================
-- Super admins can upload to any path.
-- Winery admins can upload only under their winery's folder (winery_id/).

create policy "Super admin can upload wine images"
  on storage.objects for insert
  with check (
    bucket_id = 'wine-images'
    and public.is_super_admin()
  );

create policy "Winery admins can upload own wine images"
  on storage.objects for insert
  with check (
    bucket_id = 'wine-images'
    and public.is_winery_admin((storage.foldername(name))[1]::uuid)
  );

-- Upsert requires UPDATE as well
create policy "Super admin can update wine images"
  on storage.objects for update
  using (
    bucket_id = 'wine-images'
    and public.is_super_admin()
  );

create policy "Winery admins can update own wine images"
  on storage.objects for update
  using (
    bucket_id = 'wine-images'
    and public.is_winery_admin((storage.foldername(name))[1]::uuid)
  );


-- ============================================================================
-- STEP 4: Authenticated upload — winery logos
-- ============================================================================

create policy "Super admin can upload winery logos"
  on storage.objects for insert
  with check (
    bucket_id = 'winery-logos'
    and public.is_super_admin()
  );

create policy "Winery admins can upload own logo"
  on storage.objects for insert
  with check (
    bucket_id = 'winery-logos'
    and public.is_winery_admin((storage.foldername(name))[1]::uuid)
  );

create policy "Super admin can update winery logos"
  on storage.objects for update
  using (
    bucket_id = 'winery-logos'
    and public.is_super_admin()
  );

create policy "Winery admins can update own logo"
  on storage.objects for update
  using (
    bucket_id = 'winery-logos'
    and public.is_winery_admin((storage.foldername(name))[1]::uuid)
  );


-- ============================================================================
-- STEP 5: Delete policies (optional — for replacing images)
-- ============================================================================

create policy "Super admin can delete wine images"
  on storage.objects for delete
  using (
    bucket_id = 'wine-images'
    and public.is_super_admin()
  );

create policy "Winery admins can delete own wine images"
  on storage.objects for delete
  using (
    bucket_id = 'wine-images'
    and public.is_winery_admin((storage.foldername(name))[1]::uuid)
  );

create policy "Super admin can delete winery logos"
  on storage.objects for delete
  using (
    bucket_id = 'winery-logos'
    and public.is_super_admin()
  );

create policy "Winery admins can delete own logo"
  on storage.objects for delete
  using (
    bucket_id = 'winery-logos'
    and public.is_winery_admin((storage.foldername(name))[1]::uuid)
  );


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running, confirm the buckets exist:
select id, name, public from storage.buckets
where id in ('wine-images', 'winery-logos');
