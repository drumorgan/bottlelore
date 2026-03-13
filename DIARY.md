# BottleLore Build Diary

A plain-English record of building BottleLore from zero — for anyone curious about what it's actually like to vibe-code a project with AI.

---

## Chapter 1: Hello, World

**Date:** March 12, 2026

### What we're building

BottleLore is a web app for wineries. You scan a QR code on a wine bottle and get tasting notes, food pairings, and the story behind the wine. The winery manages everything through a simple admin panel.

### Starting from nothing

We kicked off with a PDF from the client describing what they want — QR codes, tasting notes, a clean mobile-first experience. The repo had exactly three things: that PDF, a README, and a hello world HTML file.

### Getting a domain live

The first real task wasn't code — it was infrastructure. Here's what that looked like:

1. **Domain pointing.** The domain `bottlelore.com` was already registered, but it needed to be pointed at a hosting provider. We submitted DNS nameserver changes to point at InMotion Hosting.

2. **Do I even have hosting?** Turns out the domain was pointed at InMotion, but there was no hosting plan set up for it. A quick chat with InMotion support confirmed that the existing shared hosting account (already running another site) could cover this domain too — no new plan needed.

3. **Adding the domain in cPanel.** InMotion's cPanel created a new directory at `~/bottlelore.com/` for the site files. The document root was automatically configured to point there.

4. **The blank page problem.** Even after the domain was set up, visiting `bottlelore.com` showed an "Index of /" directory listing instead of a web page. This was just DNS propagation lag and browser caching — a hard refresh fixed it once things caught up.

### Setting up automated deployment

We didn't want to manually upload files to the server every time we make a change. So we set up a pipeline: push code to GitHub, and it automatically appears on the live site.

Here's how that works:

1. **Created an FTP account in cPanel.** This is a dedicated login scoped specifically to the `bottlelore.com/` directory. Important: the FTP deploy tool syncs files by deleting anything on the server that isn't in the repo. A scoped account means it can't accidentally nuke your other sites.

2. **Added GitHub secrets.** The FTP server address, username, and password were stored as encrypted secrets in the GitHub repo settings. The code never sees the actual credentials.

3. **Created a GitHub Actions workflow.** This is a YAML file (`.github/workflows/deploy.yml`) that tells GitHub: "Every time someone pushes to the `main` branch, check out the code and FTP it to the server." We used an open-source action called `FTP-Deploy-Action` that handles the sync.

4. **First deploy.** Merged to main, the action ran, and the files appeared on the server. Visited `bottlelore.com` and saw "Hello World — BottleLore connection test — all systems go."

### What we ended up with

- A live website at `bottlelore.com` showing a hello world page
- Automated deployment: push to GitHub, site updates automatically
- Zero application code written yet — but the entire delivery pipeline is in place

### Lessons for vibe coders

- **Infrastructure first.** It's tempting to jump into building features, but getting your deployment pipeline working early means every change you make is immediately visible on a real URL. This keeps momentum high and makes it easy to show progress.
- **Scope your FTP accounts.** The deploy tool mirrors your repo to the server and deletes anything extra. If your FTP user has access to your entire server, that's a bad day waiting to happen.
- **DNS takes time.** After pointing a domain, it can take minutes to hours for the change to propagate. Don't panic if the site doesn't load immediately.
- **Start with hello world.** It's the simplest possible proof that the whole chain works: code in repo → GitHub Actions → FTP → live site. Once that's confirmed, you can build with confidence.

---

## Chapter 2: Wiring Up the Plumbing

**Date:** March 12–13, 2026

### Supabase: the database

BottleLore needs a database to store wines, wineries, tasting notes — all the real data. We're using Supabase (a hosted Postgres service with a JS client library). The project already existed on Supabase from an earlier test; the task was getting the credentials wired into the app properly.

The kickoff PDF specifies a "config pattern" — PHP reads credentials from environment variables (for production/CI) or a local config file (for development), then injects them into the page as `window.APP_CONFIG`. JavaScript never hardcodes API keys.

We created `api/config.php` with a three-tier resolution: env vars → `config.local.php` → null. The `$appConfig` array carries supabase, sentry, and build metadata, and gets JSON-encoded into a `<script>` tag in `index.php`.

### Sentry: error monitoring without DevTools

Here's the thing about building for iPad: there's no console. No DevTools. If something breaks in production, you'd never know unless a user tells you — and they usually just leave. Sentry catches JavaScript errors automatically and reports them to a dashboard.

Setup was straightforward:
1. Created a new "bottlelore" project under the existing Sentry organization (which also hosts Yoink Adventures)
2. Picked "Browser JavaScript" as the platform
3. Got a Sentry key and DSN
4. Updated `index.php` to conditionally load the Sentry CDN script when a DSN is configured

The Sentry loader goes in the `<head>` before any application code — that way it catches errors even during app initialization.

### Where we stand

Here's what exists vs. what Phase 1 of the kickoff PDF requires:

| File | Status |
|------|--------|
| CLAUDE.md | Done |
| .github/workflows/deploy.yml | Done |
| index.php | Done (Sentry + Vite manifest + APP_CONFIG) |
| api/config.php | Done |
| .htaccess | Exists — needs HTTPS redirect + Vite hashed bundle caching |
| .gitignore | Exists — needs coverage/, config.local.php additions |
| vite.config.js | Exists — needs git SHA, sourcemaps, entry/output tweaks |
| package.json | Missing |
| vitest.config.js | Missing |
| eslint.config.js | Missing |
| SECURITY-CHECKLIST.md | Missing |
| Directory scaffolding | Missing (assets/js/, assets/css/, tests/, docs/) |

Phase 1 is roughly half done. The infrastructure and config plumbing is in place. What's left is the build tooling (Vite/Vitest/ESLint config) and the empty directory skeleton that Phase 2 will fill with actual code.

### Lessons for vibe coders

- **Config injection beats hardcoded keys.** Having PHP inject credentials means the same codebase works in dev, CI, and production without any `.env` file gymnastics in JavaScript.
- **Set up error monitoring early.** Sentry costs nothing for small projects and saves you from flying blind. Especially on iPad where you literally cannot open a console.
- **One org, many projects.** You don't need separate Sentry accounts for each app. One organization can hold all your projects, and errors stay cleanly separated.
