import * as logger from '../logger.js';
import { showToast } from '../utils.js';
import QRCode from 'qrcode';

export async function generateQR(container, url) {
  logger.breadcrumb('generateQR', 'component', { url });

  try {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, url, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    container.innerHTML = '';
    container.appendChild(canvas);
  } catch (err) {
    logger.error('QR generation failed', err, { url });
    showToast('Could not generate QR code.', 'error');
  }
}

export function getBottleUrl(winerySlug, wineId) {
  return `${window.location.origin}/${winerySlug}/${wineId}`;
}

export function getFlightUrl(winerySlug, flightId) {
  return `${window.location.origin}/${winerySlug}/flight/${flightId}`;
}

export function getWineryUrl(winerySlug) {
  return `${window.location.origin}/${winerySlug}`;
}

/**
 * Download the QR canvas as a PNG file.
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename — without extension
 */
export function downloadQR(canvas, filename) {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Open a print dialog with just the QR code and wine name.
 * @param {HTMLCanvasElement} canvas
 * @param {string} wineName
 */
export function printQR(canvas, wineName) {
  const win = window.open('', '_blank');
  if (!win) {
    showToast('Pop-up blocked — please allow pop-ups to print.', 'error');
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html><head><title>QR — ${wineName.replace(/</g, '&lt;')}</title>
<style>
  body { text-align: center; font-family: sans-serif; padding: 2rem; }
  img { max-width: 400px; }
  h1 { font-size: 1.25rem; margin-bottom: 1rem; }
  @media print { button { display: none; } }
</style></head><body>
<h1>${wineName.replace(/</g, '&lt;')}</h1>
<img src="${canvas.toDataURL('image/png')}" alt="QR Code" />
<br><button onclick="window.print()">Print</button>
</body></html>`);
  win.document.close();
}
