# BottleLore — Claude Code Instructions

## User Environment
- User is on iPad — NO DevTools, NO F12, NO console instructions, EVER
- All errors must surface via showToast() or visible UI elements
- Debug info goes in visible overlays or collapsible <details> elements
- localStorage.setItem('debug', '1') enables verbose logging

## What This App Is
A multi-winery QR scan app. Each wine bottle gets a QR code.
Guest scans it, sees tasting notes, price, and food pairings.
Winery staff manage wines via a simple admin panel.
No app to install. No login for guests.

## Tech Stack
- Vanilla JS ES modules, Vite build system
- Supabase for database and auth
- Hosted on InMotion cPanel via FTP deploy
- PHP for server-side config injection only
- Sentry for error monitoring

## Hard Rules — Never Break These
1. supabase-gateway.js is the ONLY file that imports Supabase
2. No console.* calls anywhere except logger.js
3. All user-visible errors surface via showToast()
4. escapeHtml() on ALL user content before innerHTML
5. assets/dist/ must NEVER appear in the FTP exclude list
6. All routes rewrite to index.php via .htaccess

## Module Build Order
Always build in this sequence:
logger.js → utils.js → database-tables.js → supabase-gateway.js
→ state.js → router.js → views → components

## Known Gotchas
- Safari/iPad Supabase auth: keep config minimal, autoRefreshToken + persistSession
- Never auto-recreate Supabase client — trust the SDK's internal state management
- assets/dist/ must NOT be in FTP exclude list (silent deploy bug from prior project)
- .htaccess must rewrite ALL routes to index.php for SPA routing to work
- ES module cache: use .htaccess no-cache header on /assets/js/ directory

## Deployment Flow
Push to main → GitHub Actions → test job → build job → FTP deploy to InMotion
Build verification step must confirm assets/dist/.vite/manifest.json exists before deploy

## Patterns To Follow
- Gateway pattern: one file owns all DB access
- Logger pattern: one file owns all error/event logging
- State pattern: plain getters/setters, no reactive framework
- Config pattern: PHP injects window.APP_CONFIG, never hardcode keys in JS
