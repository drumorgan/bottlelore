import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { getWineById } from '../supabase-gateway.js';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/**
 * Distinguish network/connectivity errors from "real" 404-style errors.
 * Supabase returns a PostgrestError with a code for DB-level issues (e.g. PGRST116
 * for .single() returning no rows). A missing code usually means fetch itself failed.
 */
function isNetworkError(err) {
  if (err?.code === 'PGRST116') return false; // row not found — not a network issue
  if (err?.message?.includes('Failed to fetch')) return true;
  if (err?.message?.includes('NetworkError')) return true;
  if (err?.message?.includes('Load failed')) return true; // Safari
  if (err?.name === 'TypeError' && !err?.code) return true; // fetch() throws TypeError on network failure
  return false;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function render(container, winerySlug, wineId) {
  logger.breadcrumb('render bottle-page', 'view', { winerySlug, wineId });

  container.innerHTML = '<div class="loading">Loading wine details...</div>';

  let wine;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      wine = await getWineById(wineId);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isNetworkError(err)) {
        logger.warn('Retrying wine fetch', { attempt: attempt + 1, wineId, winerySlug });
        await delay(RETRY_DELAY_MS);
      } else {
        break;
      }
    }
  }

  if (lastError) {
    logger.error('Failed to load wine', lastError, { wineId, winerySlug });

    if (isNetworkError(lastError)) {
      renderConnectionError(container, winerySlug, wineId);
    } else {
      container.innerHTML = `
        <div class="error-state">
          <h1>Wine not found</h1>
          <p>This QR code may be invalid or the wine is no longer available.</p>
        </div>`;
    }
    return;
  }

  const winery = wine.wineries || {};

  // Validate that the URL slug matches the wine's actual winery
  if (winery.slug && winery.slug !== winerySlug) {
    logger.warn('Winery slug mismatch', { expected: winery.slug, got: winerySlug, wineId });
    container.innerHTML = '<div class="error-state"><h1>Wine not found</h1><p>This QR code may be invalid or the wine is no longer available.</p></div>';
    return;
  }
  const pairings = (wine.food_pairings || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');

  container.innerHTML = `
    <article class="bottle-page">
      <header class="bottle-page__header">
        <h2 class="bottle-page__winery">${escapeHtml(winery.name)}</h2>
        <h1 class="bottle-page__name">${escapeHtml(wine.name)}</h1>
        ${wine.vintage_year ? `<span class="bottle-page__vintage">${escapeHtml(String(wine.vintage_year))}</span>` : ''}
      </header>

      <div class="bottle-page__details">
        ${wine.varietal ? `<p class="bottle-page__varietal">${escapeHtml(wine.varietal)}</p>` : ''}
        ${wine.region ? `<p class="bottle-page__region">${escapeHtml(wine.region)}</p>` : ''}
        ${wine.price ? `<p class="bottle-page__price">${escapeHtml(wine.price)}</p>` : ''}
      </div>

      ${wine.description ? `
      <section class="bottle-page__section">
        <h3>About This Wine</h3>
        <p>${escapeHtml(wine.description)}</p>
      </section>` : ''}

      ${wine.tasting_notes ? `
      <section class="bottle-page__section">
        <h3>Tasting Notes</h3>
        <p>${escapeHtml(wine.tasting_notes)}</p>
      </section>` : ''}

      ${pairings ? `
      <section class="bottle-page__section">
        <h3>Food Pairings</h3>
        <ul class="bottle-page__pairings">${pairings}</ul>
      </section>` : ''}
    </article>
  `;
}

function renderConnectionError(container, winerySlug, wineId) {
  showToast('Connection problem — check your signal and try again.', 'error');

  container.innerHTML = `
    <div class="error-state error-state--offline">
      <h1>No Connection</h1>
      <p>We couldn't reach the server. Check your Wi-Fi or cellular signal and try again.</p>
      <button class="btn btn--primary" id="retry-btn">Try Again</button>
    </div>`;

  document.getElementById('retry-btn').addEventListener('click', () => {
    render(container, winerySlug, wineId);
  });
}
