# BottleLore Feature Expansion — Implementation Plan

## Phase 1: Role Detection and Navigation Infrastructure ✅
- [x] Add `FLIGHTS` and `FLIGHT_WINES` to `database-tables.js`
- [x] Add role, flights, staff state to `state.js`
- [x] Add `getUserRole()`, `getAllWineriesAdmin()` to `supabase-gateway.js`
- [x] Expand `router.js` with ~10 new admin routes
- [x] Create `assets/js/components/admin-nav.js` (role-aware nav)
- [x] Refactor `admin.js` into dispatcher for new views
- [x] Update `app.js` with role detection on auth
- [x] Add nav + role badge styles to `admin.css`

## Phase 2: Super Admin Winery Management ✅
- [x] Add `createWinery()`, `updateWinery()`, `toggleWineryActive()` to gateway
- [x] Create `assets/js/views/admin-wineries.js` (list + form)
- [x] Add winery list/form styles to `admin.css`

## Phase 3: Winery Profile Editing for Owners ✅
- [x] Create `assets/js/views/admin-winery-profile.js`
- [x] Reuse winery form scoped to owner's winery (no slug/name/is_active)
- [x] Fix: resolve authReady before role detection (slow load fix)

## Phase 4: Wine Active/Inactive Toggle ✅
- [x] Add `toggleWineActive()` to gateway
- [x] Update wine list with active/inactive indicators and toggle actions
- [x] Add inactive wine styles

## Phase 5: Flight Management ✅
- [x] Add flight CRUD + `setFlightWines()` to gateway
- [x] Create `assets/js/views/admin-flights.js` (list + form + wine picker)
- [x] Add flight styles

## Phase 6: Staff Management and Email Invites ✅
- [x] Create `supabase/functions/invite-user/index.ts` Edge Function
- [x] Add DB migration for `get_winery_staff()` function
- [x] Add `inviteUser()`, `getWineryStaff()`, `removeWineryAdmin()` to gateway
- [x] Create `assets/js/views/admin-staff.js` (list + invite form)

## Phase 7: Super Admin Cross-Winery Access ✅
- [x] Add winery switcher dropdown to admin-nav for super admins
- [x] Add "Manage" action to winery list rows
- [x] Ensure all views respect `state.getCurrentWinery()` context

## Deployment Checklist
- [ ] Run `docs/migration-get-winery-staff.sql` in Supabase SQL editor
- [ ] Grant EXECUTE on `get_winery_staff` to `authenticated` role
- [ ] Deploy Edge Function: `supabase functions deploy invite-user`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` as Edge Function secret

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
