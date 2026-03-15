import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../assets/js/supabase-gateway.js', () => ({
  signOut: vi.fn().mockResolvedValue(),
}));

vi.mock('../assets/js/router.js', () => ({
  navigate: vi.fn(),
}));

import { renderAdminNav } from '../assets/js/components/admin-nav.js';
import * as state from '../assets/js/state.js';
import { navigate } from '../assets/js/router.js';

describe('admin-nav', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    state.resetAllState();
    vi.clearAllMocks();
  });

  // ── Role-based navigation ─────────────────────────────────────────────

  describe('role-based nav items', () => {
    it('shows super admin nav items', () => {
      state.setUserRole('super_admin');
      state.setCurrentWinery({ id: 'w1', name: 'Test Winery' });

      renderAdminNav(container);

      expect(container.innerHTML).toContain('Wineries');
      expect(container.innerHTML).toContain('Wines');
      expect(container.innerHTML).toContain('Flights');
      expect(container.innerHTML).toContain('Staff');
    });

    it('shows owner nav items (no Wineries, has Winery Profile)', () => {
      state.setUserRole('owner');
      state.setCurrentWinery({ id: 'w1', name: 'My Winery' });

      renderAdminNav(container);

      expect(container.innerHTML).toContain('Winery Profile');
      expect(container.innerHTML).toContain('Wines');
      expect(container.innerHTML).toContain('Flights');
      expect(container.innerHTML).toContain('Staff');
      // Should not have Wineries list link
      expect(container.querySelector('[data-nav-path="/admin/wineries"]')).toBeNull();
    });

    it('shows staff nav items (only Wines and Flights)', () => {
      state.setUserRole('staff');
      state.setCurrentWinery({ id: 'w1', name: 'Staff Winery' });

      renderAdminNav(container);

      expect(container.innerHTML).toContain('Wines');
      expect(container.innerHTML).toContain('Flights');
      expect(container.querySelector('[data-nav-path="/admin/staff"]')).toBeNull();
      expect(container.querySelector('[data-nav-path="/admin/winery/profile"]')).toBeNull();
    });
  });

  // ── Role badge ────────────────────────────────────────────────────────

  describe('role badge', () => {
    it('shows Super Admin badge', () => {
      state.setUserRole('super_admin');
      state.setCurrentWinery({ id: 'w1', name: 'Test' });

      renderAdminNav(container);

      expect(container.innerHTML).toContain('Super Admin');
      expect(container.innerHTML).toContain('badge--super');
    });

    it('shows Owner badge', () => {
      state.setUserRole('owner');
      state.setCurrentWinery({ id: 'w1', name: 'Test' });

      renderAdminNav(container);

      expect(container.innerHTML).toContain('Owner');
      expect(container.innerHTML).toContain('badge--owner');
    });

    it('shows Staff badge', () => {
      state.setUserRole('staff');
      state.setCurrentWinery({ id: 'w1', name: 'Test' });

      renderAdminNav(container);

      expect(container.innerHTML).toContain('Staff');
      expect(container.innerHTML).toContain('badge--staff');
    });
  });

  // ── Content wrapper ───────────────────────────────────────────────────

  it('returns the content wrapper element', () => {
    state.setUserRole('staff');
    state.setCurrentWinery({ id: 'w1', name: 'Test' });

    const content = renderAdminNav(container);

    expect(content).not.toBeNull();
    expect(content.id).toBe('admin-content');
  });

  // ── Winery name display ───────────────────────────────────────────────

  it('displays winery name for non-super-admin roles', () => {
    state.setUserRole('owner');
    state.setCurrentWinery({ id: 'w1', name: 'Sunset Vineyard' });

    renderAdminNav(container);

    expect(container.innerHTML).toContain('Sunset Vineyard');
  });

  // ── Winery switcher for super admin ───────────────────────────────────

  it('shows winery switcher dropdown for super admin with winery list', () => {
    state.setUserRole('super_admin');
    state.setCurrentWinery({ id: 'w1', name: 'Winery A' });
    state.setAdminWineryList([
      { id: 'w1', name: 'Winery A' },
      { id: 'w2', name: 'Winery B' },
    ]);

    renderAdminNav(container);

    const switcher = container.querySelector('#winery-switcher');
    expect(switcher).not.toBeNull();
    expect(switcher.tagName).toBe('SELECT');
    expect(switcher.options.length).toBe(2);
  });

  it('does not show switcher for non-super-admin', () => {
    state.setUserRole('owner');
    state.setCurrentWinery({ id: 'w1', name: 'Test' });

    renderAdminNav(container);

    expect(container.querySelector('#winery-switcher')).toBeNull();
  });

  // ── Navigation links ──────────────────────────────────────────────────

  it('navigates on link click', () => {
    state.setUserRole('staff');
    state.setCurrentWinery({ id: 'w1', name: 'Test' });

    renderAdminNav(container);

    const wineLink = container.querySelector('[data-nav-path="/admin/wines"]');
    wineLink.click();

    expect(navigate).toHaveBeenCalledWith('/admin/wines');
  });

  // ── Sign out ──────────────────────────────────────────────────────────

  it('has a sign out button', () => {
    state.setUserRole('staff');
    state.setCurrentWinery({ id: 'w1', name: 'Test' });

    renderAdminNav(container);

    const signOutBtn = container.querySelector('#admin-signout-btn');
    expect(signOutBtn).not.toBeNull();
    expect(signOutBtn.textContent).toBe('Sign Out');
  });

  // ── Escapes winery name ───────────────────────────────────────────────

  it('escapes HTML in winery name', () => {
    state.setUserRole('owner');
    state.setCurrentWinery({ id: 'w1', name: '<script>xss</script>' });

    renderAdminNav(container);

    expect(container.innerHTML).not.toContain('<script>xss</script>');
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });
});
