import * as logger from '../logger.js';
import { escapeHtml, showToast, MAX_RETRIES, RETRY_DELAY_MS, isNetworkError, delay } from '../utils.js';
import { getPublicWineryData } from '../supabase-gateway.js';
import { navigate } from '../router.js';
import { applyTheme } from '../theme.js';
import { t, tc, createLanguageToggle } from '../i18n.js';

export async function render(container, winerySlug) {
  logger.breadcrumb('render winery-page', 'view', { winerySlug });

  container.innerHTML = `<div class="loading">${escapeHtml(t('public.loading_winery'))}</div>`;

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
          <h1>${escapeHtml(t('public.winery_not_found'))}</h1>
          <p>${escapeHtml(t('public.winery_not_found_desc'))}</p>
        </div>`;
    }
    return;
  }

  const { winery, wines, flights } = data;

  applyTheme(winery.theme_preference);

  renderContent(container, winery, wines, flights, winerySlug);
}

function renderContent(container, winery, wines, flights, winerySlug) {
  const wineryName = tc(winery, 'name') || '';
  const wineryDescription = tc(winery, 'description');
  const wineryHours = tc(winery, 'hours') || winery.hours;

  const flightCards = flights.map(f => {
    const wineCount = f.flight_wines?.length || 0;
    return `
      <a class="card card--flight" href="/${escapeHtml(winery.slug)}/flight/${escapeHtml(f.id)}" data-nav>
        <h3 class="card__title">${escapeHtml(tc(f, 'name') || f.name)}</h3>
        ${f.description ? `<p class="card__desc">${escapeHtml(tc(f, 'description') || f.description)}</p>` : ''}
        <span class="card__meta">${wineCount} wine${wineCount !== 1 ? 's' : ''}</span>
        <span class="card__arrow">&rarr;</span>
      </a>
    `;
  }).join('');

  const wineCards = wines.map(w => `
    <a class="card card--wine" href="/${escapeHtml(winery.slug)}/${escapeHtml(w.id)}" data-nav>
      ${w.image_url ? `<img class="card__image" src="${escapeHtml(w.image_url)}" alt="${escapeHtml(tc(w, 'name') || w.name)}" />` : ''}
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(tc(w, 'name') || w.name)}</h3>
        ${w.varietal ? `<p class="card__varietal">${escapeHtml(tc(w, 'varietal') || w.varietal)}</p>` : ''}
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
  if (winery.hours) details.push(`<div class="winery-detail"><span class="winery-detail__label">${escapeHtml(t('public.hours'))}</span><span class="winery-detail__value">${escapeHtml(wineryHours)}</span></div>`);
  if (winery.phone) details.push(`<div class="winery-detail"><span class="winery-detail__label">${escapeHtml(t('public.phone'))}</span><span class="winery-detail__value">${escapeHtml(winery.phone)}</span></div>`);
  if (winery.website_url) details.push(`<div class="winery-detail"><span class="winery-detail__label">${escapeHtml(t('public.website'))}</span><a class="winery-detail__value winery-detail__link" href="${escapeHtml(winery.website_url)}" target="_blank" rel="noopener">${escapeHtml(winery.website_url.replace(/^https?:\/\//, ''))}</a></div>`);

  container.innerHTML = `
    <article class="winery-page">
      <header class="winery-page__header">
        ${winery.logo_url ? `<img class="winery-page__logo" src="${escapeHtml(winery.logo_url)}" alt="${escapeHtml(wineryName)} logo" />` : ''}
        <h1 class="winery-page__name">${escapeHtml(wineryName)}</h1>
        ${winery.location ? `<p class="winery-page__location">${escapeHtml(winery.location)}</p>` : ''}
        <span id="lang-toggle-mount"></span>
      </header>

      <div class="ornament">&#10022;</div>
      <div class="ornament-rule">
        <div class="ornament-line"></div>
        <div class="ornament-diamond"></div>
        <div class="ornament-line"></div>
      </div>

      ${wineryDescription ? `<p class="description">${escapeHtml(wineryDescription)}</p>` : ''}

      ${details.length > 0 ? `
      <div class="section">
        <div class="section-label">${escapeHtml(t('public.details'))}</div>
        <div class="winery-details">${details.join('')}</div>
      </div>` : ''}

      ${flights.length > 0 ? `
      <div class="section">
        <div class="section-label">${escapeHtml(t('public.tasting_flights'))}</div>
        <div class="card-grid">${flightCards}</div>
      </div>` : ''}

      ${wines.length > 0 ? `
      <div class="section">
        <div class="section-label">${escapeHtml(t('public.our_wines'))}</div>
        <div class="card-grid">${wineCards}</div>
      </div>` : ''}

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
      renderContent(container, winery, wines, flights, winerySlug);
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

function renderConnectionError(container, winerySlug) {
  showToast(t('public.connection_toast'), 'error');

  container.innerHTML = `
    <div class="error-state error-state--offline">
      <h1>${escapeHtml(t('public.no_connection'))}</h1>
      <p>${escapeHtml(t('public.no_connection_desc'))}</p>
      <button class="btn btn--primary" id="retry-btn">${escapeHtml(t('public.try_again'))}</button>
    </div>`;

  document.getElementById('retry-btn').addEventListener('click', () => {
    render(container, winerySlug);
  });
}
