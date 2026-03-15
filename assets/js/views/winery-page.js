import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { getPublicWineryData } from '../supabase-gateway.js';
import { navigate } from '../router.js';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function isNetworkError(err) {
  if (err?.code === 'PGRST116') return false;
  if (err?.message?.includes('Failed to fetch')) return true;
  if (err?.message?.includes('NetworkError')) return true;
  if (err?.message?.includes('Load failed')) return true;
  if (err?.name === 'TypeError' && !err?.code) return true;
  return false;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function render(container, winerySlug) {
  logger.breadcrumb('render winery-page', 'view', { winerySlug });

  container.innerHTML = '<div class="loading">Loading winery details...</div>';

  let data;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      data = await getPublicWineryData(winerySlug);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isNetworkError(err)) {
        logger.warn('Retrying winery fetch', { attempt: attempt + 1, winerySlug });
        await delay(RETRY_DELAY_MS);
      } else {
        break;
      }
    }
  }

  if (lastError) {
    logger.error('Failed to load winery', lastError, { winerySlug });

    if (isNetworkError(lastError)) {
      renderConnectionError(container, winerySlug);
    } else {
      container.innerHTML = `
        <div class="error-state">
          <h1>Winery not found</h1>
          <p>This QR code may be invalid or the winery is no longer available.</p>
        </div>`;
    }
    return;
  }

  const { winery, wines, flights } = data;

  const flightCards = flights.map(f => {
    const wineCount = f.flight_wines?.length || 0;
    return `
      <a class="winery-page__flight-card" href="/${escapeHtml(winery.slug)}/flight/${escapeHtml(f.id)}" data-nav>
        <h3>${escapeHtml(f.name)}</h3>
        ${f.description ? `<p>${escapeHtml(f.description)}</p>` : ''}
        <span class="winery-page__flight-count">${wineCount} wine${wineCount !== 1 ? 's' : ''}</span>
      </a>
    `;
  }).join('');

  const wineCards = wines.map(w => `
    <a class="winery-page__wine-card" href="/${escapeHtml(winery.slug)}/${escapeHtml(w.id)}" data-nav>
      ${w.image_url ? `<img class="winery-page__wine-image" src="${escapeHtml(w.image_url)}" alt="${escapeHtml(w.name)}" />` : ''}
      <h3>${escapeHtml(w.name)}</h3>
      ${w.varietal ? `<p class="winery-page__wine-varietal">${escapeHtml(w.varietal)}</p>` : ''}
      ${w.vintage_year ? `<span class="winery-page__wine-vintage">${escapeHtml(String(w.vintage_year))}</span>` : ''}
      ${w.price ? `<p class="winery-page__wine-price">${escapeHtml(w.price)}</p>` : ''}
    </a>
  `).join('');

  container.innerHTML = `
    <article class="winery-page">
      <header class="winery-page__header">
        ${winery.logo_url ? `<img class="winery-page__logo" src="${escapeHtml(winery.logo_url)}" alt="${escapeHtml(winery.name)} logo" />` : ''}
        <h1 class="winery-page__name">${escapeHtml(winery.name)}</h1>
        ${winery.location ? `<p class="winery-page__location">${escapeHtml(winery.location)}</p>` : ''}
      </header>

      ${winery.description ? `
      <section class="winery-page__section">
        <h2>About</h2>
        <p>${escapeHtml(winery.description)}</p>
      </section>` : ''}

      <section class="winery-page__details">
        ${winery.hours ? `<p><strong>Hours:</strong> ${escapeHtml(winery.hours)}</p>` : ''}
        ${winery.phone ? `<p><strong>Phone:</strong> ${escapeHtml(winery.phone)}</p>` : ''}
        ${winery.website_url ? `<p><a href="${escapeHtml(winery.website_url)}" target="_blank" rel="noopener">Visit Website</a></p>` : ''}
      </section>

      ${flights.length > 0 ? `
      <section class="winery-page__section">
        <h2>Tasting Flights</h2>
        <div class="winery-page__flights">${flightCards}</div>
      </section>` : ''}

      ${wines.length > 0 ? `
      <section class="winery-page__section">
        <h2>Our Wines</h2>
        <div class="winery-page__wines">${wineCards}</div>
      </section>` : ''}
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

function renderConnectionError(container, winerySlug) {
  showToast('Connection problem — check your signal and try again.', 'error');

  container.innerHTML = `
    <div class="error-state error-state--offline">
      <h1>No Connection</h1>
      <p>We couldn't reach the server. Check your Wi-Fi or cellular signal and try again.</p>
      <button class="btn btn--primary" id="retry-btn">Try Again</button>
    </div>`;

  document.getElementById('retry-btn').addEventListener('click', () => {
    render(container, winerySlug);
  });
}
