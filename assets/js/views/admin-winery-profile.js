import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';

export async function renderWineryProfile(container) {
  const winery = state.getCurrentWinery();

  if (!winery) {
    container.innerHTML = '<p>No winery assigned. Contact a super admin.</p>';
    return;
  }

  container.innerHTML = `
    <div class="admin-winery-form">
      <h1>Winery Profile</h1>
      <p class="admin-winery-profile__name">${escapeHtml(winery.name)}</p>
      <form id="profile-form">
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

        <fieldset class="admin-winery-form__socials">
          <legend>Social Media</legend>
          <label for="profile-facebook">Facebook</label>
          <input type="url" id="profile-facebook" name="social_facebook" value="${escapeHtml(winery.social_facebook || '')}" />

          <label for="profile-instagram">Instagram</label>
          <input type="url" id="profile-instagram" name="social_instagram" value="${escapeHtml(winery.social_instagram || '')}" />

          <label for="profile-twitter">Twitter / X</label>
          <input type="url" id="profile-twitter" name="social_twitter" value="${escapeHtml(winery.social_twitter || '')}" />
        </fieldset>

        <button type="submit" class="btn btn--primary">Save Changes</button>
      </form>
    </div>
  `;

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
    };

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
      showToast('Could not save profile. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  });
}
