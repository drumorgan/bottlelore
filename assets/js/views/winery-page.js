import * as logger from '../logger.js';
import { escapeHtml, showToast, MAX_RETRIES, RETRY_DELAY_MS, isNetworkError, delay } from '../utils.js';
import { getPublicWineryData } from '../supabase-gateway.js';
import { navigate } from '../router.js';
import { applyTheme } from '../theme.js';

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

  applyTheme(winery.theme_preference);

  const flightCards = flights.map(f => {
    const wineCount = f.flight_wines?.length || 0;
    return `
      <a class="card card--flight" href="/${escapeHtml(winery.slug)}/flight/${escapeHtml(f.id)}" data-nav>
        <h3 class="card__title">${escapeHtml(f.name)}</h3>
        ${f.description ? `<p class="card__desc">${escapeHtml(f.description)}</p>` : ''}
        <span class="card__meta">${wineCount} wine${wineCount !== 1 ? 's' : ''}</span>
        <span class="card__arrow">&rarr;</span>
      </a>
    `;
  }).join('');

  const wineCards = wines.map(w => `
    <a class="card card--wine" href="/${escapeHtml(winery.slug)}/${escapeHtml(w.id)}" data-nav>
      ${w.image_url ? `<img class="card__image" src="${escapeHtml(w.image_url)}" alt="${escapeHtml(w.name)}" />` : ''}
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(w.name)}</h3>
        ${w.varietal ? `<p class="card__varietal">${escapeHtml(w.varietal)}</p>` : ''}
        <div class="card__row">
          ${w.vintage_year ? `<span class="card__vintage">${escapeHtml(String(w.vintage_year))}</span>` : ''}
          ${w.price ? `<span class="card__price">${escapeHtml(w.price)}</span>` : ''}
        </div>
      </div>
      <span class="card__arrow">&rarr;</span>
    </a>
  `).join('');

  // Build details items
  const details = [];
  if (winery.hours) details.push(`<div class="winery-detail"><span class="winery-detail__label">Hours</span><span class="winery-detail__value">${escapeHtml(winery.hours)}</span></div>`);
  if (winery.phone) details.push(`<div class="winery-detail"><span class="winery-detail__label">Phone</span><span class="winery-detail__value">${escapeHtml(winery.phone)}</span></div>`);
  if (winery.website_url) details.push(`<div class="winery-detail"><span class="winery-detail__label">Website</span><a class="winery-detail__value winery-detail__link" href="${escapeHtml(winery.website_url)}" target="_blank" rel="noopener">${escapeHtml(winery.website_url.replace(/^https?:\/\//, ''))}</a></div>`);

  container.innerHTML = `
    <article class="winery-page">
      <header class="winery-page__header">
        ${winery.logo_url ? `<img class="winery-page__logo" src="${escapeHtml(winery.logo_url)}" alt="${escapeHtml(winery.name)} logo" />` : ''}
        <h1 class="winery-page__name">${escapeHtml(winery.name)}</h1>
        ${winery.location ? `<p class="winery-page__location">${escapeHtml(winery.location)}</p>` : ''}
      </header>

      <div class="ornament">&#10022;</div>
      <div class="ornament-rule">
        <div class="ornament-line"></div>
        <div class="ornament-diamond"></div>
        <div class="ornament-line"></div>
      </div>

      ${winery.description ? `<p class="description">${escapeHtml(winery.description)}</p>` : ''}

      ${details.length > 0 ? `
      <div class="section">
        <div class="section-label">Details</div>
        <div class="winery-details">${details.join('')}</div>
      </div>` : ''}

      ${flights.length > 0 ? `
      <div class="section">
        <div class="section-label">Tasting Flights</div>
        <div class="card-grid">${flightCards}</div>
      </div>` : ''}

      ${wines.length > 0 ? `
      <div class="section">
        <div class="section-label">Our Wines</div>
        <div class="card-grid">${wineCards}</div>
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
