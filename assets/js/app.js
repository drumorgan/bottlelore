import * as logger from './logger.js';
import { registerGlobalErrorHandlers, showToast } from './utils.js';
import { parsePath } from './router.js';
import { onAuthStateChange } from './supabase-gateway.js';
import { setCurrentUser, resetAllState, isLoggedIn, setUserRole, setSuperAdmin, setUserWineryAssignments } from './state.js';
import { checkIsSuperAdmin, getAdminWineries } from './supabase-gateway.js';
import { init as initTheme } from './theme.js';
import { detectLocale } from './i18n.js';

// Build info is injected by Vite at compile time — use try/catch for dev/unbundled mode
// (Safari/iPad throws ReferenceError on bare globals even with typeof guard)
let buildSha = 'dev';
let buildTime = 'dev';
try { buildSha = __BUILD_SHA__; } catch { /* unbundled */ } // eslint-disable-line no-undef
try { buildTime = __BUILD_TIME__; } catch { /* unbundled */ } // eslint-disable-line no-undef
logger.info('BottleLore starting', { build: buildSha, time: buildTime });

registerGlobalErrorHandlers();
initTheme();
detectLocale();

// Resolved once the first auth state event fires (session restored or no session)
let authReady;
const authReadyPromise = new Promise((resolve) => { authReady = resolve; });

async function route() {
  const routeInfo = parsePath();
  const { view } = routeInfo;
  const app = document.getElementById('app');

  // Wait for Supabase to restore the session before rendering protected admin views
  // (skip for admin-login — it doesn't need auth and should render instantly)
  if (view.startsWith('admin') && view !== 'admin-login' && !isLoggedIn()) {
    await authReadyPromise;
  }

  try {
    switch (view) {
      case 'bottle-page': {
        const { render } = await import('./views/bottle-page.js');
        await render(app, routeInfo.winerySlug, routeInfo.wineId);
        break;
      }
      case 'flight-page': {
        const { render } = await import('./views/flight-page.js');
        await render(app, routeInfo.winerySlug, routeInfo.flightId);
        break;
      }
      case 'winery-page': {
        const { render } = await import('./views/winery-page.js');
        await render(app, routeInfo.winerySlug);
        break;
      }
      case 'admin-login': {
        const { renderLogin } = await import('./views/admin-login.js');
        renderLogin(app);
        break;
      }
      case 'admin-wines':
      case 'admin-wine-new':
      case 'admin-wine-edit':
      case 'admin-wineries':
      case 'admin-winery-new':
      case 'admin-winery-edit':
      case 'admin-winery-profile':
      case 'admin-flights':
      case 'admin-flight-new':
      case 'admin-flight-edit':
      case 'admin-staff':
      case 'admin-staff-invite': {
        const { render } = await import('./views/admin.js');
        await render(app, view, routeInfo);
        break;
      }
      case 'home': {
        const { render } = await import('./views/home.js');
        await render(app);
        break;
      }
      default:
        app.innerHTML = '<div class="not-found"><h1>404</h1><p>Page not found.</p></div>';
    }
  } catch (err) {
    logger.error('Route render failed', err, { view });
    showToast(`Something went wrong loading this page. [${view}: ${err.message}]`, 'error');
  }
}

// Auth state listener — also tracks user in Sentry and detects role
let authFired = false;
onAuthStateChange((user) => {
  if (user) {
    setCurrentUser(user);
    logger.setUser(user);

    // Detect role in background — don't block initial route render
    detectRole(user.id);
  } else {
    resetAllState();
    logger.clearUser();
  }
  if (!authFired) {
    authFired = true;
    authReady();
  }
});

async function detectRole(userId) {
  try {
    const isSA = await checkIsSuperAdmin();
    setSuperAdmin(isSA);
    if (isSA) {
      setUserRole('super_admin');
    } else {
      const assignments = await getAdminWineries(userId);
      setUserWineryAssignments(assignments);
      if (assignments.length > 0) {
        setUserRole(assignments[0].role);
      } else {
        setUserRole('staff');
      }
    }
  } catch (err) {
    logger.error('Role detection failed on auth restore', err);
  }
}

// Safety: if onAuthStateChange never fires (e.g. network down), resolve after timeout
setTimeout(() => {
  if (!authFired) {
    authFired = true;
    authReady();
  }
}, 3000);

// Handle back/forward navigation
window.addEventListener('popstate', route);

// Initial route
route();
