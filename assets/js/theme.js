import * as logger from './logger.js';

const VALID_MODES = ['day', 'night', 'auto'];
let activeMode = 'auto';

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'night';
  }
  return 'day';
}

function resolveTheme(mode) {
  if (mode === 'auto') return getSystemTheme();
  return mode;
}

function applyClass(theme) {
  document.documentElement.classList.remove('day', 'night');
  document.documentElement.classList.add(theme);
}

/**
 * Apply a winery's theme preference to the page.
 * Called by public views once they have winery data.
 *   'day'   → always light
 *   'night' → always dark
 *   'auto'  → follows device prefers-color-scheme (default)
 */
export function applyTheme(preference) {
  activeMode = VALID_MODES.includes(preference) ? preference : 'auto';
  applyClass(resolveTheme(activeMode));
  logger.breadcrumb('theme applied', 'ui', { preference: activeMode });
}

/**
 * Called once at startup. Applies 'auto' as default and listens for
 * system theme changes so 'auto' stays reactive.
 */
export function init() {
  activeMode = 'auto';
  applyClass(resolveTheme('auto'));

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (activeMode === 'auto') {
        applyClass(getSystemTheme());
      }
    });
  }
}
