import * as logger from './logger.js';

const STORAGE_KEY = 'bl-theme';
const VALID_MODES = ['day', 'night', 'auto'];

let currentMode = 'auto';

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

function applyTheme(theme) {
  document.documentElement.classList.remove('day', 'night');
  document.documentElement.classList.add(theme);
}

function updateToggleUI() {
  document.querySelectorAll('.theme-toggle__btn').forEach(btn => {
    const mode = btn.getAttribute('data-theme');
    btn.classList.toggle('theme-toggle__btn--active', mode === currentMode);
  });
}

export function setMode(mode) {
  if (!VALID_MODES.includes(mode)) return;
  currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch { /* private browsing */ }
  applyTheme(resolveTheme(mode));
  updateToggleUI();
  logger.breadcrumb('theme changed', 'ui', { mode });
}

export function getMode() {
  return currentMode;
}

export function init() {
  // Restore saved preference
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_MODES.includes(saved)) {
      currentMode = saved;
    }
  } catch { /* private browsing */ }

  // Apply immediately
  applyTheme(resolveTheme(currentMode));

  // Listen for system theme changes (relevant when in auto mode)
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentMode === 'auto') {
        applyTheme(resolveTheme('auto'));
      }
    });
  }
}

export function renderToggle() {
  const existing = document.querySelector('.theme-toggle');
  if (existing) existing.remove();

  const toggle = document.createElement('div');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Theme switcher');
  toggle.innerHTML = `
    <button class="theme-toggle__btn" data-theme="day">Day</button>
    <button class="theme-toggle__btn" data-theme="auto">Auto</button>
    <button class="theme-toggle__btn" data-theme="night">Night</button>
  `;
  document.body.appendChild(toggle);

  updateToggleUI();

  toggle.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme]');
    if (btn) setMode(btn.getAttribute('data-theme'));
  });
}
