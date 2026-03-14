import * as logger from '../logger.js';
import { escapeHtml, showToast, slugify } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';

export async function renderWineryList(container) {
  container.innerHTML = '<div class="loading">Loading wineries...</div>';

  try {
    const wineries = await gateway.getAllWineriesAdmin();
    state.setAdminWineryList(wineries);

    container.innerHTML = `
      <header class="admin-section__header">
        <h1>Wineries</h1>
        <input type="text" id="winery-search" class="admin-search" placeholder="Search wineries..." />
        <button id="add-winery-btn" class="btn btn--primary">Add Winery</button>
      </header>
      <table class="admin-table" id="winery-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Location</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="winery-tbody"></tbody>
      </table>
    `;

    const tbody = document.getElementById('winery-tbody');
    const searchInput = document.getElementById('winery-search');

    function renderRows(list) {
      tbody.innerHTML = list.map(w => `
        <tr class="${w.is_active ? '' : 'row--inactive'}">
          <td>${escapeHtml(w.name)}</td>
          <td><code>${escapeHtml(w.slug)}</code></td>
          <td>${escapeHtml(w.location || '')}</td>
          <td>
            <span class="badge ${w.is_active ? 'badge--active' : 'badge--inactive'}">
              ${w.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="admin-table__actions">
            <button class="btn btn--small" data-edit="${escapeHtml(w.id)}">Edit</button>
            <button class="btn btn--small btn--outline" data-toggle="${escapeHtml(w.id)}" data-active="${w.is_active}">
              ${w.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn btn--small btn--primary" data-manage="${escapeHtml(w.id)}">Manage</button>
          </td>
        </tr>
      `).join('');

      // Edit buttons
      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => navigate(`/admin/wineries/${btn.dataset.edit}/edit`));
      });

      // Toggle active buttons
      tbody.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.toggle;
          const currentlyActive = btn.dataset.active === 'true';
          const action = currentlyActive ? 'deactivate' : 'activate';
          const winery = list.find(w => w.id === id);
          if (!confirm(`Are you sure you want to ${action} "${winery?.name}"?`)) return;

          try {
            await gateway.toggleWineryActive(id, !currentlyActive);
            showToast(`Winery ${action}d.`, 'success');
            await renderWineryList(container);
          } catch (err) {
            logger.error('Failed to toggle winery', err);
            showToast(`Could not ${action} winery.`, 'error');
          }
        });
      });

      // Manage buttons — set winery context and go to wines
      tbody.querySelectorAll('[data-manage]').forEach(btn => {
        btn.addEventListener('click', () => {
          const winery = wineries.find(w => w.id === btn.dataset.manage);
          if (winery) state.setCurrentWinery(winery);
          navigate('/admin/wines');
        });
      });
    }

    renderRows(wineries);

    // Client-side search
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) {
        renderRows(wineries);
        return;
      }
      const filtered = wineries.filter(w =>
        w.name.toLowerCase().includes(q) ||
        w.slug.toLowerCase().includes(q) ||
        (w.location || '').toLowerCase().includes(q)
      );
      renderRows(filtered);
    });

    document.getElementById('add-winery-btn').addEventListener('click', () => navigate('/admin/wineries/new'));
  } catch (err) {
    logger.error('Failed to load wineries', err);
    showToast('Could not load winery list.', 'error');
  }
}

