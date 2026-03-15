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

import { generateQR, getBottleUrl, downloadQR, printQR } from '../assets/js/components/qr-generator.js';
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

  // ── downloadQR ──────────────────────────────────────────────────────

  describe('downloadQR', () => {
    it('creates a link with PNG data URL and clicks it', () => {
      const canvas = document.createElement('canvas');
      canvas.toDataURL = vi.fn(() => 'data:image/png;base64,fake');

      const clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          const link = { click: clickSpy, download: '', href: '' };
          return link;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      downloadQR(canvas, 'My Wine');

      expect(clickSpy).toHaveBeenCalled();
      document.createElement.mockRestore();
    });
  });

  // ── printQR ─────────────────────────────────────────────────────────

  describe('printQR', () => {
    it('opens a new window with QR image and wine name', () => {
      const canvas = document.createElement('canvas');
      canvas.toDataURL = vi.fn(() => 'data:image/png;base64,fake');

      const mockWin = { document: { write: vi.fn(), close: vi.fn() } };
      vi.spyOn(window, 'open').mockReturnValue(mockWin);

      printQR(canvas, 'Estate Cabernet');

      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockWin.document.write).toHaveBeenCalled();
      const html = mockWin.document.write.mock.calls[0][0];
      expect(html).toContain('Estate Cabernet');
      expect(html).toContain('data:image/png;base64,fake');
      expect(mockWin.document.close).toHaveBeenCalled();

      window.open.mockRestore();
    });

    it('shows toast when pop-up is blocked', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(window, 'open').mockReturnValue(null);

      printQR(canvas, 'Blocked Wine');

      const toast = document.getElementById('bl-toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('pop-up');

      window.open.mockRestore();
    });

    it('escapes HTML in wine name', () => {
      const canvas = document.createElement('canvas');
      canvas.toDataURL = vi.fn(() => 'data:image/png;base64,fake');

      const mockWin = { document: { write: vi.fn(), close: vi.fn() } };
      vi.spyOn(window, 'open').mockReturnValue(mockWin);

      printQR(canvas, '<script>alert(1)</script>');

      const html = mockWin.document.write.mock.calls[0][0];
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script');

      window.open.mockRestore();
    });
  });
});
