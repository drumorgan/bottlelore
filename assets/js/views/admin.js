import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';

export async function render(container, view, options = {}) {
  logger.breadcrumb(`render admin: ${view}`, 'view', options);

  switch (view) {
    case 'admin-login':
      renderLogin(container);
      break;
    case 'admin-wines':
      await renderWineList(container);
      break;
    case 'admin-wine-new':
      renderWineForm(container, null);
      break;
    case 'admin-wine-edit':
      await renderWineForm(container, options.wineId);
      break;
    default:
      container.innerHTML = '<p>Unknown admin view.</p>';
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

    try {
      await gateway.signIn(email, password);

      try {
        const isSA = await gateway.checkIsSuperAdmin();
        state.setSuperAdmin(isSA);
      } catch (roleErr) {
        logger.error('Role check failed', roleErr);
        state.setSuperAdmin(false);
      }

      navigate('/admin/wines');
    } catch (err) {
      logger.error('Login failed', err);
      const msg = err.message || 'Check your credentials.';
      showToast(`Login failed: ${msg}`, 'error');
    }
  });
}

async function renderWineList(container) {
  if (!state.isLoggedIn()) {
    navigate('/admin');
    return;
  }

  container.innerHTML = '<div class="loading">Loading wines...</div>';

  try {
    const user = state.getCurrentUser();
    let winery = null;

    // Super admins may not have a winery_admins row — fall back to getAllWineries
    try {
      const adminData = await gateway.getAdminWinery(user.id);
      winery = adminData.wineries;
    } catch (_) {
      if (state.isSuperAdmin()) {
        const allWineries = await gateway.getAllWineries();
        if (allWineries.length > 0) {
          winery = allWineries[0];
        }
      }
    }

    if (!winery) {
      container.innerHTML = `
        <div class="admin-wines">
          <header class="admin-wines__header">
            <h1>No Winery Found</h1>
            <button id="logout-btn" class="btn btn--secondary">Sign Out</button>
          </header>
          <p>You are not assigned to any winery. A super admin needs to create a winery and assign you to it.</p>
        </div>
      `;
      document.getElementById('logout-btn').addEventListener('click', async () => {
        await gateway.signOut();
        state.resetAllState();
        navigate('/admin');
      });
      return;
    }

    state.setCurrentWinery(winery);

    const wines = await gateway.getWinesByWinery(winery.id);
    state.setWines(wines);

    const rows = wines.map(w => `
      <tr>
        <td>${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.varietal || '')}</td>
        <td>${escapeHtml(w.vintage_year ? String(w.vintage_year) : '')}</td>
        <td>${escapeHtml(w.price || '')}</td>
        <td>
          <button class="btn btn--small" data-edit="${escapeHtml(w.id)}">Edit</button>
        </td>
      </tr>
    `).join('');

    const superBadge = state.isSuperAdmin() ? ' <span class="badge badge--super">Super Admin</span>' : '';

    container.innerHTML = `
      <div class="admin-wines">
        <header class="admin-wines__header">
          <h1>${escapeHtml(winery.name)} — Wines${superBadge}</h1>
          <button id="add-wine-btn" class="btn btn--primary">Add Wine</button>
          <button id="logout-btn" class="btn btn--secondary">Sign Out</button>
        </header>
        <table class="admin-wines__table">
          <thead>
            <tr><th>Name</th><th>Varietal</th><th>Vintage</th><th>Price</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    document.getElementById('add-wine-btn').addEventListener('click', () => navigate('/admin/wines/new'));
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await gateway.signOut();
      state.resetAllState();
      navigate('/admin');
    });
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => navigate(`/admin/wines/${btn.dataset.edit}/edit`));
    });
  } catch (err) {
    logger.error('Failed to load wines', err);
    showToast('Could not load wine list.', 'error');
  }
}

async function renderWineForm(container, wineId) {
  if (!state.isLoggedIn()) {
    navigate('/admin');
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
    </div>
  `;

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/wines'));

  document.getElementById('wine-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const winery = state.getCurrentWinery();

    const data = {
      name: form.name.value.trim(),
      varietal: form.varietal.value.trim() || null,
      vintage_year: form.vintage_year.value ? parseInt(form.vintage_year.value, 10) : null,
      region: form.region.value.trim() || null,
      price: form.price.value.trim() || null,
      description: form.description.value.trim() || null,
      tasting_notes: form.tasting_notes.value.trim() || null,
      food_pairings: form.food_pairings.value
        ? form.food_pairings.value.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };

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
    }
  });
}
