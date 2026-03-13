import * as logger from './logger.js';

// Route shapes:
//   /                        → home (or redirect to admin)
//   /:winerySlug/:wineId     → public bottle page
//   /admin                   → admin login
//   /admin/wines             → admin wine list
//   /admin/wines/new         → add wine
//   /admin/wines/:id/edit    → edit wine

export function parsePath(pathname = window.location.pathname) {
  const parts = pathname.replace(/^\/|\/$/g, '').split('/');

  if (parts[0] === '' || parts.length === 0) {
    return { view: 'home' };
  }

  if (parts[0] === 'admin') {
    if (parts.length === 1) return { view: 'admin-login' };
    if (parts[1] === 'wines') {
      if (parts.length === 2) return { view: 'admin-wines' };
      if (parts[2] === 'new') return { view: 'admin-wine-new' };
      if (parts[3] === 'edit') return { view: 'admin-wine-edit', wineId: parts[2] };
    }
    return { view: 'not-found' };
  }

  // /:winerySlug/:wineId
  if (parts.length === 2) {
    return { view: 'bottle-page', winerySlug: parts[0], wineId: parts[1] };
  }

  return { view: 'not-found' };
}

export function navigate(path) {
  logger.breadcrumb(`navigate: ${path}`, 'router');
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
