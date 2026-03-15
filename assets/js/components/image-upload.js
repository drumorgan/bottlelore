import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { uploadImage } from '../supabase-gateway.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Creates an image upload widget with preview.
 *
 * @param {HTMLElement} container — element to render into
 * @param {Object} options
 * @param {string}  options.bucket — Supabase Storage bucket name
 * @param {string}  options.pathPrefix — path prefix for uploaded files (e.g. 'wineries/w1')
 * @param {string}  [options.currentUrl] — existing image URL to show as preview
 * @param {string}  [options.label] — label text (default: 'Image')
 * @param {string}  [options.id] — id for the wrapper element
 * @returns {{ getUrl: () => string|null }} — accessor for the current image URL
 */
export function createImageUpload(container, { bucket, pathPrefix, currentUrl = null, label = 'Image', id = 'image-upload' } = {}) {
  let imageUrl = currentUrl || null;
  let uploading = false;

  function render() {
    const preview = imageUrl
      ? `<img class="image-upload__preview" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)} preview" />`
      : '<div class="image-upload__placeholder">No image</div>';

    container.innerHTML = `
      <div class="image-upload" id="${escapeHtml(id)}">
        ${preview}
        <div class="image-upload__controls">
          <label class="btn btn--small btn--outline image-upload__btn">
            ${uploading ? 'Uploading…' : (imageUrl ? 'Change' : 'Upload')}
            <input type="file" class="image-upload__input" accept="${ACCEPTED_TYPES.join(',')}" ${uploading ? 'disabled' : ''} />
          </label>
          ${imageUrl ? '<button type="button" class="btn btn--small btn--outline image-upload__remove">Remove</button>' : ''}
        </div>
      </div>
    `;

    const fileInput = container.querySelector('.image-upload__input');
    fileInput.addEventListener('change', handleFileSelect);

    const removeBtn = container.querySelector('.image-upload__remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        imageUrl = null;
        render();
      });
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast('Please select a JPEG, PNG, or WebP image.', 'error');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('Image must be under 5 MB.', 'error');
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    const previewEl = container.querySelector('.image-upload__preview');
    if (previewEl) {
      previewEl.src = localPreview;
    }

    uploading = true;
    render();

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${Date.now()}.${ext}`;
      const path = `${pathPrefix}/${filename}`;

      imageUrl = await uploadImage(bucket, path, file);
      showToast('Image uploaded.', 'success');
    } catch (err) {
      logger.error('Image upload failed', err);
      showToast('Could not upload image. Please try again.', 'error');
      imageUrl = currentUrl || null; // revert to original
    } finally {
      uploading = false;
      URL.revokeObjectURL(localPreview);
      render();
    }
  }

  render();

  return {
    getUrl: () => imageUrl,
  };
}
