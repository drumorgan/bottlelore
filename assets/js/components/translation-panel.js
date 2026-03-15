/**
 * Reusable collapsible translation panel for admin forms.
 * Shows translatable fields with "Translate to Spanish" button.
 */

import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { translateContent } from '../supabase-gateway.js';

/**
 * Create a translation panel and append it to the container.
 *
 * @param {HTMLElement} container — element to append the panel to
 * @param {Object} options
 * @param {Object} options.fields — field definitions: { fieldKey: { label, type: 'text'|'textarea'|'tags' } }
 * @param {Object|null} options.existingTranslations — current translations.es object, or null
 * @param {Function} options.getSourceValues — returns { fieldKey: currentValue } from the form
 * @returns {{ getTranslations: () => Object|null }}
 */
export function createTranslationPanel(container, { fields, existingTranslations, getSourceValues }) {
  const panel = document.createElement('details');
  panel.className = 'translation-panel';

  const fieldEntries = Object.entries(fields);

  const fieldInputs = fieldEntries.map(([key, def]) => {
    const existing = existingTranslations?.[key] ?? '';
    const id = `trans-es-${key}`;

    if (def.type === 'textarea') {
      return `
        <label for="${id}">${escapeHtml(def.label)} (ES)</label>
        <textarea id="${id}" name="trans_${key}" class="translation-panel__input">${escapeHtml(Array.isArray(existing) ? existing.join(', ') : existing)}</textarea>
      `;
    }

    if (def.type === 'tags') {
      const val = Array.isArray(existing) ? existing.join(', ') : (existing || '');
      return `
        <label for="${id}">${escapeHtml(def.label)} (ES)</label>
        <input type="text" id="${id}" name="trans_${key}" class="translation-panel__input" value="${escapeHtml(val)}" placeholder="Comma-separated" />
      `;
    }

    // Default: text input
    return `
      <label for="${id}">${escapeHtml(def.label)} (ES)</label>
      <input type="text" id="${id}" name="trans_${key}" class="translation-panel__input" value="${escapeHtml(existing)}" />
    `;
  }).join('');

  panel.innerHTML = `
    <summary class="translation-panel__summary">Spanish Translations</summary>
    <div class="translation-panel__body">
      <button type="button" id="translate-btn" class="btn btn--small btn--primary translation-panel__translate-btn">Translate to Spanish</button>
      ${fieldInputs}
    </div>
  `;

  container.appendChild(panel);

  // Translate button handler
  const translateBtn = panel.querySelector('#translate-btn');
  translateBtn.addEventListener('click', async () => {
    const sourceValues = getSourceValues();

    // Filter out empty values
    const toTranslate = {};
    for (const [key] of fieldEntries) {
      const val = sourceValues[key];
      if (val && (typeof val === 'string' ? val.trim() : (Array.isArray(val) && val.length > 0))) {
        toTranslate[key] = val;
      }
    }

    if (Object.keys(toTranslate).length === 0) {
      showToast('No content to translate. Fill in the English fields first.', 'info');
      return;
    }

    translateBtn.disabled = true;
    translateBtn.textContent = 'Translating…';

    try {
      const translated = await translateContent(toTranslate, 'es');

      // Fill in the translated values
      for (const [key, value] of Object.entries(translated)) {
        const input = panel.querySelector(`#trans-es-${key}`);
        if (input) {
          if (Array.isArray(value)) {
            input.value = value.join(', ');
          } else if (input.tagName === 'TEXTAREA') {
            input.value = value;
          } else {
            input.value = value;
          }
        }
      }

      showToast('Translation complete. Review and edit before saving.', 'success');
    } catch (err) {
      logger.error('Translation failed', err);
      showToast('Translation failed. Please try again.', 'error');
    } finally {
      translateBtn.disabled = false;
      translateBtn.textContent = 'Translate to Spanish';
    }
  });

  return {
    /**
     * Get current translation values from the panel inputs.
     * Returns null if all fields are empty (no translations to save).
     * Returns { es: { field: value, ... } } structure for the translations JSONB column.
     */
    getTranslations() {
      const es = {};
      let hasAny = false;

      for (const [key, def] of fieldEntries) {
        const input = panel.querySelector(`#trans-es-${key}`);
        if (!input) continue;

        const raw = input.value.trim();
        if (!raw) continue;

        if (def.type === 'tags') {
          es[key] = raw.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          es[key] = raw;
        }
        hasAny = true;
      }

      return hasAny ? { es } : null;
    },
  };
}
