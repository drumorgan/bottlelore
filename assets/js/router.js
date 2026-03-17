import * as logger from './logger.js';

// Route shapes:
//   /                                → home (or redirect to admin)
//   /:winerySlug                     → public winery page
//   /:winerySlug/:wineId             → public bottle page
//   /:winerySlug/flight/:flightId    → public flight page
//   /admin                           → admin login
//   /admin/wines                     → admin wine list
//   /admin/wines/new                 → add wine
//   /admin/wines/:id/edit            → edit wine
//   /admin/wineries                  → super admin winery list
//   /admin/wineries/new              → add winery
//   /admin/winery/profile            → winery settings (owner + super admin)
//   /admin/flights                   → flight list
//   /admin/flights/new               → add flight
//   /admin/flights/:id/edit          → edit flight
//   /admin/staff                     → staff list
//   /admin/staff/invite              → invite staff
//   /admin/set-password              → set password (invite accept)

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

    if (parts[1] === 'wineries') {
      if (parts.length === 2) return { view: 'admin-wineries' };
      if (parts[2] === 'new') return { view: 'admin-winery-new' };
    }

    if (parts[1] === 'winery' && parts[2] === 'profile') {
      return { view: 'admin-winery-profile' };
    }

    if (parts[1] === 'flights') {
      if (parts.length === 2) return { view: 'admin-flights' };
      if (parts[2] === 'new') return { view: 'admin-flight-new' };
      if (parts[3] === 'edit') return { view: 'admin-flight-edit', flightId: parts[2] };
    }

    if (parts[1] === 'staff') {
      if (parts.length === 2) return { view: 'admin-staff' };
      if (parts[2] === 'invite') return { view: 'admin-staff-invite' };
    }

    if (parts[1] === 'set-password') return { view: 'admin-set-password' };

    return { view: 'not-found' };
  }

  // /:winerySlug/flight/:flightId
  if (parts.length === 3 && parts[1] === 'flight') {
    return { view: 'flight-page', winerySlug: parts[0], flightId: parts[2] };
  }

  // /:winerySlug/:wineId
  if (parts.length === 2) {
    return { view: 'bottle-page', winerySlug: parts[0], wineId: parts[1] };
  }

  // /:winerySlug
  if (parts.length === 1) {
    return { view: 'winery-page', winerySlug: parts[0] };
  }

  return { view: 'not-found' };
}

export function navigate(path) {
  logger.breadcrumb(`navigate: ${path}`, 'router');
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
