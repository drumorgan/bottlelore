import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parsePath, navigate } from '../assets/js/router.js';

// ── parsePath ───────────────────────────────────────────────────────────────

describe('parsePath', () => {
  describe('home', () => {
    it('returns home for /', () => {
      expect(parsePath('/')).toEqual({ view: 'home' });
    });

    it('returns home for empty string', () => {
      expect(parsePath('')).toEqual({ view: 'home' });
    });
  });

  describe('public bottle page', () => {
    it('parses /:winerySlug/:wineId', () => {
      expect(parsePath('/sunset-vineyard/abc-123')).toEqual({
        view: 'bottle-page',
        winerySlug: 'sunset-vineyard',
        wineId: 'abc-123',
      });
    });

    it('handles trailing slash', () => {
      expect(parsePath('/sunset-vineyard/abc-123/')).toEqual({
        view: 'bottle-page',
        winerySlug: 'sunset-vineyard',
        wineId: 'abc-123',
      });
    });
  });

  describe('admin login', () => {
    it('returns admin-login for /admin', () => {
      expect(parsePath('/admin')).toEqual({ view: 'admin-login' });
    });

    it('handles trailing slash', () => {
      expect(parsePath('/admin/')).toEqual({ view: 'admin-login' });
    });
  });

  describe('admin wines', () => {
    it('returns admin-wines for /admin/wines', () => {
      expect(parsePath('/admin/wines')).toEqual({ view: 'admin-wines' });
    });

    it('returns admin-wine-new for /admin/wines/new', () => {
      expect(parsePath('/admin/wines/new')).toEqual({ view: 'admin-wine-new' });
    });

    it('returns admin-wine-edit with wineId', () => {
      expect(parsePath('/admin/wines/uuid-123/edit')).toEqual({
        view: 'admin-wine-edit',
        wineId: 'uuid-123',
      });
    });
  });

  describe('admin wineries', () => {
    it('returns admin-wineries for /admin/wineries', () => {
      expect(parsePath('/admin/wineries')).toEqual({ view: 'admin-wineries' });
    });

    it('returns admin-winery-new for /admin/wineries/new', () => {
      expect(parsePath('/admin/wineries/new')).toEqual({ view: 'admin-winery-new' });
    });

    it('returns admin-winery-edit with wineryId', () => {
      expect(parsePath('/admin/wineries/winery-456/edit')).toEqual({
        view: 'admin-winery-edit',
        wineryId: 'winery-456',
      });
    });
  });

  describe('admin winery profile', () => {
    it('returns admin-winery-profile', () => {
      expect(parsePath('/admin/winery/profile')).toEqual({ view: 'admin-winery-profile' });
    });
  });

  describe('admin flights', () => {
    it('returns admin-flights for /admin/flights', () => {
      expect(parsePath('/admin/flights')).toEqual({ view: 'admin-flights' });
    });

    it('returns admin-flight-new for /admin/flights/new', () => {
      expect(parsePath('/admin/flights/new')).toEqual({ view: 'admin-flight-new' });
    });

    it('returns admin-flight-edit with flightId', () => {
      expect(parsePath('/admin/flights/flight-789/edit')).toEqual({
        view: 'admin-flight-edit',
        flightId: 'flight-789',
      });
    });
  });

  describe('admin staff', () => {
    it('returns admin-staff for /admin/staff', () => {
      expect(parsePath('/admin/staff')).toEqual({ view: 'admin-staff' });
    });

    it('returns admin-staff-invite for /admin/staff/invite', () => {
      expect(parsePath('/admin/staff/invite')).toEqual({ view: 'admin-staff-invite' });
    });
  });

  describe('public winery page', () => {
    it('parses /:winerySlug as winery-page', () => {
      expect(parsePath('/sunset-vineyard')).toEqual({
        view: 'winery-page',
        winerySlug: 'sunset-vineyard',
      });
    });

    it('handles trailing slash', () => {
      expect(parsePath('/sunset-vineyard/')).toEqual({
        view: 'winery-page',
        winerySlug: 'sunset-vineyard',
      });
    });
  });

  describe('public flight page', () => {
    it('parses /:winerySlug/flight/:flightId', () => {
      expect(parsePath('/sunset-vineyard/flight/fl-123')).toEqual({
        view: 'flight-page',
        winerySlug: 'sunset-vineyard',
        flightId: 'fl-123',
      });
    });

    it('handles trailing slash', () => {
      expect(parsePath('/sunset-vineyard/flight/fl-123/')).toEqual({
        view: 'flight-page',
        winerySlug: 'sunset-vineyard',
        flightId: 'fl-123',
      });
    });
  });

  describe('not found', () => {
    it('returns not-found for unknown admin route', () => {
      expect(parsePath('/admin/unknown')).toEqual({ view: 'not-found' });
    });

    it('returns not-found for deeply nested unknown route', () => {
      expect(parsePath('/a/b/c/d/e')).toEqual({ view: 'not-found' });
    });
  });
});

// ── navigate ────────────────────────────────────────────────────────────────

describe('navigate', () => {
  beforeEach(() => {
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  it('calls pushState with the path', () => {
    navigate('/admin/wines');
    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/admin/wines');
  });

  it('dispatches popstate event', () => {
    const handler = vi.fn();
    window.addEventListener('popstate', handler);
    navigate('/admin/wines');
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('popstate', handler);
  });
});
