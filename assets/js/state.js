let _currentUser = null;
let _isSuperAdmin = false;
let _userRole = null; // 'super_admin' | 'owner' | 'staff' | null
let _currentWinery = null;
let _wines = [];
let _wineById = {};
let _flights = [];
let _flightById = {};
let _staff = [];
let _adminWineryList = [];

// ── User ──────────────────────────────────────────────────────────────────────

export function setCurrentUser(user) { _currentUser = user; }
export function getCurrentUser() { return _currentUser; }
export function isLoggedIn() { return _currentUser !== null; }

// ── Super Admin ──────────────────────────────────────────────────────────────

export function setSuperAdmin(val) { _isSuperAdmin = val; }
export function isSuperAdmin() { return _isSuperAdmin; }

// ── Role ─────────────────────────────────────────────────────────────────────

export function setUserRole(role) { _userRole = role; }
export function getUserRole() { return _userRole; }

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

// ── Flights ──────────────────────────────────────────────────────────────────

export function setFlights(flights) {
  _flights = flights;
  _flightById = Object.fromEntries(flights.map(f => [f.id, f]));
}

export function getFlights() { return _flights; }
export function getFlightById(id) { return _flightById[id] ?? null; }

// ── Staff ────────────────────────────────────────────────────────────────────

export function setStaff(staff) { _staff = staff; }
export function getStaff() { return _staff; }

// ── Admin Winery List (super admin context) ──────────────────────────────────

export function setAdminWineryList(list) { _adminWineryList = list; }
export function getAdminWineryList() { return _adminWineryList; }

// ── Reset ─────────────────────────────────────────────────────────────────────

export function resetAllState() {
  _currentUser = null;
  _isSuperAdmin = false;
  _userRole = null;
  _currentWinery = null;
  _wines = [];
  _wineById = {};
  _flights = [];
  _flightById = {};
  _staff = [];
  _adminWineryList = [];
}
