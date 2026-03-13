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
