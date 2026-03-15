import * as logger from '../logger.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';
import { renderAdminNav } from '../components/admin-nav.js';
import { renderLogin } from './admin-login.js';
import { renderWineList, renderWineForm } from './admin-wines.js';
import { renderWineryList, renderWineryForm } from './admin-wineries.js';
import { renderWineryProfile } from './admin-winery-profile.js';
import { renderFlightList, renderFlightForm } from './admin-flights.js';
import { renderStaffList, renderInviteForm } from './admin-staff.js';

export async function render(container, view, options = {}) {
  logger.breadcrumb(`render admin: ${view}`, 'view', options);

  // Login view — no nav wrapper
  if (view === 'admin-login') {
    renderLogin(container);
    return;
  }

  // All other admin views require auth
  if (!state.isLoggedIn()) {
    navigate('/admin');
    return;
  }

  // Ensure winery is loaded for views that need it
  await ensureWineryLoaded();

  // Render nav shell and get content area
  const content = renderAdminNav(container);

  switch (view) {
    case 'admin-wines':
      await renderWineList(content);
      break;
    case 'admin-wine-new':
      renderWineForm(content, null);
      break;
    case 'admin-wine-edit':
      await renderWineForm(content, options.wineId);
      break;
    case 'admin-wineries':
      await renderWineryList(content);
      break;
    case 'admin-winery-new':
      await renderWineryForm(content, null);
      break;
    case 'admin-winery-edit':
      await renderWineryForm(content, options.wineryId);
      break;
    case 'admin-winery-profile':
      await renderWineryProfile(content);
      break;
    case 'admin-flights':
      await renderFlightList(content);
      break;
    case 'admin-flight-new':
      await renderFlightForm(content, null);
      break;
    case 'admin-flight-edit':
      await renderFlightForm(content, options.flightId);
      break;
    case 'admin-staff':
      await renderStaffList(content);
      break;
    case 'admin-staff-invite':
      await renderInviteForm(content);
      break;
    default:
      content.innerHTML = '<p>Unknown admin view.</p>';
  }
}

/**
 * Ensure winery is loaded in state (handles direct-navigation cases).
 * For super admins, loads the full winery list for the nav switcher.
 * For multi-winery users, loads their assignments and shows a switcher.
 */
async function ensureWineryLoaded() {
  try {
    // Super admins: load winery list for switcher if not already loaded
    if (state.isSuperAdmin() && state.getAdminWineryList().length === 0) {
      const allWineries = await gateway.getAllWineriesAdmin();
      state.setAdminWineryList(allWineries);
      if (!state.getCurrentWinery() && allWineries.length > 0) {
        state.setCurrentWinery(allWineries[0]);
      }
      return;
    }

    if (state.getCurrentWinery()) return;

    const user = state.getCurrentUser();
    try {
      const assignments = await gateway.getAdminWineries(user.id);
      if (assignments.length > 0) {
        state.setUserWineryAssignments(assignments);
        state.setCurrentWinery(assignments[0].wineries);
        state.setUserRole(assignments[0].role);
      }
    } catch (_) {
      if (state.isSuperAdmin()) {
        const allWineries = await gateway.getAllWineries();
        if (allWineries.length > 0) state.setCurrentWinery(allWineries[0]);
      }
    }
  } catch (err) {
    logger.error('Failed to load winery context', err);
  }
}
