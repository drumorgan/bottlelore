// THE ONLY FILE THAT IMPORTS SUPABASE
// No other file may import @supabase/supabase-js or call createClient

import { createClient } from '@supabase/supabase-js';
import * as _logger from './logger.js'; // eslint-disable-line no-unused-vars
import { TABLES } from './database-tables.js';

let _client = null;

function getClient() {
  if (_client) return _client;

  const config = window.APP_CONFIG?.supabase;
  if (!config?.url || !config?.anonKey) {
    throw new Error('Supabase config missing from APP_CONFIG');
  }

  // Keep auth config minimal — Safari/iPad ITP compatibility
  _client = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getClient().auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await getClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await getClient().auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthStateChange(callback) {
  return getClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// ── Bootstrap / Super Admin ───────────────────────────────────────────────────

export async function checkIsSuperAdmin() {
  const { data, error } = await getClient().rpc('is_super_admin');
  if (error) throw error;
  return data;
}

// ── Wineries ──────────────────────────────────────────────────────────────────

export async function getWineryBySlug(slug) {
  const { data, error } = await getClient()
    .from(TABLES.WINERIES)
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllWineries() {
  const { data, error } = await getClient()
    .from(TABLES.WINERIES)
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createWinery(wineryData) {
  const { data, error } = await getClient()
    .from(TABLES.WINERIES)
    .insert(wineryData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWinery(id, wineryData) {
  const { data, error } = await getClient()
    .from(TABLES.WINERIES)
    .update(wineryData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleWineryActive(id, isActive) {
  return updateWinery(id, { is_active: isActive });
}

// ── Wines ─────────────────────────────────────────────────────────────────────

export async function getWineById(id) {
  const { data, error } = await getClient()
    .from(TABLES.WINES)
    .select('*, wineries(name, slug)')
    .eq('id', id)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}

export async function getWinesByWinery(wineryId) {
  const { data, error } = await getClient()
    .from(TABLES.WINES)
    .select('*')
    .eq('winery_id', wineryId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createWine(wineData) {
  const { data, error } = await getClient()
    .from(TABLES.WINES)
    .insert(wineData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWine(id, wineData) {
  const { data, error } = await getClient()
    .from(TABLES.WINES)
    .update(wineData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleWineActive(id, isActive) {
  return updateWine(id, { is_active: isActive });
}

// ── Flights ──────────────────────────────────────────────────────────────────

/**
 * Public fetch: active flight with its active wines and winery info.
 */
export async function getPublicFlightById(id) {
  const { data, error } = await getClient()
    .from(TABLES.FLIGHTS)
    .select('*, wineries(name, slug), flight_wines(sort_order, wines(id, name, varietal, vintage_year, price, description, tasting_notes, food_pairings, image_url, is_active))')
    .eq('id', id)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Public fetch: active wines for a winery, plus active flights.
 */
export async function getPublicWineryData(slug) {
  const winery = await getWineryBySlug(slug);

  const [{ data: wines, error: wErr }, { data: flights, error: fErr }] = await Promise.all([
    getClient()
      .from(TABLES.WINES)
      .select('id, name, varietal, vintage_year, price, image_url')
      .eq('winery_id', winery.id)
      .eq('is_active', true)
      .order('name'),
    getClient()
      .from(TABLES.FLIGHTS)
      .select('id, name, description, flight_wines(wine_id)')
      .eq('winery_id', winery.id)
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  if (wErr) throw wErr;
  if (fErr) throw fErr;

  return { winery, wines, flights };
}

export async function getFlightsByWinery(wineryId) {
  const { data, error } = await getClient()
    .from(TABLES.FLIGHTS)
    .select('*, flight_wines(wine_id)')
    .eq('winery_id', wineryId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function getFlightById(id) {
  const { data, error } = await getClient()
    .from(TABLES.FLIGHTS)
    .select('*, flight_wines(id, wine_id, sort_order, wines(id, name, varietal, is_active))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createFlight(flightData) {
  const { data, error } = await getClient()
    .from(TABLES.FLIGHTS)
    .insert(flightData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFlight(id, flightData) {
  const { data, error } = await getClient()
    .from(TABLES.FLIGHTS)
    .update(flightData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleFlightActive(id, isActive) {
  return updateFlight(id, { is_active: isActive });
}

export async function setFlightWines(flightId, wineIds) {
  // Remove existing wines for this flight
  const { error: delErr } = await getClient()
    .from(TABLES.FLIGHT_WINES)
    .delete()
    .eq('flight_id', flightId);
  if (delErr) throw delErr;

  if (wineIds.length === 0) return [];

  // Insert new set with sort_order
  const rows = wineIds.map((wineId, i) => ({
    flight_id: flightId,
    wine_id: wineId,
    sort_order: i,
  }));
  const { data, error } = await getClient()
    .from(TABLES.FLIGHT_WINES)
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAdminWinery(userId) {
  const { data, error } = await getClient()
    .from(TABLES.WINERY_ADMINS)
    .select('*, wineries(*)')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Returns { role, winery_id } for the given user, or null if no row exists.
 */
export async function getUserRole(userId) {
  const { data, error } = await getClient()
    .from(TABLES.WINERY_ADMINS)
    .select('role, winery_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * All wineries (including inactive) for super admin management.
 */
export async function getAllWineriesAdmin() {
  const { data, error } = await getClient()
    .from(TABLES.WINERIES)
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

// ── Staff ─────────────────────────────────────────────────────────────────────

/**
 * Get staff list for a winery via the get_winery_staff DB function.
 * Returns [{ admin_id, user_id, email, role, created_at }].
 */
export async function getWineryStaff(wineryId) {
  const { data, error } = await getClient()
    .rpc('get_winery_staff', { target_winery_id: wineryId });
  if (error) throw error;
  return data;
}

/**
 * Invite a user to a winery via the invite-user Edge Function.
 */
export async function inviteUser(email, wineryId, role) {
  const { data, error } = await getClient()
    .functions.invoke('invite-user', {
      body: { email, winery_id: wineryId, role },
    });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Update a winery admin's role (e.g. promote staff → owner).
 * @param {string} adminId — winery_admins row ID
 * @param {string} newRole — 'owner' or 'staff'
 */
export async function updateWineryAdminRole(adminId, newRole) {
  const { error } = await getClient()
    .from(TABLES.WINERY_ADMINS)
    .update({ role: newRole })
    .eq('id', adminId);
  if (error) throw error;
}

/**
 * Remove a winery admin by their winery_admins row ID.
 */
export async function removeWineryAdmin(adminId) {
  const { error } = await getClient()
    .from(TABLES.WINERY_ADMINS)
    .delete()
    .eq('id', adminId);
  if (error) throw error;
}

// ── Storage ──────────────────────────────────────────────────────────────────

/**
 * Upload an image to Supabase Storage.
 * @param {string} bucket — storage bucket name (e.g. 'wine-images', 'winery-logos')
 * @param {string} path — file path within the bucket (e.g. 'w1/photo.jpg')
 * @param {File} file — the File object to upload
 * @returns {string} — the public URL of the uploaded file
 */
export async function uploadImage(bucket, path, file) {
  const { error } = await getClient()
    .storage.from(bucket)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return getPublicUrl(bucket, path);
}

/**
 * Get the public URL for a file in Supabase Storage.
 */
export function getPublicUrl(bucket, path) {
  const { data } = getClient()
    .storage.from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
}
