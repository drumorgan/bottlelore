import * as logger from '../logger.js';
import { escapeHtml, showToast, MAX_RETRIES, RETRY_DELAY_MS, isNetworkError, delay } from '../utils.js';
import { getWineById } from '../supabase-gateway.js';
import { navigate } from '../router.js';
import { applyTheme } from '../theme.js';
import { t, tc, createLanguageToggle } from '../i18n.js';

export async function render(container, winerySlug, wineId) {
  logger.breadcrumb('render bottle-page', 'view', { winerySlug, wineId });

  container.innerHTML = `<div class="loading">${escapeHtml(t('public.loading_wine'))}</div>`;

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
          <h1>${escapeHtml(t('public.wine_not_found'))}</h1>
          <p>${escapeHtml(t('public.wine_not_found_desc'))}</p>
        </div>`;
    }
    return;
  }

  const winery = wine.wineries || {};

  // Validate that the URL slug matches the wine's actual winery
  if (winery.slug && winery.slug !== winerySlug) {
    logger.warn('Winery slug mismatch', { expected: winery.slug, got: winerySlug, wineId });
    container.innerHTML = `<div class="error-state"><h1>${escapeHtml(t('public.wine_not_found'))}</h1><p>${escapeHtml(t('public.wine_not_found_desc'))}</p></div>`;
    return;
  }

  applyTheme(winery.theme_preference);

  renderContent(container, wine, winery, winerySlug, wineId);
}

function renderContent(container, wine, winery, winerySlug, wineId) {
  // Content fields use tc() for translation fallback
  const wineName = tc(wine, 'name') || '';
  const wineDescription = tc(wine, 'description');
  const wineTastingNotes = tc(wine, 'tasting_notes');
  const wineryName = tc(winery, 'name') || t('public.back_to_winery');

  // Build meta items (varietal, vintage, region)
  const metaItems = [];
  if (wine.varietal) metaItems.push(escapeHtml(tc(wine, 'varietal') || wine.varietal));
  if (wine.vintage_year) metaItems.push(escapeHtml(String(wine.vintage_year)));
  if (wine.region) metaItems.push(escapeHtml(tc(wine, 'region') || wine.region));
  const metaHtml = metaItems.length > 0
    ? `<div class="wine-meta">${metaItems.map((m, i) => i > 0 ? `<div class="wine-meta-dot"></div><span>${m}</span>` : `<span>${m}</span>`).join('')}</div>`
    : '';

  // Build food pairings
  const pairings = tc(wine, 'food_pairings') || wine.food_pairings || [];
  const pairingsHtml = pairings.map(p =>
    `<div class="pairing-item"><span class="pairing-bullet"></span>${escapeHtml(p)}</div>`
  ).join('');

  container.innerHTML = `
    <article class="bottle-page">
      <nav class="page-nav">
        <a class="page-nav__link" href="/${escapeHtml(winerySlug)}" data-nav>
          <span class="page-nav__arrow">&larr;</span> ${escapeHtml(wineryName)}
        </a>
        <span id="lang-toggle-mount"></span>
      </nav>

      <div class="winery-name">${escapeHtml(wineryName)}</div>

      <div class="hero">
        <h1 class="wine-name">${escapeHtml(wineName)}</h1>
        ${metaHtml}
      </div>

      <div class="ornament">&#10022;</div>
      <div class="ornament-rule">
        <div class="ornament-line"></div>
        <div class="ornament-diamond"></div>
        <div class="ornament-line"></div>
      </div>

      ${wine.image_url ? `<img class="bottle-page__image" src="${escapeHtml(wine.image_url)}" alt="${escapeHtml(wineName)}" />` : ''}

      ${wineDescription ? `<p class="description">${escapeHtml(wineDescription)}</p>` : ''}

      ${wineTastingNotes ? `
      <div class="section">
        <div class="section-label">${escapeHtml(t('public.tasting_notes'))}</div>
        <p class="section-text">${escapeHtml(wineTastingNotes)}</p>
      </div>` : ''}

      ${pairingsHtml ? `
      <div class="section">
        <div class="section-label">${escapeHtml(t('public.pairs_with'))}</div>
        <div class="pairings">${pairingsHtml}</div>
      </div>` : ''}

      ${wine.price ? `
      <div class="price-section">
        <span class="price-label">${escapeHtml(t('public.price_label'))}</span>
        <span class="price-value">${escapeHtml(wine.price)}</span>
        <span class="price-unit">${escapeHtml(t('public.per_bottle'))}</span>
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
      renderContent(container, wine, winery, winerySlug, wineId);
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

function renderConnectionError(container, winerySlug, wineId) {
  showToast(t('public.connection_toast'), 'error');

  container.innerHTML = `
    <div class="error-state error-state--offline">
      <h1>${escapeHtml(t('public.no_connection'))}</h1>
      <p>${escapeHtml(t('public.no_connection_desc'))}</p>
      <button class="btn btn--primary" id="retry-btn">${escapeHtml(t('public.try_again'))}</button>
    </div>`;

  document.getElementById('retry-btn').addEventListener('click', () => {
    render(container, winerySlug, wineId);
  });
}
