import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { getPublicFlightById } from '../supabase-gateway.js';

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

export async function render(container, winerySlug, flightId) {
  logger.breadcrumb('render flight-page', 'view', { winerySlug, flightId });

  container.innerHTML = '<div class="loading">Loading flight details...</div>';

  let flight;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      flight = await getPublicFlightById(flightId);
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isNetworkError(err)) {
        logger.warn('Retrying flight fetch', { attempt: attempt + 1, flightId, winerySlug });
        await delay(RETRY_DELAY_MS);
      } else {
        break;
      }
    }
  }

  if (lastError) {
    logger.error('Failed to load flight', lastError, { flightId, winerySlug });

    if (isNetworkError(lastError)) {
      renderConnectionError(container, winerySlug, flightId);
    } else {
      container.innerHTML = `
        <div class="error-state">
          <h1>Flight not found</h1>
          <p>This QR code may be invalid or the flight is no longer available.</p>
        </div>`;
    }
    return;
  }

  const winery = flight.wineries || {};

  if (winery.slug && winery.slug !== winerySlug) {
    logger.warn('Winery slug mismatch on flight', { expected: winery.slug, got: winerySlug, flightId });
    container.innerHTML = '<div class="error-state"><h1>Flight not found</h1><p>This QR code may be invalid or the flight is no longer available.</p></div>';
    return;
  }

  // Sort wines by sort_order, filter to active only
  const sortedWines = (flight.flight_wines || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(fw => fw.wines)
    .filter(w => w && w.is_active !== false);

  const wineCards = sortedWines.map(w => {
    const pairings = (w.food_pairings || []).map(p => `<li>${escapeHtml(p)}</li>`).join('');
    return `
      <div class="flight-page__wine-card">
        ${w.image_url ? `<img class="flight-page__wine-image" src="${escapeHtml(w.image_url)}" alt="${escapeHtml(w.name)}" />` : ''}
        <div class="flight-page__wine-info">
          <h3 class="flight-page__wine-name">${escapeHtml(w.name)}</h3>
          ${w.varietal ? `<p class="flight-page__wine-varietal">${escapeHtml(w.varietal)}</p>` : ''}
          ${w.vintage_year ? `<span class="flight-page__wine-vintage">${escapeHtml(String(w.vintage_year))}</span>` : ''}
          ${w.price ? `<p class="flight-page__wine-price">${escapeHtml(w.price)}</p>` : ''}
          ${w.description ? `<p class="flight-page__wine-desc">${escapeHtml(w.description)}</p>` : ''}
          ${w.tasting_notes ? `<p class="flight-page__wine-notes"><strong>Tasting Notes:</strong> ${escapeHtml(w.tasting_notes)}</p>` : ''}
          ${pairings ? `<ul class="flight-page__wine-pairings">${pairings}</ul>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <article class="flight-page">
      <header class="flight-page__header">
        <h2 class="flight-page__winery">${escapeHtml(winery.name)}</h2>
        <h1 class="flight-page__name">${escapeHtml(flight.name)}</h1>
        ${flight.description ? `<p class="flight-page__description">${escapeHtml(flight.description)}</p>` : ''}
      </header>

      <section class="flight-page__wines">
        <h2>${escapeHtml(String(sortedWines.length))} Wine${sortedWines.length !== 1 ? 's' : ''} in This Flight</h2>
        ${sortedWines.length === 0 ? '<p>No wines are currently available in this flight.</p>' : wineCards}
      </section>
    </article>
  `;
}

function renderConnectionError(container, winerySlug, flightId) {
  showToast('Connection problem — check your signal and try again.', 'error');

  container.innerHTML = `
    <div class="error-state error-state--offline">
      <h1>No Connection</h1>
      <p>We couldn't reach the server. Check your Wi-Fi or cellular signal and try again.</p>
      <button class="btn btn--primary" id="retry-btn">Try Again</button>
    </div>`;

  document.getElementById('retry-btn').addEventListener('click', () => {
    render(container, winerySlug, flightId);
  });
}
