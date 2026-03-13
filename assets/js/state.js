let _currentUser = null;
let _isSuperAdmin = false;
let _currentWinery = null;
let _wines = [];
let _wineById = {};

// ── User ──────────────────────────────────────────────────────────────────────

export function setCurrentUser(user) { _currentUser = user; }
export function getCurrentUser() { return _currentUser; }
export function isLoggedIn() { return _currentUser !== null; }

// ── Super Admin ──────────────────────────────────────────────────────────────

export function setSuperAdmin(val) { _isSuperAdmin = val; }
export function isSuperAdmin() { return _isSuperAdmin; }

// ── Winery ────────────────────────────────────────────────────────────────────

export function setCurrentWinery(w) { _currentWinery = w; }
export function getCurrentWinery() { return _currentWinery; }

// ── Wines ─────────────────────────────────────────────────────────────────────

export function setWines(wines) {
  _wines = wines;
  _wineById = Object.fromEntries(wines.map(w => [w.id, w]));
}

export function getWines() { return _wines; }
export function getWineById(id) { return _wineById[id] ?? null; }

// ── Reset ─────────────────────────────────────────────────────────────────────

export function resetAllState() {
  _currentUser = null;
  _isSuperAdmin = false;
  _currentWinery = null;
  _wines = [];
  _wineById = {};
}
