import * as logger from '../logger.js';
import { showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="admin-login">
      <h1>BottleLore Admin</h1>
      <form id="login-form" class="admin-login__form">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email" />
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required autocomplete="current-password" />
        <button type="submit">Sign In</button>
      </form>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const authData = await gateway.signIn(email, password);
      const userId = authData.user.id;

      // Detect role
      let isSA = false;
      try {
        isSA = await gateway.checkIsSuperAdmin();
      } catch (roleErr) {
        logger.error('Super admin check failed', roleErr);
      }
      state.setSuperAdmin(isSA);

      if (isSA) {
        state.setUserRole('super_admin');
        navigate('/admin/wineries');
      } else {
        const assignments = await gateway.getAdminWineries(userId);
        state.setUserWineryAssignments(assignments);
        if (assignments.length > 0) {
          state.setUserRole(assignments[0].role);
          state.setCurrentWinery(assignments[0].wineries);
        } else {
          state.setUserRole('staff');
        }
        navigate('/admin/wines');
      }
    } catch (err) {
      logger.error('Login failed', err);
      const msg = err.message || 'Check your credentials.';
      showToast(`Login failed: ${msg}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}
