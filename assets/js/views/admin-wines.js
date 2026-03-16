import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';
import { generateQR, getBottleUrl, downloadQR, printQR } from '../components/qr-generator.js';
import { createQRModal } from '../components/qr-modal.js';
import { createTagInput } from '../components/tag-input.js';
import { createImageUpload } from '../components/image-upload.js';
import { createTranslationPanel } from '../components/translation-panel.js';

export async function renderWineList(container) {
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
    `;

    const qrModal = createQRModal(container);

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
    container.querySelectorAll('[data-qr]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wineId = btn.dataset.qr;
        const slug = btn.dataset.slug;
        const url = getBottleUrl(slug, wineId);
        const w = wines.find(x => x.id === wineId);
        qrModal.open(url, w ? w.name : 'QR Code');
      });
    });
  } catch (err) {
    logger.error('Failed to load wines', err);
    showToast('Could not load wine list.', 'error');
  }
}

export async function renderWineForm(container, wineId) {
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

        <label>Wine Image</label>
        <div id="wine-image-container"></div>

        <label>Food Pairings</label>
        <div id="wine-pairings-container"></div>

        <div id="wine-translations-container"></div>

        <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Create Wine'}</button>
        <button type="button" id="cancel-btn" class="btn btn--secondary">Cancel</button>
      </form>
      ${isEdit ? `
      <section class="admin-wine-form__qr">
        <h2>QR Code</h2>
        <div id="wine-qr-container"></div>
        <p id="wine-qr-url" class="qr-modal__url"></p>
        <div class="qr-modal__actions">
          <button type="button" id="wine-qr-download" class="btn btn--small btn--primary">Download PNG</button>
          <button type="button" id="wine-qr-print" class="btn btn--small btn--outline">Print</button>
        </div>
      </section>` : ''}
    </div>
  `;

  const wineImageUpload = createImageUpload(document.getElementById('wine-image-container'), {
    bucket: 'wine-images',
    pathPrefix: `${winery.id}`,
    currentUrl: wine?.image_url || null,
    label: 'Wine Image',
    id: 'wine-image',
  });

  const pairingsInput = createTagInput(document.getElementById('wine-pairings-container'), {
    initialTags: wine?.food_pairings || [],
    placeholder: 'e.g. Grilled steak — press Enter',
    id: 'wine-pairings',
  });

  const translationPanel = createTranslationPanel(document.getElementById('wine-translations-container'), {
    fields: {
      name: { label: 'Name', type: 'text' },
      varietal: { label: 'Varietal', type: 'text' },
      region: { label: 'Region', type: 'text' },
      description: { label: 'Description', type: 'textarea' },
      tasting_notes: { label: 'Tasting Notes', type: 'textarea' },
      food_pairings: { label: 'Food Pairings', type: 'tags' },
    },
    existingTranslations: wine?.translations?.es || null,
    getSourceValues: () => ({
      name: document.getElementById('wine-name').value.trim(),
      varietal: document.getElementById('wine-varietal').value.trim(),
      region: document.getElementById('wine-region').value.trim(),
      description: document.getElementById('wine-description').value.trim(),
      tasting_notes: document.getElementById('wine-tasting-notes').value.trim(),
      food_pairings: pairingsInput.getTags(),
    }),
  });

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/wines'));

  // Render QR code for existing wines
  if (isEdit) {
    const url = getBottleUrl(winery.slug, wine.id);
    document.getElementById('wine-qr-url').textContent = url;
    generateQR(document.getElementById('wine-qr-container'), url);

    document.getElementById('wine-qr-download').addEventListener('click', () => {
      const canvas = document.querySelector('#wine-qr-container canvas');
      if (canvas) downloadQR(canvas, wine.name);
    });
    document.getElementById('wine-qr-print').addEventListener('click', () => {
      const canvas = document.querySelector('#wine-qr-container canvas');
      if (canvas) printQR(canvas, wine.name);
    });
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
      food_pairings: pairingsInput.getTags(),
      image_url: wineImageUpload.getUrl(),
      translations: translationPanel.getTranslations() || wine?.translations || {},
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
