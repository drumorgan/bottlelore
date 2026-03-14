import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';
import { generateQR, getBottleUrl } from '../components/qr-generator.js';
import { renderAdminNav } from '../components/admin-nav.js';
import { renderWineryList, renderWineryForm } from './admin-wineries.js';
import { renderWineryProfile } from './admin-winery-profile.js';
import { renderFlightList, renderFlightForm } from './admin-flights.js';
import { renderStaffList, renderInviteForm } from './admin-staff.js';

export async function render(container, view, options = {}) {
  logger.breadcrumb(`render admin: ${view}`, 'view', options);

  // Login view — no nav wrapper
  if (view === 'admin-login') {
    renderLogin(container);
    return;
  }

  // All other admin views require auth
  if (!state.isLoggedIn()) {
    navigate('/admin');
    return;
  }

  // Ensure winery is loaded for views that need it
  await ensureWineryLoaded();

  // Render nav shell and get content area
  const content = renderAdminNav(container);

  switch (view) {
    case 'admin-wines':
      await renderWineList(content);
      break;
    case 'admin-wine-new':
      renderWineForm(content, null);
      break;
    case 'admin-wine-edit':
      await renderWineForm(content, options.wineId);
      break;
    case 'admin-wineries':
      await renderWineryList(content);
      break;
    case 'admin-winery-new':
      await renderWineryForm(content, null);
      break;
    case 'admin-winery-edit':
      await renderWineryForm(content, options.wineryId);
      break;
    case 'admin-winery-profile':
      await renderWineryProfile(content);
      break;
    case 'admin-flights':
      await renderFlightList(content);
      break;
    case 'admin-flight-new':
      await renderFlightForm(content, null);
      break;
    case 'admin-flight-edit':
      await renderFlightForm(content, options.flightId);
      break;
    case 'admin-staff':
      await renderStaffList(content);
      break;
    case 'admin-staff-invite':
      await renderInviteForm(content);
      break;
    default:
      content.innerHTML = '<p>Unknown admin view.</p>';
  }
}

/**
 * Ensure winery is loaded in state (handles direct-navigation cases).
 * For super admins, also loads the full winery list for the nav switcher.
 */
async function ensureWineryLoaded() {
  try {
    // Super admins: load winery list for switcher if not already loaded
    if (state.isSuperAdmin() && state.getAdminWineryList().length === 0) {
      const allWineries = await gateway.getAllWineriesAdmin();
      state.setAdminWineryList(allWineries);
      if (!state.getCurrentWinery() && allWineries.length > 0) {
        state.setCurrentWinery(allWineries[0]);
      }
      return;
    }

    if (state.getCurrentWinery()) return;

    const user = state.getCurrentUser();
    let winery = null;
    try {
      const adminData = await gateway.getAdminWinery(user.id);
      winery = adminData.wineries;
    } catch (_) {
      if (state.isSuperAdmin()) {
        const allWineries = await gateway.getAllWineries();
        if (allWineries.length > 0) winery = allWineries[0];
      }
    }
    if (winery) state.setCurrentWinery(winery);
  } catch (err) {
    logger.error('Failed to load winery context', err);
  }
}

function renderLogin(container) {
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
        const roleData = await gateway.getUserRole(userId);
        if (roleData) {
          state.setUserRole(roleData.role);
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

async function renderWineList(container) {
  container.innerHTML = '<div class="loading">Loading wines...</div>';

  try {
    const winery = state.getCurrentWinery();

    if (!winery) {
      container.innerHTML = '<p>You are not assigned to any winery. A super admin needs to create a winery and assign you to it.</p>';
      return;
    }

    const wines = await gateway.getWinesByWinery(winery.id);
    state.setWines(wines);

    const rows = wines.map(w => `
      <tr class="${w.is_active === false ? 'row--inactive' : ''}">
        <td>${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.varietal || '')}</td>
        <td>${escapeHtml(w.vintage_year ? String(w.vintage_year) : '')}</td>
        <td>${escapeHtml(w.price || '')}</td>
        <td>
          <span class="badge ${w.is_active === false ? 'badge--inactive' : 'badge--active'}">
            ${w.is_active === false ? 'Inactive' : 'Active'}
          </span>
        </td>
        <td class="admin-table__actions">
          <button class="btn btn--small" data-edit="${escapeHtml(w.id)}">Edit</button>
          <button class="btn btn--small btn--outline" data-toggle-wine="${escapeHtml(w.id)}" data-active="${w.is_active !== false}">
            ${w.is_active === false ? 'Activate' : 'Deactivate'}
          </button>
          <button class="btn btn--small btn--outline" data-qr="${escapeHtml(w.id)}" data-slug="${escapeHtml(winery.slug)}">QR</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <header class="admin-wines__header">
        <h1>Wines</h1>
        <button id="add-wine-btn" class="btn btn--primary">Add Wine</button>
      </header>
      <table class="admin-wines__table">
        <thead>
          <tr><th>Name</th><th>Varietal</th><th>Vintage</th><th>Price</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div id="qr-modal" class="qr-modal" hidden>
        <div class="qr-modal__backdrop"></div>
        <div class="qr-modal__content">
          <h2 id="qr-modal-title">QR Code</h2>
          <div id="qr-modal-canvas"></div>
          <p id="qr-modal-url" class="qr-modal__url"></p>
          <button id="qr-modal-close" class="btn btn--secondary">Close</button>
        </div>
      </div>
    `;

    document.getElementById('add-wine-btn').addEventListener('click', () => navigate('/admin/wines/new'));
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => navigate(`/admin/wines/${btn.dataset.edit}/edit`));
    });

    // Active/inactive toggle
    container.querySelectorAll('[data-toggle-wine]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const wineId = btn.dataset.toggleWine;
        const currentlyActive = btn.dataset.active === 'true';
        const wine = wines.find(x => x.id === wineId);
        const action = currentlyActive ? 'deactivate' : 'activate';

        if (currentlyActive && !confirm(`Are you sure you want to deactivate "${wine?.name}"? It will no longer be visible to guests.`)) return;

        try {
          await gateway.toggleWineActive(wineId, !currentlyActive);
          showToast(`Wine ${action}d.`, 'success');
          await renderWineList(container);
        } catch (err) {
          logger.error('Failed to toggle wine', err);
          showToast(`Could not ${action} wine.`, 'error');
        }
      });
    });

    // QR code modal
    const qrModal = document.getElementById('qr-modal');
    container.querySelectorAll('[data-qr]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const wineId = btn.dataset.qr;
        const slug = btn.dataset.slug;
        const url = getBottleUrl(slug, wineId);
        const w = wines.find(x => x.id === wineId);

        document.getElementById('qr-modal-title').textContent = w ? w.name : 'QR Code';
        document.getElementById('qr-modal-url').textContent = url;
        document.getElementById('qr-modal-canvas').innerHTML = '';

        qrModal.hidden = false;
        await generateQR(document.getElementById('qr-modal-canvas'), url);
      });
    });
    document.getElementById('qr-modal-close').addEventListener('click', () => { qrModal.hidden = true; });
    document.querySelector('.qr-modal__backdrop').addEventListener('click', () => { qrModal.hidden = true; });
  } catch (err) {
    logger.error('Failed to load wines', err);
    showToast('Could not load wine list.', 'error');
  }
}

