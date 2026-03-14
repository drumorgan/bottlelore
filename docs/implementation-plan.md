# BottleLore Feature Expansion — Implementation Plan

## Phase 1: Role Detection and Navigation Infrastructure
- [ ] Add `FLIGHTS` and `FLIGHT_WINES` to `database-tables.js`
- [ ] Add role, flights, staff state to `state.js`
- [ ] Add `getUserRole()`, `getAllWineriesAdmin()` to `supabase-gateway.js`
- [ ] Expand `router.js` with ~10 new admin routes
- [ ] Create `assets/js/components/admin-nav.js` (role-aware nav)
- [ ] Refactor `admin.js` into dispatcher for new views
- [ ] Update `app.js` with role detection on auth
- [ ] Add nav + role badge styles to `admin.css`

## Phase 2: Super Admin Winery Management
- [ ] Add `createWinery()`, `updateWinery()`, `toggleWineryActive()` to gateway
- [ ] Create `assets/js/views/admin-wineries.js` (list + form)
- [ ] Add winery list/form styles to `admin.css`

## Phase 3: Winery Profile Editing for Owners
- [ ] Create `assets/js/views/admin-winery-profile.js`
- [ ] Reuse winery form scoped to owner's winery (no slug/name/is_active)

## Phase 4: Wine Active/Inactive Toggle
- [ ] Add `toggleWineActive()` to gateway
- [ ] Update wine list with active/inactive indicators and toggle actions
- [ ] Add inactive wine styles

## Phase 5: Flight Management
- [ ] Add flight CRUD + `setFlightWines()` to gateway
- [ ] Create `assets/js/views/admin-flights.js` (list + form + wine picker)
- [ ] Add flight styles

## Phase 6: Staff Management and Email Invites
- [ ] Create `supabase/functions/invite-user/index.ts` Edge Function
- [ ] Add DB migration for `get_winery_staff()` function
- [ ] Add `inviteUser()`, `getWineryStaff()`, `removeWineryAdmin()` to gateway
- [ ] Create `assets/js/views/admin-staff.js` (list + invite form)

## Phase 7: Super Admin Cross-Winery Access
- [ ] Add winery switcher dropdown to admin-nav for super admins
- [ ] Add "Manage" action to winery list rows
- [ ] Ensure all views respect `state.getCurrentWinery()` context

## Dependencies
```
Phase 1 → Phase 2 → Phase 3
Phase 1 → Phase 4 → Phase 5
Phase 1 → Phase 6
Phase 1 + 2 → Phase 7
```

## New Files
| File | Purpose |
|------|---------|
| `assets/js/components/admin-nav.js` | Role-aware navigation |
| `assets/js/views/admin-wineries.js` | Winery list + form |
| `assets/js/views/admin-winery-profile.js` | Owner profile editing |
| `assets/js/views/admin-flights.js` | Flight list + form |
| `assets/js/views/admin-staff.js` | Staff list + invite |
| `supabase/functions/invite-user/index.ts` | Email invite Edge Function |
