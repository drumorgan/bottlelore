import { generateQR, downloadQR, printQR } from './qr-generator.js';

/**
 * Create a QR code modal and append it to the given container.
 * Returns an object with open() and close() methods.
 *
 * @param {HTMLElement} container — element to append the modal into
 * @returns {{ open(url: string, name: string): Promise<void>, close(): void }}
 */
export function createQRModal(container) {
  const modal = document.createElement('div');
  modal.className = 'qr-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="qr-modal__backdrop"></div>
    <div class="qr-modal__content">
      <h2 class="qr-modal__title">QR Code</h2>
      <div class="qr-modal__canvas"></div>
      <p class="qr-modal__url"></p>
      <div class="qr-modal__actions">
        <button class="btn btn--small btn--primary qr-modal__download">Download PNG</button>
        <button class="btn btn--small btn--outline qr-modal__print">Print</button>
      </div>
      <button class="btn btn--secondary qr-modal__close">Close</button>
    </div>
  `;
  container.appendChild(modal);

  const titleEl = modal.querySelector('.qr-modal__title');
  const canvasContainer = modal.querySelector('.qr-modal__canvas');
  const urlEl = modal.querySelector('.qr-modal__url');
  let currentName = '';

  function getCanvas() {
    return canvasContainer.querySelector('canvas');
  }

  function close() {
    modal.hidden = true;
  }

  async function open(url, name) {
    currentName = name;
    titleEl.textContent = name;
    urlEl.textContent = url;
    canvasContainer.innerHTML = '';
    modal.hidden = false;
    await generateQR(canvasContainer, url);
  }

  modal.querySelector('.qr-modal__download').addEventListener('click', () => {
    const canvas = getCanvas();
    if (canvas) downloadQR(canvas, currentName);
  });

  modal.querySelector('.qr-modal__print').addEventListener('click', () => {
    const canvas = getCanvas();
    if (canvas) printQR(canvas, currentName);
  });

  modal.querySelector('.qr-modal__close').addEventListener('click', close);
  modal.querySelector('.qr-modal__backdrop').addEventListener('click', close);

  return { open, close };
}
