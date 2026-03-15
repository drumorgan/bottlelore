import { describe, it, expect, beforeEach } from 'vitest';
import * as state from '../assets/js/state.js';

beforeEach(() => {
  state.resetAllState();
});

// ── User ────────────────────────────────────────────────────────────────────

describe('user state', () => {
  it('starts with no current user', () => {
    expect(state.getCurrentUser()).toBeNull();
    expect(state.isLoggedIn()).toBe(false);
  });

  it('sets and gets current user', () => {
    const user = { id: 'u1', email: 'test@test.com' };
    state.setCurrentUser(user);
    expect(state.getCurrentUser()).toEqual(user);
    expect(state.isLoggedIn()).toBe(true);
  });
});

// ── Super Admin ─────────────────────────────────────────────────────────────

describe('super admin state', () => {
  it('defaults to false', () => {
    expect(state.isSuperAdmin()).toBe(false);
  });

  it('sets super admin flag', () => {
    state.setSuperAdmin(true);
    expect(state.isSuperAdmin()).toBe(true);
  });
});

// ── Role ────────────────────────────────────────────────────────────────────

describe('role state', () => {
  it('defaults to null', () => {
    expect(state.getUserRole()).toBeNull();
  });

  it('sets and gets role', () => {
    state.setUserRole('owner');
    expect(state.getUserRole()).toBe('owner');
  });
});

// ── Winery ──────────────────────────────────────────────────────────────────

describe('winery state', () => {
  it('defaults to null', () => {
    expect(state.getCurrentWinery()).toBeNull();
  });

  it('sets and gets winery', () => {
    const winery = { id: 'w1', name: 'Test Winery', slug: 'test-winery' };
    state.setCurrentWinery(winery);
    expect(state.getCurrentWinery()).toEqual(winery);
  });
});

// ── Wines ───────────────────────────────────────────────────────────────────

describe('wines state', () => {
  const wines = [
    { id: 'wine-1', name: 'Merlot' },
    { id: 'wine-2', name: 'Chardonnay' },
  ];

  it('defaults to empty array', () => {
    expect(state.getWines()).toEqual([]);
  });

  it('sets wines and builds index', () => {
    state.setWines(wines);
    expect(state.getWines()).toEqual(wines);
    expect(state.getWineById('wine-1')).toEqual(wines[0]);
    expect(state.getWineById('wine-2')).toEqual(wines[1]);
  });

  it('returns null for unknown wine id', () => {
    state.setWines(wines);
    expect(state.getWineById('nonexistent')).toBeNull();
  });
});

// ── Flights ─────────────────────────────────────────────────────────────────

describe('flights state', () => {
  const flights = [
    { id: 'f1', name: 'Red Flight' },
    { id: 'f2', name: 'White Flight' },
  ];

  it('defaults to empty array', () => {
    expect(state.getFlights()).toEqual([]);
  });

  it('sets flights and builds index', () => {
    state.setFlights(flights);
    expect(state.getFlights()).toEqual(flights);
    expect(state.getFlightById('f1')).toEqual(flights[0]);
    expect(state.getFlightById('f2')).toEqual(flights[1]);
  });

  it('returns null for unknown flight id', () => {
    state.setFlights(flights);
    expect(state.getFlightById('nonexistent')).toBeNull();
  });
});

// ── Staff ───────────────────────────────────────────────────────────────────

describe('staff state', () => {
  it('defaults to empty array', () => {
    expect(state.getStaff()).toEqual([]);
  });

  it('sets and gets staff', () => {
    const staff = [{ id: 's1', email: 'staff@test.com' }];
    state.setStaff(staff);
    expect(state.getStaff()).toEqual(staff);
  });
});

// ── Admin Winery List ───────────────────────────────────────────────────────

describe('admin winery list state', () => {
  it('defaults to empty array', () => {
    expect(state.getAdminWineryList()).toEqual([]);
  });

  it('sets and gets winery list', () => {
    const list = [{ id: 'w1', name: 'Winery A' }, { id: 'w2', name: 'Winery B' }];
    state.setAdminWineryList(list);
    expect(state.getAdminWineryList()).toEqual(list);
  });
});

// ── resetAllState ───────────────────────────────────────────────────────────

describe('resetAllState', () => {
  it('clears all state back to defaults', () => {
    state.setCurrentUser({ id: 'u1' });
    state.setSuperAdmin(true);
    state.setUserRole('owner');
    state.setCurrentWinery({ id: 'w1' });
    state.setWines([{ id: 'wine-1', name: 'Test' }]);
    state.setFlights([{ id: 'f1', name: 'Test' }]);
    state.setStaff([{ id: 's1' }]);
    state.setAdminWineryList([{ id: 'w1' }]);

    state.resetAllState();

    expect(state.getCurrentUser()).toBeNull();
    expect(state.isLoggedIn()).toBe(false);
    expect(state.isSuperAdmin()).toBe(false);
    expect(state.getUserRole()).toBeNull();
    expect(state.getCurrentWinery()).toBeNull();
    expect(state.getWines()).toEqual([]);
    expect(state.getWineById('wine-1')).toBeNull();
    expect(state.getFlights()).toEqual([]);
    expect(state.getFlightById('f1')).toBeNull();
    expect(state.getStaff()).toEqual([]);
    expect(state.getAdminWineryList()).toEqual([]);
  });
});
