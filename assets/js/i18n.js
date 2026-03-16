/**
 * i18n module — locale detection, UI string translation (t()),
 * and content field fallback (tc()).
 *
 * Supported locales: 'en', 'es'
 * Default / fallback: 'en'
 */

import enStrings from './locales/en.json';
import esStrings from './locales/es.json';

const SUPPORTED_LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'bl-locale';

const STRINGS = {
  en: enStrings,
  es: esStrings,
};

let _currentLocale = DEFAULT_LOCALE;

/**
 * Detect locale from (in priority order):
 * 1. localStorage override (user manually toggled)
 * 2. APP_CONFIG.locale (server-detected)
 * 3. navigator.language / navigator.languages
 * 4. Default to 'en'
 */
export function detectLocale() {
  // 1. User override
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      _currentLocale = stored;
      return _currentLocale;
    }
  } catch { /* localStorage unavailable */ }

  // 2. Server-injected
  const serverLocale = window.APP_CONFIG?.locale;
  if (serverLocale && SUPPORTED_LOCALES.includes(serverLocale)) {
    _currentLocale = serverLocale;
    return _currentLocale;
  }

  // 3. Browser language
  const langs = navigator.languages || [navigator.language || ''];
  for (const lang of langs) {
    const code = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(code)) {
      _currentLocale = code;
      return _currentLocale;
    }
  }

  // 4. Default
  _currentLocale = DEFAULT_LOCALE;
  return _currentLocale;
}

/**
 * Get the current locale code.
 */
export function getLocale() {
  return _currentLocale;
}

/**
 * Set locale explicitly (e.g. from language toggle).
 * Persists to localStorage.
 */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  _currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch { /* localStorage unavailable */ }
}

/**
 * Translate a UI string key.
 * Supports simple interpolation: t('hello', { name: 'World' }) with key "Hello {name}"
 *
 * @param {string} key — dot-separated key (e.g. 'public.tasting_notes')
 * @param {Object} [params] — interpolation values
 * @returns {string} — translated string, or key if not found
 */
export function t(key, params) {
  const str = STRINGS[_currentLocale]?.[key] ?? STRINGS[DEFAULT_LOCALE]?.[key] ?? key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? String(params[k]) : `{${k}}`);
}

/**
 * Translate content from a database record's translations JSONB column.
 * Falls back to the English base field if no translation exists.
 *
 * @param {Object} record — the DB record (wine, winery, flight)
 * @param {string} field — the field name (e.g. 'name', 'description')
 * @returns {string|null} — translated value or base value
 */
export function tc(record, field) {
  if (!record) return null;
  if (_currentLocale !== DEFAULT_LOCALE) {
    const translated = record.translations?.[_currentLocale]?.[field];
    if (translated) return translated;
  }
  return record[field] ?? null;
}

/**
 * Get the list of supported locales.
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Render a compact language toggle element.
 * Returns the DOM element (caller should append it).
 *
 * @param {Function} [onSwitch] — callback after locale changes, receives new locale
 * @returns {HTMLElement}
 */
export function createLanguageToggle(onSwitch) {
  const el = document.createElement('div');
  el.className = 'lang-toggle';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', t('lang.toggle_label'));

  function render() {
    el.innerHTML = SUPPORTED_LOCALES.map(loc => {
      const active = loc === _currentLocale ? ' lang-toggle__btn--active' : '';
      return `<button class="lang-toggle__btn${active}" data-locale="${loc}" aria-pressed="${loc === _currentLocale}">${t('lang.' + loc)}</button>`;
    }).join('');

    el.querySelectorAll('[data-locale]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newLocale = btn.dataset.locale;
        if (newLocale === _currentLocale) return;
        setLocale(newLocale);
        render();
        if (onSwitch) onSwitch(newLocale);
      });
    });
  }

  render();
  return el;
}
