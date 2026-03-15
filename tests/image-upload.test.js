import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase-gateway
vi.mock('../assets/js/supabase-gateway.js', () => ({
  uploadImage: vi.fn(),
}));

// Mock logger
vi.mock('../assets/js/logger.js', () => ({
  error: vi.fn(),
  breadcrumb: vi.fn(),
}));

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-preview');
globalThis.URL.revokeObjectURL = vi.fn();

import { createImageUpload } from '../assets/js/components/image-upload.js';
import { uploadImage } from '../assets/js/supabase-gateway.js';

describe('image-upload', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────────────

  it('renders with no current image', () => {
    const { getUrl } = createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
    });

    expect(getUrl()).toBeNull();
    expect(container.querySelector('.image-upload')).not.toBeNull();
    expect(container.querySelector('.image-upload__placeholder')).not.toBeNull();
    expect(container.querySelector('.image-upload__preview')).toBeNull();
    expect(container.querySelector('.image-upload__remove')).toBeNull();
  });

  it('renders with existing image URL', () => {
    const { getUrl } = createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
      currentUrl: 'https://example.com/photo.jpg',
    });

    expect(getUrl()).toBe('https://example.com/photo.jpg');
    expect(container.querySelector('.image-upload__preview')).not.toBeNull();
    expect(container.querySelector('.image-upload__preview').src).toBe('https://example.com/photo.jpg');
    expect(container.querySelector('.image-upload__placeholder')).toBeNull();
    expect(container.querySelector('.image-upload__remove')).not.toBeNull();
  });

  it('applies custom id and label', () => {
    createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
      id: 'my-upload',
      label: 'Logo',
    });

    expect(container.querySelector('#my-upload')).not.toBeNull();
  });

  // ── Remove button ─────────────────────────────────────────────────────

  it('removes image when Remove button is clicked', () => {
    const { getUrl } = createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
      currentUrl: 'https://example.com/photo.jpg',
    });

    container.querySelector('.image-upload__remove').click();

    expect(getUrl()).toBeNull();
    expect(container.querySelector('.image-upload__preview')).toBeNull();
    expect(container.querySelector('.image-upload__placeholder')).not.toBeNull();
  });

  // ── File input ────────────────────────────────────────────────────────

  it('has a hidden file input with correct accept types', () => {
    createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
    });

    const input = container.querySelector('.image-upload__input');
    expect(input).not.toBeNull();
    expect(input.type).toBe('file');
    expect(input.accept).toContain('image/jpeg');
    expect(input.accept).toContain('image/png');
    expect(input.accept).toContain('image/webp');
  });

  // ── Upload flow ───────────────────────────────────────────────────────

  it('uploads file and updates URL on success', async () => {
    uploadImage.mockResolvedValue('https://storage.example.com/test/12345.jpg');

    const { getUrl } = createImageUpload(container, {
      bucket: 'wine-images',
      pathPrefix: 'w1',
    });

    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('.image-upload__input');

    // Simulate file selection
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(getUrl()).toBe('https://storage.example.com/test/12345.jpg');
    });

    expect(uploadImage).toHaveBeenCalledWith('wine-images', expect.stringContaining('w1/'), file);
    expect(container.querySelector('.image-upload__preview')).not.toBeNull();
  });

  it('shows toast on upload failure and reverts URL', async () => {
    uploadImage.mockRejectedValue(new Error('Storage error'));

    const { getUrl } = createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
    });

    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('.image-upload__input');

    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      const toast = document.getElementById('bl-toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Could not upload image');
    });

    expect(uploadImage).toHaveBeenCalled();
    expect(getUrl()).toBeNull();
  });

  // ── Validation ────────────────────────────────────────────────────────

  it('rejects files with invalid type', () => {
    createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
    });

    const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
    const input = container.querySelector('.image-upload__input');

    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    expect(uploadImage).not.toHaveBeenCalled();
    const toast = document.getElementById('bl-toast');
    expect(toast.textContent).toContain('JPEG, PNG, or WebP');
  });

  it('rejects files over 5 MB', () => {
    createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
    });

    // Create a file object with a large size
    const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    const input = container.querySelector('.image-upload__input');

    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    expect(uploadImage).not.toHaveBeenCalled();
    const toast = document.getElementById('bl-toast');
    expect(toast.textContent).toContain('under 5 MB');
  });

  // ── getUrl returns current state ──────────────────────────────────────

  it('getUrl reflects remove after upload', async () => {
    uploadImage.mockResolvedValue('https://storage.example.com/uploaded.jpg');

    const { getUrl } = createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
    });

    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' });
    const input = container.querySelector('.image-upload__input');
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(getUrl()).toBe('https://storage.example.com/uploaded.jpg');
    });

    // Now remove it
    container.querySelector('.image-upload__remove').click();
    expect(getUrl()).toBeNull();
  });

  // ── XSS ───────────────────────────────────────────────────────────────

  it('escapes HTML in current URL', () => {
    createImageUpload(container, {
      bucket: 'test-bucket',
      pathPrefix: 'test',
      currentUrl: '" onerror="alert(1)',
    });

    // The src attribute should be escaped, not executable
    const img = container.querySelector('.image-upload__preview');
    expect(img).not.toBeNull();
    // innerHTML should have the escaped form
    expect(container.innerHTML).not.toContain('" onerror="alert(1)');
  });
});
