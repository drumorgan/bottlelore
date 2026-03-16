import * as logger from '../logger.js';
import { escapeHtml, showToast, MAX_RETRIES, RETRY_DELAY_MS, isNetworkError, delay } from '../utils.js';
import { getPublicFlightById } from '../supabase-gateway.js';
import { navigate } from '../router.js';
import { applyTheme } from '../theme.js';
import { t, tc, createLanguageToggle } from '../i18n.js';

export async function render(container, winerySlug, flightId) {
  logger.breadcrumb('render flight-page', 'view', { winerySlug, flightId });

  container.innerHTML = `<div class="loading">${escapeHtml(t('public.loading_flight'))}</div>`;

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
          <h1>${escapeHtml(t('public.flight_not_found'))}</h1>
          <p>${escapeHtml(t('public.flight_not_found_desc'))}</p>
        </div>`;
    }
    return;
  }

  const winery = flight.wineries || {};

  if (winery.slug && winery.slug !== winerySlug) {
    logger.warn('Winery slug mismatch on flight', { expected: winery.slug, got: winerySlug, flightId });
    container.innerHTML = `<div class="error-state"><h1>${escapeHtml(t('public.flight_not_found'))}</h1><p>${escapeHtml(t('public.flight_not_found_desc'))}</p></div>`;
    return;
  }

  applyTheme(winery.theme_preference);

  // Sort wines by sort_order, filter to active only
  const sortedWines = (flight.flight_wines || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(fw => fw.wines)
    .filter(w => w && w.is_active !== false);

  renderContent(container, flight, winery, sortedWines, winerySlug, flightId);
}

function renderContent(container, flight, winery, sortedWines, winerySlug, flightId) {
  const wineryName = tc(winery, 'name') || t('public.back_to_winery');
  const flightName = tc(flight, 'name') || flight.name;
  const flightDescription = tc(flight, 'description');
  const count = sortedWines.length;
  const plural = count !== 1 ? 's' : '';

  const wineCards = sortedWines.map((w, idx) => {
    const pairings = tc(w, 'food_pairings') || w.food_pairings || [];
    const pairingsHtml = pairings.map(p =>
      `<div class="pairing-item"><span class="pairing-bullet"></span>${escapeHtml(p)}</div>`
    ).join('');
    return `
      <div class="flight-wine" style="animation-delay: ${0.1 + idx * 0.08}s">
        <a class="flight-wine__link" href="/${escapeHtml(winerySlug)}/${escapeHtml(w.id)}" data-nav>
          <span class="flight-wine__number">${idx + 1}</span>
          <span class="flight-wine__view">${escapeHtml(t('public.view_details'))} &rarr;</span>
        </a>
        ${w.image_url ? `<img class="flight-wine__image" src="${escapeHtml(w.image_url)}" alt="${escapeHtml(tc(w, 'name') || w.name)}" />` : ''}
        <h3 class="flight-wine__name">${escapeHtml(tc(w, 'name') || w.name)}</h3>
        <div class="flight-wine__meta">
          ${w.varietal ? `<span>${escapeHtml(tc(w, 'varietal') || w.varietal)}</span>` : ''}
          ${w.varietal && w.vintage_year ? '<div class="wine-meta-dot"></div>' : ''}
          ${w.vintage_year ? `<span>${escapeHtml(String(w.vintage_year))}</span>` : ''}
        </div>
        ${w.price ? `<p class="flight-wine__price">${escapeHtml(w.price)}</p>` : ''}
        ${w.description ? `<p class="flight-wine__desc">${escapeHtml(tc(w, 'description') || w.description)}</p>` : ''}
        ${w.tasting_notes ? `
          <div class="flight-wine__notes">
            <span class="flight-wine__notes-label">${escapeHtml(t('public.tasting_notes'))}</span>
            <p>${escapeHtml(tc(w, 'tasting_notes') || w.tasting_notes)}</p>
          </div>` : ''}
        ${pairingsHtml ? `
          <div class="flight-wine__pairings">
            <span class="flight-wine__pairings-label">${escapeHtml(t('public.pairs_with'))}</span>
            <div class="pairings">${pairingsHtml}</div>
          </div>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <article class="flight-page">
      <nav class="page-nav">
        <a class="page-nav__link" href="/${escapeHtml(winerySlug)}" data-nav>
          <span class="page-nav__arrow">&larr;</span> ${escapeHtml(wineryName)}
        </a>
        <span id="lang-toggle-mount"></span>
      </nav>

      <header class="flight-page__header">
        <div class="winery-name">${escapeHtml(wineryName)}</div>
        <h1 class="wine-name">${escapeHtml(flightName)}</h1>
        ${flightDescription ? `<p class="description" style="margin-top: 12px">${escapeHtml(flightDescription)}</p>` : ''}
      </header>

      <div class="ornament">&#10022;</div>
      <div class="ornament-rule">
        <div class="ornament-line"></div>
        <div class="ornament-diamond"></div>
        <div class="ornament-line"></div>
      </div>

      <div class="section">
        <div class="section-label">${escapeHtml(t('public.wines_in_flight', { count, plural }))}</div>
        ${count === 0 ? `<p class="section-text">${escapeHtml(t('public.no_wines_in_flight'))}</p>` : `<div class="flight-wines">${wineCards}</div>`}
      </div>

      <div class="bottlelore-brand">
        <div class="brand-rule"></div>
        <div class="brand-name">${escapeHtml(t('app.name'))}</div>
        <div class="brand-tagline">${escapeHtml(t('app.tagline'))}</div>
      </div>
    </article>
  `;

  // Mount language toggle
  const mount = document.getElementById('lang-toggle-mount');
  if (mount) {
    mount.appendChild(createLanguageToggle(() => {
      renderContent(container, flight, winery, sortedWines, winerySlug, flightId);
    }));
  }

  // SPA navigation for internal links
  container.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}

function renderConnectionError(container, winerySlug, flightId) {
  showToast(t('public.connection_toast'), 'error');

  container.innerHTML = `
    <div class="error-state error-state--offline">
      <h1>${escapeHtml(t('public.no_connection'))}</h1>
      <p>${escapeHtml(t('public.no_connection_desc'))}</p>
      <button class="btn btn--primary" id="retry-btn">${escapeHtml(t('public.try_again'))}</button>
    </div>`;

  document.getElementById('retry-btn').addEventListener('click', () => {
    render(container, winerySlug, flightId);
  });
}