async function renderWineForm(container, wineId) {
  const winery = state.getCurrentWinery();
  if (!winery) {
    showToast('No winery found. Cannot manage wines.', 'error');
    navigate('/admin/wines');
    return;
  }

  let wine = null;
  if (wineId) {
    try {
      wine = state.getWineById(wineId) || await gateway.getWineById(wineId);
    } catch (err) {
      logger.error('Failed to load wine for editing', err, { wineId });
      showToast('Could not load wine.', 'error');
      navigate('/admin/wines');
      return;
    }
  }

  const isEdit = !!wine;
  const title = isEdit ? `Edit ${escapeHtml(wine.name)}` : 'Add New Wine';

  container.innerHTML = `
    <div class="admin-wine-form">
      <h1>${title}</h1>
      <form id="wine-form">
        <label for="wine-name">Name</label>
        <input type="text" id="wine-name" name="name" required value="${escapeHtml(wine?.name || '')}" />

        <label for="wine-varietal">Varietal</label>
        <input type="text" id="wine-varietal" name="varietal" value="${escapeHtml(wine?.varietal || '')}" />

        <label for="wine-vintage">Vintage Year</label>
        <input type="number" id="wine-vintage" name="vintage_year" value="${escapeHtml(wine?.vintage_year ? String(wine.vintage_year) : '')}" />

        <label for="wine-region">Region</label>
        <input type="text" id="wine-region" name="region" value="${escapeHtml(wine?.region || '')}" />

        <label for="wine-price">Price</label>
        <input type="text" id="wine-price" name="price" value="${escapeHtml(wine?.price || '')}" />

        <label for="wine-description">Description</label>
        <textarea id="wine-description" name="description">${escapeHtml(wine?.description || '')}</textarea>

        <label for="wine-tasting-notes">Tasting Notes</label>
        <textarea id="wine-tasting-notes" name="tasting_notes">${escapeHtml(wine?.tasting_notes || '')}</textarea>

        <label for="wine-pairings">Food Pairings (comma-separated)</label>
        <input type="text" id="wine-pairings" name="food_pairings" value="${escapeHtml((wine?.food_pairings || []).join(', '))}" />

        <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Create Wine'}</button>
        <button type="button" id="cancel-btn" class="btn btn--secondary">Cancel</button>
      </form>
      ${isEdit ? `
      <section class="admin-wine-form__qr">
        <h2>QR Code</h2>
        <div id="wine-qr-container"></div>
        <p id="wine-qr-url" class="qr-modal__url"></p>
      </section>` : ''}
    </div>
  `;

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/wines'));

  // Render QR code for existing wines
  if (isEdit) {
    const url = getBottleUrl(winery.slug, wine.id);
    document.getElementById('wine-qr-url').textContent = url;
    generateQR(document.getElementById('wine-qr-container'), url);
  }

  document.getElementById('wine-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const data = {
      name: document.getElementById('wine-name').value.trim(),
      varietal: document.getElementById('wine-varietal').value.trim() || null,
      vintage_year: document.getElementById('wine-vintage').value ? parseInt(document.getElementById('wine-vintage').value, 10) : null,
      region: document.getElementById('wine-region').value.trim() || null,
      price: document.getElementById('wine-price').value.trim() || null,
      description: document.getElementById('wine-description').value.trim() || null,
      tasting_notes: document.getElementById('wine-tasting-notes').value.trim() || null,
      food_pairings: document.getElementById('wine-pairings').value
        ? document.getElementById('wine-pairings').value.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      if (isEdit) {
        await gateway.updateWine(wine.id, data);
        showToast('Wine updated.', 'success');
      } else {
        data.winery_id = winery.id;
        await gateway.createWine(data);
        showToast('Wine created.', 'success');
      }
      navigate('/admin/wines');
    } catch (err) {
      logger.error('Failed to save wine', err);
      showToast('Could not save wine. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Wine';
    }
  });
}
