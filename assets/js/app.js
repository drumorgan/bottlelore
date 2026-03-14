import * as logger from './logger.js';
import { registerGlobalErrorHandlers, showToast } from './utils.js';
import { parsePath, navigate } from './router.js';
import { onAuthStateChange } from './supabase-gateway.js';
import { setCurrentUser, resetAllState } from './state.js';

// Build info is injected by Vite at compile time — use try/catch for dev/unbundled mode
// (Safari/iPad throws ReferenceError on bare globals even with typeof guard)
let buildSha = 'dev';
let buildTime = 'dev';
try { buildSha = __BUILD_SHA__; } catch { /* unbundled */ } // eslint-disable-line no-undef
try { buildTime = __BUILD_TIME__; } catch { /* unbundled */ } // eslint-disable-line no-undef
logger.info('BottleLore starting', { build: buildSha, time: buildTime });

registerGlobalErrorHandlers();

async function route() {
  const { view, winerySlug, wineId } = parsePath();
  const app = document.getElementById('app');

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
        await render(app, view, { wineId: parsePath().wineId });
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

// Auth state listener
onAuthStateChange((user) => {
  if (user) {
    setCurrentUser(user);
  } else {
    resetAllState();
  }
});

// Handle back/forward navigation
window.addEventListener('popstate', route);

// Initial route
route();
