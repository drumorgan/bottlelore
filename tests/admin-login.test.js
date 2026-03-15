import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../assets/js/supabase-gateway.js', () => ({
  signIn: vi.fn(),
  checkIsSuperAdmin: vi.fn(),
  getUserRole: vi.fn(),
}));

vi.mock('../assets/js/router.js', () => ({
  navigate: vi.fn(),
}));

vi.mock('../assets/js/logger.js', () => ({
  error: vi.fn(),
  breadcrumb: vi.fn(),
}));

import { renderLogin } from '../assets/js/views/admin-login.js';
import * as gateway from '../assets/js/supabase-gateway.js';
import * as state from '../assets/js/state.js';
import { navigate } from '../assets/js/router.js';

describe('admin-login', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    state.resetAllState();
    vi.clearAllMocks();
  });

  it('renders the login form', () => {
    renderLogin(container);

    expect(container.querySelector('#login-form')).not.toBeNull();
    expect(container.querySelector('#email')).not.toBeNull();
    expect(container.querySelector('#password')).not.toBeNull();
    expect(container.querySelector('button[type="submit"]').textContent).toBe('Sign In');
    expect(container.innerHTML).toContain('BottleLore Admin');
  });

  it('navigates super admin to /admin/wineries on login', async () => {
    gateway.signIn.mockResolvedValue({ user: { id: 'u1' } });
    gateway.checkIsSuperAdmin.mockResolvedValue(true);

    renderLogin(container);

    container.querySelector('#email').value = 'admin@test.com';
    container.querySelector('#password').value = 'pass';
    container.querySelector('#login-form').dispatchEvent(new Event('submit'));

    // Wait for async handlers
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/admin/wineries');
    });

    expect(state.isSuperAdmin()).toBe(true);
    expect(state.getUserRole()).toBe('super_admin');
  });

  it('navigates owner to /admin/wines on login', async () => {
    gateway.signIn.mockResolvedValue({ user: { id: 'u2' } });
    gateway.checkIsSuperAdmin.mockResolvedValue(false);
    gateway.getUserRole.mockResolvedValue({ role: 'owner', winery_id: 'w1' });

    renderLogin(container);

    container.querySelector('#email').value = 'owner@test.com';
    container.querySelector('#password').value = 'pass';
    container.querySelector('#login-form').dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/admin/wines');
    });

    expect(state.getUserRole()).toBe('owner');
  });

  it('defaults to staff role when getUserRole returns null', async () => {
    gateway.signIn.mockResolvedValue({ user: { id: 'u3' } });
    gateway.checkIsSuperAdmin.mockResolvedValue(false);
    gateway.getUserRole.mockResolvedValue(null);

    renderLogin(container);

    container.querySelector('#email').value = 'staff@test.com';
    container.querySelector('#password').value = 'pass';
    container.querySelector('#login-form').dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/admin/wines');
    });

    expect(state.getUserRole()).toBe('staff');
  });

  it('shows toast and re-enables button on login failure', async () => {
    gateway.signIn.mockRejectedValue(new Error('Invalid credentials'));

    renderLogin(container);

    const submitBtn = container.querySelector('button[type="submit"]');
    container.querySelector('#email').value = 'bad@test.com';
    container.querySelector('#password').value = 'wrong';
    container.querySelector('#login-form').dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(submitBtn.disabled).toBe(false);
    });

    expect(submitBtn.textContent).toBe('Sign In');
    // Toast should have been created
    expect(document.getElementById('bl-toast')).not.toBeNull();
  });

  it('disables button and shows "Signing in…" during submission', async () => {
    // Make signIn hang so we can check intermediate state
    let resolveSignIn;
    gateway.signIn.mockImplementation(() => new Promise(r => { resolveSignIn = r; }));

    renderLogin(container);

    const submitBtn = container.querySelector('button[type="submit"]');
    container.querySelector('#email').value = 'test@test.com';
    container.querySelector('#password').value = 'pass';
    container.querySelector('#login-form').dispatchEvent(new Event('submit'));

    // Check intermediate state before signIn resolves
    await vi.waitFor(() => {
      expect(submitBtn.disabled).toBe(true);
    });
    expect(submitBtn.textContent).toBe('Signing in…');

    // Clean up
    resolveSignIn({ user: { id: 'u1' } });
  });
});
