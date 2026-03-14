import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { getWineById } from '../supabase-gateway.js';

export async function render(container, winerySlug, wineId) {
  logger.breadcrumb('render bottle-page', 'view', { winerySlug, wineId });

  container.innerHTML = '<div class="loading">Loading wine details...</div>';

  let wine;
  try {
    wine = await getWineById(wineId);
  } catch (err) {
    logger.error('Failed to load wine', err, { wineId, winerySlug });
    showToast('Could not load wine details.', 'error');
    container.innerHTML = '<div class="error-state"><h1>Wine not found</h1><p>This QR code may be invalid or the wine is no longer available.</p></div>';
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
