import * as logger from '../logger.js';
import { escapeHtml, showToast, slugify } from '../utils.js';

import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';
import { createImageUpload } from '../components/image-upload.js';
import { generateQR, getWineryUrl, downloadQR, printQR } from '../components/qr-generator.js';
import { createTranslationPanel } from '../components/translation-panel.js';

export async function renderWineryProfile(container) {
  const winery = state.getCurrentWinery();
  const isSuperAdmin = state.getUserRole() === 'super_admin';

  if (!winery) {
    container.innerHTML = '<p>No winery assigned. Contact a super admin.</p>';
    return;
  }

  const superAdminFields = isSuperAdmin ? `
    <label for="profile-name">Name</label>
    <input type="text" id="profile-name" name="name" required value="${escapeHtml(winery.name || '')}" />

    <label for="profile-slug">Slug</label>
    <input type="text" id="profile-slug" name="slug" required value="${escapeHtml(winery.slug || '')}" pattern="[a-z0-9-]+" title="Lowercase letters, numbers, and hyphens only" />
  ` : `<p class="admin-winery-profile__name">${escapeHtml(winery.name)}</p>`;

  const activeToggle = isSuperAdmin ? `
    <div class="admin-winery-form__toggle">
      <label>
        <input type="checkbox" id="profile-active" ${winery.is_active ? 'checked' : ''} />
        Active (visible to guests)
      </label>
    </div>
  ` : '';

  container.innerHTML = `
    <div class="admin-winery-form">
      <h1>${isSuperAdmin ? 'Winery Settings' : 'Winery Profile'}</h1>
      <form id="profile-form">
        ${superAdminFields}

        <label>Logo</label>
        <div id="profile-logo-container"></div>

        <label for="profile-location">Location</label>
        <input type="text" id="profile-location" name="location" value="${escapeHtml(winery.location || '')}" />

        <label for="profile-description">Description</label>
        <textarea id="profile-description" name="description">${escapeHtml(winery.description || '')}</textarea>

        <label for="profile-phone">Phone</label>
        <input type="tel" id="profile-phone" name="phone" value="${escapeHtml(winery.phone || '')}" />

        <label for="profile-hours">Hours</label>
        <input type="text" id="profile-hours" name="hours" value="${escapeHtml(winery.hours || '')}" />

        <label for="profile-website">Website URL</label>
        <input type="url" id="profile-website" name="website_url" value="${escapeHtml(winery.website_url || '')}" />

        <label for="profile-theme">Guest Page Theme</label>
        <select id="profile-theme" name="theme_preference">
          <option value="auto" ${(winery.theme_preference || 'auto') === 'auto' ? 'selected' : ''}>Auto (follows guest's device)</option>
          <option value="day" ${winery.theme_preference === 'day' ? 'selected' : ''}>Day (always light)</option>
          <option value="night" ${winery.theme_preference === 'night' ? 'selected' : ''}>Night (always dark)</option>
        </select>

        <fieldset class="admin-winery-form__socials">
          <legend>Social Media</legend>
          <label for="profile-facebook">Facebook</label>
          <input type="url" id="profile-facebook" name="social_facebook" value="${escapeHtml(winery.social_facebook || '')}" />

          <label for="profile-instagram">Instagram</label>
          <input type="url" id="profile-instagram" name="social_instagram" value="${escapeHtml(winery.social_instagram || '')}" />

          <label for="profile-twitter">Twitter / X</label>
          <input type="url" id="profile-twitter" name="social_twitter" value="${escapeHtml(winery.social_twitter || '')}" />
        </fieldset>

        ${activeToggle}

        <div id="profile-translations-container"></div>

        <button type="submit" class="btn btn--primary">Save Changes</button>
      </form>
      <section class="admin-winery-form__qr">
        <h2>QR Code</h2>
        <div id="profile-qr-container"></div>
        <p id="profile-qr-url" class="qr-modal__url"></p>
        <div class="qr-modal__actions">
          <button type="button" id="profile-qr-download" class="btn btn--small btn--primary">Download PNG</button>
          <button type="button" id="profile-qr-print" class="btn btn--small btn--outline">Print</button>
        </div>
      </section>
    </div>
  `;

  const logoUpload = createImageUpload(document.getElementById('profile-logo-container'), {
    bucket: 'winery-logos',
    pathPrefix: winery.id,
    currentUrl: winery.logo_url || null,
    label: 'Winery Logo',
    id: 'profile-logo',
  });

  const translationPanel = createTranslationPanel(document.getElementById('profile-translations-container'), {
    fields: {
      name: { label: 'Name', type: 'text' },
      description: { label: 'Description', type: 'textarea' },
      hours: { label: 'Hours', type: 'text' },
    },
    existingTranslations: winery.translations?.es || null,
    getSourceValues: () => ({
      name: winery.name,
      description: document.getElementById('profile-description').value.trim(),
      hours: document.getElementById('profile-hours').value.trim(),
    }),
  });

  // Render QR code
  const qrUrl = getWineryUrl(winery.slug);
  document.getElementById('profile-qr-url').textContent = qrUrl;
  generateQR(document.getElementById('profile-qr-container'), qrUrl);

  document.getElementById('profile-qr-download').addEventListener('click', () => {
    const canvas = document.querySelector('#profile-qr-container canvas');
    if (canvas) downloadQR(canvas, winery.name);
  });
  document.getElementById('profile-qr-print').addEventListener('click', () => {
    const canvas = document.querySelector('#profile-qr-container canvas');
    if (canvas) printQR(canvas, winery.name);
  });

  // Auto-generate slug from name for super admins
  if (isSuperAdmin) {
    const nameInput = document.getElementById('profile-name');
    const slugInput = document.getElementById('profile-slug');
    const currentSlug = winery.slug || '';
    const derivedSlug = slugify(winery.name || '');
    let slugManuallyEdited = currentSlug !== derivedSlug;

    slugInput.addEventListener('input', () => { slugManuallyEdited = true; });
    nameInput.addEventListener('input', () => {
      if (!slugManuallyEdited) {
        slugInput.value = slugify(nameInput.value);
      }
    });
  }

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const data = {
      location: document.getElementById('profile-location').value.trim() || null,
      description: document.getElementById('profile-description').value.trim() || null,
      phone: document.getElementById('profile-phone').value.trim() || null,
      hours: document.getElementById('profile-hours').value.trim() || null,
      website_url: document.getElementById('profile-website').value.trim() || null,
      social_facebook: document.getElementById('profile-facebook').value.trim() || null,
      social_instagram: document.getElementById('profile-instagram').value.trim() || null,
      social_twitter: document.getElementById('profile-twitter').value.trim() || null,
      logo_url: logoUpload.getUrl(),
      theme_preference: document.getElementById('profile-theme').value,
      translations: translationPanel.getTranslations() || winery.translations || {},
    };

    if (isSuperAdmin) {
      data.name = document.getElementById('profile-name').value.trim();
      data.slug = document.getElementById('profile-slug').value.trim();
      const activeCheckbox = document.getElementById('profile-active');
      data.is_active = activeCheckbox.checked;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      const updated = await gateway.updateWinery(winery.id, data);
      state.setCurrentWinery({ ...winery, ...updated });
      showToast('Winery profile updated.', 'success');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    } catch (err) {
      logger.error('Failed to update winery profile', err);
      const msg = err.message?.includes('duplicate') ? 'A winery with that slug already exists.' : 'Could not save profile. Please try again.';
      showToast(msg, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}
