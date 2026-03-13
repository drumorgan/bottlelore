import * as logger from './logger.js';
import { registerGlobalErrorHandlers, showToast } from './utils.js';
import { parsePath, navigate } from './router.js';
import { onAuthStateChange } from './supabase-gateway.js';
import { setCurrentUser, resetAllState } from './state.js';

// Build info is injected by Vite at compile time — use fallbacks for dev/unbundled mode
const buildSha = typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev'; // eslint-disable-line no-undef
const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'; // eslint-disable-line no-undef
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
      case 'home':
        navigate('/admin');
        break;
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
