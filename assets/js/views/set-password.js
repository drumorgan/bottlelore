import * as logger from '../logger.js';
import { showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';

export function render(container) {
  container.innerHTML = `
    <div class="admin-login">
      <h1>Set Your Password</h1>
      <p class="admin-login__hint">Welcome to BottleLore! Choose a password to finish setting up your account.</p>
      <form id="set-password-form" class="admin-login__form">
        <label for="new-password">New Password</label>
        <input type="password" id="new-password" name="new-password" required minlength="8"
               autocomplete="new-password" placeholder="At least 8 characters" />
        <label for="confirm-password">Confirm Password</label>
        <input type="password" id="confirm-password" name="confirm-password" required minlength="8"
               autocomplete="new-password" />
        <button type="submit">Set Password</button>
      </form>
    </div>
  `;

  document.getElementById('set-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (pw !== confirm) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving\u2026';

    try {
      await gateway.updatePassword(pw);
      showToast('Password set! You are now logged in.', 'success');
      navigate('/admin/wines');
    } catch (err) {
      logger.error('Set password failed', err);
      showToast(`Could not set password. [${err.message}]`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set Password';
    }
  });
}
