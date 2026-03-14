import { escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';

const NAV_ITEMS = {
  super_admin: [
    { label: 'Wineries', path: '/admin/wineries' },
    { label: 'Wines', path: '/admin/wines' },
    { label: 'Flights', path: '/admin/flights' },
    { label: 'Staff', path: '/admin/staff' },
  ],
  owner: [
    { label: 'Winery Profile', path: '/admin/winery/profile' },
    { label: 'Wines', path: '/admin/wines' },
    { label: 'Flights', path: '/admin/flights' },
    { label: 'Staff', path: '/admin/staff' },
  ],
  staff: [
    { label: 'Wines', path: '/admin/wines' },
    { label: 'Flights', path: '/admin/flights' },
  ],
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  staff: 'Staff',
};

const ROLE_BADGE_CLASS = {
  super_admin: 'badge--super',
  owner: 'badge--owner',
  staff: 'badge--staff',
};

/**
 * Renders the admin navigation bar into the given container.
 * Returns the content wrapper element where the view should render its content.
 */
export function renderAdminNav(container) {
  const role = state.getUserRole();
  const items = NAV_ITEMS[role] || NAV_ITEMS.staff;
  const currentPath = window.location.pathname;
  const winery = state.getCurrentWinery();
  const roleBadgeClass = ROLE_BADGE_CLASS[role] || 'badge--staff';
  const roleLabel = ROLE_LABELS[role] || 'Staff';
  const isSuperAdmin = role === 'super_admin';

  const navLinks = items.map(item => {
    const active = currentPath.startsWith(item.path) ? ' admin-nav__link--active' : '';
    return `<a href="${item.path}" class="admin-nav__link${active}" data-nav-path="${item.path}">${escapeHtml(item.label)}</a>`;
  }).join('');

  // Super admin winery switcher — shows current winery context with dropdown
  let wineryContext = '';
  if (isSuperAdmin) {
    const wineryList = state.getAdminWineryList();
    if (wineryList.length > 0 && winery) {
      const options = wineryList.map(w =>
        `<option value="${escapeHtml(w.id)}" ${w.id === winery.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`
      ).join('');
      wineryContext = `
        <div class="admin-nav__switcher">
          <select id="winery-switcher" class="admin-nav__switcher-select" title="Switch winery context">
            ${options}
          </select>
        </div>
      `;
    } else if (winery) {
      wineryContext = `<span class="admin-nav__winery">${escapeHtml(winery.name)}</span>`;
    }
  } else if (winery) {
    wineryContext = `<span class="admin-nav__winery">${escapeHtml(winery.name)}</span>`;
  }

  container.innerHTML = `
    <div class="admin-layout">
      <nav class="admin-nav">
        <div class="admin-nav__brand">
          <span class="admin-nav__title">BottleLore</span>
          ${wineryContext}
          <span class="badge ${roleBadgeClass}">${escapeHtml(roleLabel)}</span>
        </div>
        <div class="admin-nav__links">${navLinks}</div>
        <button id="admin-signout-btn" class="btn btn--secondary btn--small">Sign Out</button>
      </nav>
      <main id="admin-content" class="admin-content"></main>
    </div>
  `;

  // Handle nav link clicks (SPA navigation)
  container.querySelectorAll('[data-nav-path]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.navPath);
    });
  });

  // Winery switcher for super admins
  const switcher = document.getElementById('winery-switcher');
  if (switcher) {
    switcher.addEventListener('change', () => {
      const wineryList = state.getAdminWineryList();
      const selected = wineryList.find(w => w.id === switcher.value);
      if (selected) {
        state.setCurrentWinery(selected);
        // Re-render current view with new winery context
        const path = window.location.pathname;
        navigate(path);
      }
    });
  }

  // Sign out
  document.getElementById('admin-signout-btn').addEventListener('click', async () => {
    await gateway.signOut();
    state.resetAllState();
    navigate('/admin');
  });

  return document.getElementById('admin-content');
}
