import * as logger from './logger.js';

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
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

export function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
