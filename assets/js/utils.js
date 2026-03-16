import * as logger from './logger.js';
import { getLocale } from './i18n.js';

// XSS prevention — use on ALL user content before innerHTML
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Toast notification — the ONLY way to surface errors to user
let toastTimer = null;
export function showToast(message, type = 'info', durationMs = 3500) {
  let toast = document.getElementById('bl-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bl-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `bl-toast bl-toast--${type} bl-toast--visible`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('bl-toast--visible');
  }, durationMs);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const localeMap = { en: 'en-US', es: 'es-ES' };
  const locale = localeMap[getLocale()] || 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

export function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Network retry helpers — shared by public views (bottle, flight, winery)
export const MAX_RETRIES = 2;
export const RETRY_DELAY_MS = 1500;

export function isNetworkError(err) {
  if (err?.code === 'PGRST116') return false; // row not found — not a network issue
  if (err?.message?.includes('Failed to fetch')) return true;
  if (err?.message?.includes('NetworkError')) return true;
  if (err?.message?.includes('Load failed')) return true; // Safari
  if (err?.name === 'TypeError' && !err?.code) return true; // fetch() throws TypeError on network failure
  return false;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Register global error handlers — call once from app.js
export function registerGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', event.reason, { type: 'unhandledrejection' });
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    logger.error('Global error', new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}
