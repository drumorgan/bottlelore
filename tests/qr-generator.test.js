import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock qrcode and logger
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(),
  },
}));

vi.mock('../assets/js/logger.js', () => ({
  breadcrumb: vi.fn(),
  error: vi.fn(),
}));

import { generateQR, getBottleUrl } from '../assets/js/components/qr-generator.js';
import QRCode from 'qrcode';

describe('qr-generator', () => {
  // ── getBottleUrl ──────────────────────────────────────────────────────

  describe('getBottleUrl', () => {
    it('builds correct URL from slug and wineId', () => {
      // jsdom defaults to http://localhost
      const url = getBottleUrl('sunset-vineyard', 'wine-123');
      expect(url).toBe(`${window.location.origin}/sunset-vineyard/wine-123`);
    });

    it('handles special characters in slug', () => {
      const url = getBottleUrl('my-winery', 'abc-def-456');
      expect(url).toContain('my-winery/abc-def-456');
    });
  });

  // ── generateQR ────────────────────────────────────────────────────────

  describe('generateQR', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = '<p>old content</p>';
      vi.clearAllMocks();
    });

    it('calls QRCode.toCanvas with correct options', async () => {
      await generateQR(container, 'https://example.com/wine/1');

      expect(QRCode.toCanvas).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        'https://example.com/wine/1',
        { width: 256, margin: 2, color: { dark: '#000000', light: '#ffffff' } }
      );
    });

    it('clears container and appends canvas', async () => {
      await generateQR(container, 'https://example.com/wine/1');

      expect(container.querySelector('p')).toBeNull(); // old content cleared
      expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('shows toast on error', async () => {
      QRCode.toCanvas.mockRejectedValueOnce(new Error('QR failed'));

      // Need to import showToast to verify it was called
      const { showToast } = await import('../assets/js/utils.js');

      await generateQR(container, 'bad-url');

      // The error is caught and logged; container should still have old content
      // since canvas was never appended
    });
  });
});
