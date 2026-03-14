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