export async function renderWineryForm(container, wineryId) {
  let winery = null;

  if (wineryId) {
    try {
      const list = state.getAdminWineryList();
      winery = list.find(w => w.id === wineryId) || null;
      if (!winery) {
        // Fetch directly if not in state
        const all = await gateway.getAllWineriesAdmin();
        winery = all.find(w => w.id === wineryId) || null;
      }
      if (!winery) {
        showToast('Winery not found.', 'error');
        navigate('/admin/wineries');
        return;
      }
    } catch (err) {
      logger.error('Failed to load winery', err, { wineryId });
      showToast('Could not load winery.', 'error');
      navigate('/admin/wineries');
      return;
    }
  }

  const isEdit = !!winery;
  const title = isEdit ? `Edit ${escapeHtml(winery.name)}` : 'Add New Winery';

  container.innerHTML = `
    <div class="admin-winery-form">
      <h1>${title}</h1>
      <form id="winery-form">
        <label for="winery-name">Name</label>
        <input type="text" id="winery-name" name="name" required value="${escapeHtml(winery?.name || '')}" />

        <label for="winery-slug">Slug</label>
        <input type="text" id="winery-slug" name="slug" required value="${escapeHtml(winery?.slug || '')}" pattern="[a-z0-9-]+" title="Lowercase letters, numbers, and hyphens only" />

        <label for="winery-location">Location</label>
        <input type="text" id="winery-location" name="location" value="${escapeHtml(winery?.location || '')}" />

        <label for="winery-description">Description</label>
        <textarea id="winery-description" name="description">${escapeHtml(winery?.description || '')}</textarea>

        <label for="winery-phone">Phone</label>
        <input type="tel" id="winery-phone" name="phone" value="${escapeHtml(winery?.phone || '')}" />

        <label for="winery-hours">Hours</label>
        <input type="text" id="winery-hours" name="hours" value="${escapeHtml(winery?.hours || '')}" />

        <label for="winery-website">Website URL</label>
        <input type="url" id="winery-website" name="website_url" value="${escapeHtml(winery?.website_url || '')}" />

        <fieldset class="admin-winery-form__socials">
          <legend>Social Media</legend>
          <label for="winery-facebook">Facebook</label>
          <input type="url" id="winery-facebook" name="social_facebook" value="${escapeHtml(winery?.social_facebook || '')}" />

          <label for="winery-instagram">Instagram</label>
          <input type="url" id="winery-instagram" name="social_instagram" value="${escapeHtml(winery?.social_instagram || '')}" />

          <label for="winery-twitter">Twitter / X</label>
          <input type="url" id="winery-twitter" name="social_twitter" value="${escapeHtml(winery?.social_twitter || '')}" />
        </fieldset>

        ${isEdit ? `
        <div class="admin-winery-form__toggle">
          <label>
            <input type="checkbox" id="winery-active" ${winery.is_active ? 'checked' : ''} />
            Active (visible to guests)
          </label>
        </div>` : ''}

        <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Create Winery'}</button>
        <button type="button" id="cancel-btn" class="btn btn--secondary">Cancel</button>
      </form>
    </div>
  `;

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/wineries'));

  // Auto-generate slug from name for new wineries
  if (!isEdit) {
    const nameInput = document.getElementById('winery-name');
    const slugInput = document.getElementById('winery-slug');
    let slugManuallyEdited = false;

    slugInput.addEventListener('input', () => { slugManuallyEdited = true; });

    nameInput.addEventListener('input', () => {
      if (!slugManuallyEdited) {
        slugInput.value = slugify(nameInput.value);
      }
    });
  }

  document.getElementById('winery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const data = {
      name: document.getElementById('winery-name').value.trim(),
      slug: document.getElementById('winery-slug').value.trim(),
      location: document.getElementById('winery-location').value.trim() || null,
      description: document.getElementById('winery-description').value.trim() || null,
      phone: document.getElementById('winery-phone').value.trim() || null,
      hours: document.getElementById('winery-hours').value.trim() || null,
      website_url: document.getElementById('winery-website').value.trim() || null,
      social_facebook: document.getElementById('winery-facebook').value.trim() || null,
      social_instagram: document.getElementById('winery-instagram').value.trim() || null,
      social_twitter: document.getElementById('winery-twitter').value.trim() || null,
    };

    if (isEdit) {
      const activeCheckbox = document.getElementById('winery-active');
      data.is_active = activeCheckbox.checked;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      if (isEdit) {
        await gateway.updateWinery(winery.id, data);
        showToast('Winery updated.', 'success');
      } else {
        await gateway.createWinery(data);
        showToast('Winery created.', 'success');
      }
      navigate('/admin/wineries');
    } catch (err) {
      logger.error('Failed to save winery', err);
      const msg = err.message?.includes('duplicate') ? 'A winery with that slug already exists.' : 'Could not save winery. Please try again.';
      showToast(msg, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Winery';
    }
  });
}
