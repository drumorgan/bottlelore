import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';

export async function renderStaffList(container) {
  const winery = state.getCurrentWinery();
  if (!winery) {
    container.innerHTML = '<p>No winery assigned. Contact a super admin.</p>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading staff...</div>';

  try {
    const staff = await gateway.getWineryStaff(winery.id);
    state.setStaff(staff);

    const currentUser = state.getCurrentUser();
    const role = state.getUserRole();
    const canRemove = role === 'super_admin' || role === 'owner';

    const rows = staff.length === 0
      ? '<tr><td colspan="4">No staff members yet. Invite someone to get started.</td></tr>'
      : staff.map(s => {
        const isSelf = s.user_id === currentUser?.id || s.email === currentUser?.email;
        const newRole = s.role === 'staff' ? 'owner' : 'staff';
        const roleLabel = s.role === 'staff' ? 'Promote to Owner' : 'Demote to Staff';
        const roleBtn = canRemove && !isSelf
          ? `<button class="btn btn--small btn--outline" data-change-role="${escapeHtml(s.admin_id)}" data-email="${escapeHtml(s.email)}" data-new-role="${newRole}">${roleLabel}</button>`
          : '';
        const removeBtn = canRemove && !isSelf
          ? `<button class="btn btn--small btn--danger" data-remove="${escapeHtml(s.admin_id)}" data-email="${escapeHtml(s.email)}">Remove</button>`
          : '';
        return `
          <tr>
            <td>${escapeHtml(s.email)}</td>
            <td>
              <span class="badge ${s.role === 'owner' ? 'badge--owner' : 'badge--staff'}">
                ${escapeHtml(s.role)}
              </span>
              ${isSelf ? ' <span class="staff-you">(you)</span>' : ''}
            </td>
            <td>${new Date(s.created_at).toLocaleDateString()}</td>
            <td class="admin-table__actions">${roleBtn} ${removeBtn}</td>
          </tr>
        `;
      }).join('');

    container.innerHTML = `
      <header class="admin-section__header">
        <h1>Staff</h1>
        ${canRemove ? '<button id="invite-btn" class="btn btn--primary">Invite</button>' : ''}
      </header>
      <table class="admin-table">
        <thead>
          <tr><th>Email</th><th>Role</th><th>Added</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    const inviteBtn = document.getElementById('invite-btn');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => navigate('/admin/staff/invite'));
    }

    // Change role buttons
    container.querySelectorAll('[data-change-role]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const adminId = btn.dataset.changeRole;
        const email = btn.dataset.email;
        const newRole = btn.dataset.newRole;
        const action = newRole === 'owner' ? 'Promote' : 'Demote';
        if (!confirm(`${action} ${email} to ${newRole}?`)) return;

        try {
          await gateway.updateWineryAdminRole(adminId, newRole);
          showToast(`${email} is now ${newRole}.`, 'success');
          await renderStaffList(container);
        } catch (err) {
          logger.error('Failed to change role', err);
          showToast(`Could not change role. [${err.message}]`, 'error');
        }
      });
    });

    // Remove buttons
    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const adminId = btn.dataset.remove;
        const email = btn.dataset.email;
        if (!confirm(`Remove ${email} from this winery? They will lose access immediately.`)) return;

        try {
          await gateway.removeWineryAdmin(adminId);
          showToast(`${email} removed.`, 'success');
          await renderStaffList(container);
        } catch (err) {
          logger.error('Failed to remove staff', err);
          showToast(`Could not remove staff member. [${err.message}]`, 'error');
        }
      });
    });
  } catch (err) {
    logger.error('Failed to load staff', err);
    showToast('Could not load staff list.', 'error');
  }
}

export async function renderInviteForm(container) {
  const winery = state.getCurrentWinery();
  if (!winery) {
    showToast('No winery found.', 'error');
    navigate('/admin/staff');
    return;
  }

  const roleOptions = `<option value="staff">Staff</option><option value="owner">Owner</option>`;

  container.innerHTML = `
    <div class="admin-invite-form">
      <h1>Invite to ${escapeHtml(winery.name)}</h1>
      <form id="invite-form">
        <label for="invite-email">Email Address</label>
        <input type="email" id="invite-email" name="email" required placeholder="name@example.com" autocomplete="off" />

        <label for="invite-role">Role</label>
        <select id="invite-role" name="role">${roleOptions}</select>

        <div class="admin-invite-form__help">
          <details>
            <summary>Role descriptions</summary>
            <dl class="role-descriptions">
              <dt>Staff</dt>
              <dd>Can manage wines and flights for this winery.</dd>
              <dt>Owner</dt>
              <dd>Full control: wines, flights, staff, and winery profile.</dd>
            </dl>
          </details>
        </div>

        <button type="submit" class="btn btn--primary">Send Invite</button>
        <button type="button" id="cancel-btn" class="btn btn--secondary">Cancel</button>
      </form>
    </div>
  `;

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/staff'));

  document.getElementById('invite-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const email = document.getElementById('invite-email').value.trim();
    const role = document.getElementById('invite-role').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const result = await gateway.inviteUser(email, winery.id, role);
      showToast(result.message || 'Invite sent.', 'success');
      navigate('/admin/staff');
    } catch (err) {
      logger.error('Failed to invite user', err);
      showToast(err.message || 'Could not send invite. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Invite';
    }
  });
}
