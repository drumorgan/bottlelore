import * as logger from '../logger.js';
import { escapeHtml, showToast, MAX_RETRIES, RETRY_DELAY_MS, isNetworkError, delay } from '../utils.js';
import { getPublicFlightById } from '../supabase-gateway.js';
import { navigate } from '../router.js';
import { applyTheme } from '../theme.js';

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

  applyTheme(winery.theme_preference);

  // Sort wines by sort_order, filter to active only
  const sortedWines = (flight.flight_wines || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(fw => fw.wines)
    .filter(w => w && w.is_active !== false);

  const wineCards = sortedWines.map((w, idx) => {
    const pairings = (w.food_pairings || []).map(p =>
      `<div class="pairing-item"><span class="pairing-bullet"></span>${escapeHtml(p)}</div>`
    ).join('');
    return `
      <div class="flight-wine" style="animation-delay: ${0.1 + idx * 0.08}s">
        <a class="flight-wine__link" href="/${escapeHtml(winerySlug)}/${escapeHtml(w.id)}" data-nav>
          <span class="flight-wine__number">${idx + 1}</span>
          <span class="flight-wine__view">View details &rarr;</span>
        </a>
        ${w.image_url ? `<img class="flight-wine__image" src="${escapeHtml(w.image_url)}" alt="${escapeHtml(w.name)}" />` : ''}
        <h3 class="flight-wine__name">${escapeHtml(w.name)}</h3>
        <div class="flight-wine__meta">
          ${w.varietal ? `<span>${escapeHtml(w.varietal)}</span>` : ''}
          ${w.varietal && w.vintage_year ? '<div class="wine-meta-dot"></div>' : ''}
          ${w.vintage_year ? `<span>${escapeHtml(String(w.vintage_year))}</span>` : ''}
        </div>
        ${w.price ? `<p class="flight-wine__price">${escapeHtml(w.price)}</p>` : ''}
        ${w.description ? `<p class="flight-wine__desc">${escapeHtml(w.description)}</p>` : ''}
        ${w.tasting_notes ? `
          <div class="flight-wine__notes">
            <span class="flight-wine__notes-label">Tasting Notes</span>
            <p>${escapeHtml(w.tasting_notes)}</p>
          </div>` : ''}
        ${pairings ? `
          <div class="flight-wine__pairings">
            <span class="flight-wine__pairings-label">Pairs With</span>
            <div class="pairings">${pairings}</div>
          </div>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <article class="flight-page">
      <nav class="page-nav">
        <a class="page-nav__link" href="/${escapeHtml(winerySlug)}" data-nav>
          <span class="page-nav__arrow">&larr;</span> ${escapeHtml(winery.name || 'Winery')}
        </a>
      </nav>

      <header class="flight-page__header">
        <div class="winery-name">${escapeHtml(winery.name)}</div>
        <h1 class="wine-name">${escapeHtml(flight.name)}</h1>
        ${flight.description ? `<p class="description" style="margin-top: 12px">${escapeHtml(flight.description)}</p>` : ''}
      </header>

      <div class="ornament">&#10022;</div>
      <div class="ornament-rule">
        <div class="ornament-line"></div>
        <div class="ornament-diamond"></div>
        <div class="ornament-line"></div>
      </div>

      <div class="section">
        <div class="section-label">${escapeHtml(String(sortedWines.length))} Wine${sortedWines.length !== 1 ? 's' : ''} in This Flight</div>
        ${sortedWines.length === 0 ? '<p class="section-text">No wines are currently available in this flight.</p>' : `<div class="flight-wines">${wineCards}</div>`}
      </div>

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
