import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @supabase/supabase-js before importing the gateway
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockAuth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
};
const mockFunctions = {
  invoke: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: mockAuth,
    functions: mockFunctions,
  })),
}));

// Set up APP_CONFIG before importing gateway
window.APP_CONFIG = {
  supabase: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key',
  },
};

// Helper to build a chainable query mock
function mockQuery(result) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  // For terminal calls without .single(), resolve the chain itself
  chain.select.mockImplementation(() => {
    // Allow chaining after select
    return chain;
  });
  chain.order.mockImplementation(() => {
    // When order is terminal, resolve
    return { ...chain, then: (resolve) => resolve(result) };
  });
  return chain;
}

// Now import gateway (uses the mocked supabase)
const gateway = await import('../assets/js/supabase-gateway.js');

describe('supabase-gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth ──────────────────────────────────────────────────────────────

  describe('signIn', () => {
    it('calls signInWithPassword and returns data', async () => {
      const authData = { user: { id: 'u1' }, session: {} };
      mockAuth.signInWithPassword.mockResolvedValue({ data: authData, error: null });

      const result = await gateway.signIn('test@test.com', 'pass123');
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'pass123',
      });
      expect(result).toEqual(authData);
    });

    it('throws on auth error', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: new Error('Invalid credentials'),
      });

      await expect(gateway.signIn('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('calls auth.signOut', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });
      await gateway.signOut();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('throws on error', async () => {
      mockAuth.signOut.mockResolvedValue({ error: new Error('Network error') });
      await expect(gateway.signOut()).rejects.toThrow('Network error');
    });
  });

  describe('getSession', () => {
    it('returns session object', async () => {
      const session = { access_token: 'abc' };
      mockAuth.getSession.mockResolvedValue({ data: { session }, error: null });

      const result = await gateway.getSession();
      expect(result).toEqual(session);
    });
  });

  describe('getCurrentUser', () => {
    it('returns user', async () => {
      const user = { id: 'u1', email: 'test@test.com' };
      mockAuth.getUser.mockResolvedValue({ data: { user }, error: null });

      const result = await gateway.getCurrentUser();
      expect(result).toEqual(user);
    });

    it('returns null on error', async () => {
      mockAuth.getUser.mockResolvedValue({ data: {}, error: new Error('No session') });

      const result = await gateway.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('registers callback', () => {
      const cb = vi.fn();
      mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: {} } });

      gateway.onAuthStateChange(cb);
      expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  // ── Super Admin ───────────────────────────────────────────────────────

  describe('checkIsSuperAdmin', () => {
    it('calls is_super_admin RPC', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const result = await gateway.checkIsSuperAdmin();
      expect(mockRpc).toHaveBeenCalledWith('is_super_admin');
      expect(result).toBe(true);
    });
  });

  // ── Wineries ──────────────────────────────────────────────────────────

  describe('getWineryBySlug', () => {
    it('queries wineries by slug and active status', async () => {
      const winery = { id: 'w1', slug: 'test', name: 'Test Winery' };
      const chain = mockQuery({ data: winery, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.getWineryBySlug('test');
      expect(mockFrom).toHaveBeenCalledWith('wineries');
      expect(chain.eq).toHaveBeenCalledWith('slug', 'test');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(winery);
    });
  });

  describe('createWinery', () => {
    it('inserts and returns winery', async () => {
      const newWinery = { name: 'New Winery', slug: 'new-winery' };
      const created = { id: 'w2', ...newWinery };
      const chain = mockQuery({ data: created, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.createWinery(newWinery);
      expect(mockFrom).toHaveBeenCalledWith('wineries');
      expect(chain.insert).toHaveBeenCalledWith(newWinery);
      expect(result).toEqual(created);
    });
  });

  describe('updateWinery', () => {
    it('updates and returns winery', async () => {
      const updates = { name: 'Updated Name' };
      const updated = { id: 'w1', ...updates };
      const chain = mockQuery({ data: updated, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.updateWinery('w1', updates);
      expect(chain.update).toHaveBeenCalledWith(updates);
      expect(chain.eq).toHaveBeenCalledWith('id', 'w1');
      expect(result).toEqual(updated);
    });
  });

  describe('toggleWineryActive', () => {
    it('calls updateWinery with is_active', async () => {
      const chain = mockQuery({ data: { id: 'w1', is_active: false }, error: null });
      mockFrom.mockReturnValue(chain);

      await gateway.toggleWineryActive('w1', false);
      expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    });
  });

  // ── Wines ─────────────────────────────────────────────────────────────

  describe('getWineById', () => {
    it('fetches wine with winery relation', async () => {
      const wine = { id: 'wine-1', name: 'Merlot', wineries: { name: 'Test', slug: 'test' } };
      const chain = mockQuery({ data: wine, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.getWineById('wine-1');
      expect(mockFrom).toHaveBeenCalledWith('wines');
      expect(chain.select).toHaveBeenCalledWith('*, translations, wineries(name, slug, theme_preference)');
      expect(chain.eq).toHaveBeenCalledWith('id', 'wine-1');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(wine);
    });
  });

  describe('createWine', () => {
    it('inserts wine data', async () => {
      const wineData = { name: 'Cab Sav', winery_id: 'w1' };
      const created = { id: 'wine-2', ...wineData };
      const chain = mockQuery({ data: created, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.createWine(wineData);
      expect(chain.insert).toHaveBeenCalledWith(wineData);
      expect(result).toEqual(created);
    });
  });

  describe('toggleWineActive', () => {
    it('calls updateWine with is_active', async () => {
      const chain = mockQuery({ data: { id: 'wine-1', is_active: true }, error: null });
      mockFrom.mockReturnValue(chain);

      await gateway.toggleWineActive('wine-1', true);
      expect(chain.update).toHaveBeenCalledWith({ is_active: true });
    });
  });

  // ── Flights ───────────────────────────────────────────────────────────

  describe('createFlight', () => {
    it('inserts flight data', async () => {
      const flightData = { name: 'Red Flight', winery_id: 'w1' };
      const created = { id: 'f1', ...flightData };
      const chain = mockQuery({ data: created, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.createFlight(flightData);
      expect(chain.insert).toHaveBeenCalledWith(flightData);
      expect(result).toEqual(created);
    });
  });

  describe('setFlightWines', () => {
    it('deletes existing and inserts new wines', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const insertChain = mockQuery({ data: [{ flight_id: 'f1', wine_id: 'w1' }], error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? deleteChain : insertChain;
      });

      await gateway.setFlightWines('f1', ['w1', 'w2']);
      expect(deleteChain.delete).toHaveBeenCalled();
      expect(deleteChain.eq).toHaveBeenCalledWith('flight_id', 'f1');
      expect(insertChain.insert).toHaveBeenCalledWith([
        { flight_id: 'f1', wine_id: 'w1', sort_order: 0 },
        { flight_id: 'f1', wine_id: 'w2', sort_order: 1 },
      ]);
    });

    it('skips insert when wineIds is empty', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockReturnValue(deleteChain);

      const result = await gateway.setFlightWines('f1', []);
      expect(result).toEqual([]);
      // Should only call from() once (for delete)
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });

  // ── Staff ─────────────────────────────────────────────────────────────

  describe('getWineryStaff', () => {
    it('calls get_winery_staff RPC', async () => {
      const staff = [{ admin_id: 'a1', email: 'staff@test.com' }];
      mockRpc.mockResolvedValue({ data: staff, error: null });

      const result = await gateway.getWineryStaff('w1');
      expect(mockRpc).toHaveBeenCalledWith('get_winery_staff', { target_winery_id: 'w1' });
      expect(result).toEqual(staff);
    });
  });

  describe('inviteUser', () => {
    it('invokes edge function', async () => {
      mockFunctions.invoke.mockResolvedValue({ data: { message: 'Invited' }, error: null });

      const result = await gateway.inviteUser('new@test.com', 'w1', 'staff');
      expect(mockFunctions.invoke).toHaveBeenCalledWith('invite-user', {
        body: { email: 'new@test.com', winery_id: 'w1', role: 'staff', redirect_to: 'http://localhost:3000/admin/set-password' },
      });
      expect(result).toEqual({ message: 'Invited' });
    });

    it('throws on edge function error', async () => {
      mockFunctions.invoke.mockResolvedValue({ data: null, error: new Error('Unauthorized') });
      await expect(gateway.inviteUser('x@test.com', 'w1', 'staff')).rejects.toThrow('Unauthorized');
    });

    it('throws on data.error from edge function', async () => {
      mockFunctions.invoke.mockResolvedValue({ data: { error: 'Already linked' }, error: null });
      await expect(gateway.inviteUser('x@test.com', 'w1', 'staff')).rejects.toThrow('Already linked');
    });
  });

  describe('removeWineryAdmin', () => {
    it('calls remove_winery_admin RPC', async () => {
      mockRpc.mockResolvedValue({ error: null });

      await gateway.removeWineryAdmin('a1');
      expect(mockRpc).toHaveBeenCalledWith('remove_winery_admin', { target_admin_id: 'a1' });
    });
  });

  // ── getUserRoles ──────────────────────────────────────────────────────

  describe('getUserRoles', () => {
    it('returns array of role assignments', async () => {
      const roles = [{ role: 'owner', winery_id: 'w1' }];
      const chain = mockQuery({ data: roles, error: null });
      // getUserRoles ends with .eq() (no .single()), so make eq thenable
      chain.eq.mockImplementation(() => {
        return { ...chain, then: (resolve) => resolve({ data: roles, error: null }) };
      });
      mockFrom.mockReturnValue(chain);

      const result = await gateway.getUserRoles('u1');
      expect(chain.select).toHaveBeenCalledWith('role, winery_id');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(result).toEqual(roles);
    });
  });
});
