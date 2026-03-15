import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { getWineById } from '../supabase-gateway.js';
import { navigate } from '../router.js';
import { applyTheme } from '../theme.js';

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

  applyTheme(winery.theme_preference);

  // Build meta items (varietal, vintage, region)
  const metaItems = [];
  if (wine.varietal) metaItems.push(escapeHtml(wine.varietal));
  if (wine.vintage_year) metaItems.push(escapeHtml(String(wine.vintage_year)));
  if (wine.region) metaItems.push(escapeHtml(wine.region));
  const metaHtml = metaItems.length > 0
    ? `<div class="wine-meta">${metaItems.map((m, i) => i > 0 ? `<div class="wine-meta-dot"></div><span>${m}</span>` : `<span>${m}</span>`).join('')}</div>`
    : '';

  // Build food pairings
  const pairingsHtml = (wine.food_pairings || []).map(p =>
    `<div class="pairing-item"><span class="pairing-bullet"></span>${escapeHtml(p)}</div>`
  ).join('');

  container.innerHTML = `
    <article class="bottle-page">
      <nav class="page-nav">
        <a class="page-nav__link" href="/${escapeHtml(winerySlug)}" data-nav>
          <span class="page-nav__arrow">&larr;</span> ${escapeHtml(winery.name || 'Winery')}
        </a>
      </nav>

      <div class="winery-name">${escapeHtml(winery.name)}</div>

      <div class="hero">
        <h1 class="wine-name">${escapeHtml(wine.name)}</h1>
        ${metaHtml}
      </div>

      <div class="ornament">&#10022;</div>
      <div class="ornament-rule">
        <div class="ornament-line"></div>
        <div class="ornament-diamond"></div>
        <div class="ornament-line"></div>
      </div>

      ${wine.image_url ? `<img class="bottle-page__image" src="${escapeHtml(wine.image_url)}" alt="${escapeHtml(wine.name)}" />` : ''}

      ${wine.description ? `<p class="description">${escapeHtml(wine.description)}</p>` : ''}

      ${wine.tasting_notes ? `
      <div class="section">
        <div class="section-label">Tasting Notes</div>
        <p class="section-text">${escapeHtml(wine.tasting_notes)}</p>
      </div>` : ''}

      ${pairingsHtml ? `
      <div class="section">
        <div class="section-label">Pairs Well With</div>
        <div class="pairings">${pairingsHtml}</div>
      </div>` : ''}

      ${wine.price ? `
      <div class="price-section">
        <span class="price-label">Price</span>
        <span class="price-value">${escapeHtml(wine.price)}</span>
        <span class="price-unit">per bottle</span>
      </div>` : ''}

      <div class="bottlelore-brand">
        <div class="brand-rule"></div>
        <div class="brand-name">BottleLore</div>
        <div class="brand-tagline">Every bottle has a story</div>
      </div>
    </article>
  `;

  // SPA navigation for internal links
  container.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
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
