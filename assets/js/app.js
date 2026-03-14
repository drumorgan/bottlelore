import * as logger from './logger.js';
import { registerGlobalErrorHandlers, showToast } from './utils.js';
import { parsePath } from './router.js';
import { onAuthStateChange } from './supabase-gateway.js';
import { setCurrentUser, resetAllState, isLoggedIn } from './state.js';

// Build info is injected by Vite at compile time — use try/catch for dev/unbundled mode
// (Safari/iPad throws ReferenceError on bare globals even with typeof guard)
let buildSha = 'dev';
let buildTime = 'dev';
try { buildSha = __BUILD_SHA__; } catch { /* unbundled */ } // eslint-disable-line no-undef
try { buildTime = __BUILD_TIME__; } catch { /* unbundled */ } // eslint-disable-line no-undef
logger.info('BottleLore starting', { build: buildSha, time: buildTime });

registerGlobalErrorHandlers();

// Resolved once the first auth state event fires (session restored or no session)
let authReady;
const authReadyPromise = new Promise((resolve) => { authReady = resolve; });

async function route() {
  const { view, winerySlug, wineId } = parsePath();
  const app = document.getElementById('app');

  // Wait for Supabase to restore the session before rendering admin views
  if (view.startsWith('admin') && !isLoggedIn()) {
    await authReadyPromise;
  }

  try {
    switch (view) {
      case 'bottle-page': {
        const { render } = await import('./views/bottle-page.js');
        await render(app, winerySlug, wineId);
        break;
      }
      case 'admin-login':
      case 'admin-wines':
      case 'admin-wine-new':
      case 'admin-wine-edit': {
        const { render } = await import('./views/admin.js');
        await render(app, view, { wineId });
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
    showToast('Something went wrong loading this page.', 'error');
  }
}

// Auth state listener — also tracks user in Sentry
let authFired = false;
onAuthStateChange((user) => {
  if (user) {
    setCurrentUser(user);
    logger.setUser(user);
  } else {
    resetAllState();
    logger.clearUser();
  }
  if (!authFired) {
    authFired = true;
    authReady();
  }
});

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
