import * as logger from '../logger.js';
import { escapeHtml, showToast, slugify } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';
import { createImageUpload } from '../components/image-upload.js';
import { generateQR, getWineryUrl, downloadQR, printQR } from '../components/qr-generator.js';
import { createQRModal } from '../components/qr-modal.js';
import { createTranslationPanel } from '../components/translation-panel.js';

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

    const qrModal = createQRModal(container);

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
            <button class="btn btn--small btn--outline" data-qr="${escapeHtml(w.slug)}">QR</button>
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

      // Manage buttons — set winery context and go to winery settings
      tbody.querySelectorAll('[data-manage]').forEach(btn => {
        btn.addEventListener('click', () => {
          const winery = wineries.find(w => w.id === btn.dataset.manage);
          if (winery) state.setCurrentWinery(winery);
          navigate('/admin/winery/profile');
        });
      });

      // QR code buttons
      tbody.querySelectorAll('[data-qr]').forEach(btn => {
        btn.addEventListener('click', () => {
          const slug = btn.dataset.qr;
          const url = getWineryUrl(slug);
          const winery = list.find(w => w.slug === slug);
          qrModal.open(url, winery ? winery.name : 'QR Code');
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

        <label>Logo</label>
        <div id="winery-logo-container"></div>

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

        <label for="winery-theme">Guest Page Theme</label>
        <select id="winery-theme" name="theme_preference">
          <option value="auto" ${(winery?.theme_preference || 'auto') === 'auto' ? 'selected' : ''}>Auto (follows guest's device)</option>
          <option value="day" ${winery?.theme_preference === 'day' ? 'selected' : ''}>Day (always light)</option>
          <option value="night" ${winery?.theme_preference === 'night' ? 'selected' : ''}>Night (always dark)</option>
        </select>

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

        <div id="winery-translations-container"></div>

        <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Create Winery'}</button>
        <button type="button" id="cancel-btn" class="btn btn--secondary">Cancel</button>
      </form>
      ${isEdit ? `
      <section class="admin-winery-form__qr">
        <h2>QR Code</h2>
        <div id="winery-qr-container"></div>
        <p id="winery-qr-url" class="qr-modal__url"></p>
        <div class="qr-modal__actions">
          <button type="button" id="winery-qr-download" class="btn btn--small btn--primary">Download PNG</button>
          <button type="button" id="winery-qr-print" class="btn btn--small btn--outline">Print</button>
        </div>
      </section>` : ''}
    </div>
  `;

  const tempId = crypto.randomUUID();
  const logoUpload = createImageUpload(document.getElementById('winery-logo-container'), {
    bucket: 'winery-logos',
    pathPrefix: isEdit ? winery.id : tempId,
    currentUrl: winery?.logo_url || null,
    label: 'Winery Logo',
    id: 'winery-logo',
  });

  const translationPanel = createTranslationPanel(document.getElementById('winery-translations-container'), {
    fields: {
      name: { label: 'Name', type: 'text' },
      description: { label: 'Description', type: 'textarea' },
      hours: { label: 'Hours', type: 'text' },
    },
    existingTranslations: winery?.translations?.es || null,
    getSourceValues: () => ({
      name: document.getElementById('winery-name').value.trim(),
      description: document.getElementById('winery-description').value.trim(),
      hours: document.getElementById('winery-hours').value.trim(),
    }),
  });

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/wineries'));

  // Render QR code for existing wineries
  if (isEdit) {
    const url = getWineryUrl(winery.slug);
    document.getElementById('winery-qr-url').textContent = url;
    generateQR(document.getElementById('winery-qr-container'), url);

    document.getElementById('winery-qr-download').addEventListener('click', () => {
      const canvas = document.querySelector('#winery-qr-container canvas');
      if (canvas) downloadQR(canvas, winery.name);
    });
    document.getElementById('winery-qr-print').addEventListener('click', () => {
      const canvas = document.querySelector('#winery-qr-container canvas');
      if (canvas) printQR(canvas, winery.name);
    });
  }

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
      logo_url: logoUpload.getUrl(),
      theme_preference: document.getElementById('winery-theme').value,
      translations: translationPanel.getTranslations() || winery?.translations || {},
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
