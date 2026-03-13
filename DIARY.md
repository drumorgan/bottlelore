# BottleLore Build Diary

A step-by-step guide to building a real web app with AI — written for someone who's never done it before. If you can describe what you want, you can vibe-code it into existence. This diary shows you how.

---

## How to Use This Guide

This isn't a textbook. It's a real project diary — mistakes, detours, and all. Each chapter covers one working session. By the end, you'll have a live web app that real people use.

**What you need to start:**
- A description of what you want to build (ours was a PDF from the client)
- An AI coding assistant (we used Claude Code)
- A willingness to learn as you go

**What you don't need:**
- Programming experience
- A computer science degree
- To understand every line of code the AI writes

---

## Chapter 1: Getting a Live URL

**Date:** March 12, 2026
**Goal:** Go from nothing to a live website that updates automatically when you push code.

### Step 1: Describe your project to the AI

We started with a PDF from the client describing what they want — a winery app where guests scan QR codes to see tasting notes. We gave that PDF to Claude Code and asked it to create a kickoff document. The AI read the requirements and produced a detailed build plan broken into phases, with every file mapped out.

**Vibe coder tip:** Your first prompt sets the tone for the whole project. Give the AI as much context as you can — who the users are, what they need, what the constraints are. The better the brief, the better the code.

### Step 2: Get your domain pointed at hosting

The domain `bottlelore.com` was already registered but wasn't connected to a server. We submitted DNS nameserver changes to point it at InMotion Hosting.

Then we discovered there was no hosting plan for this domain. A quick chat with InMotion support confirmed the existing shared hosting account could cover it — no extra cost.

**Vibe coder tip:** DNS changes can take minutes to hours to propagate. Don't panic if the site doesn't load right away. Do something else and come back.

### Step 3: Set up the hosting directory

InMotion's cPanel created a new directory at `~/bottlelore.com/` when we added the domain. The server automatically serves files from this folder when someone visits the URL.

We put a simple `index.html` file with "Hello World" in it — just to prove the chain works.

### Step 4: Set up automated deployment

We didn't want to manually upload files every time we make a change. So we created a pipeline: push code to GitHub, and it automatically appears on the live site.

Here's what that involved:

1. **Created an FTP account in cPanel** — scoped specifically to the `bottlelore.com/` directory. This is critical: the deploy tool syncs files by deleting anything on the server that isn't in the repo. A scoped account means it can't accidentally nuke your other sites.

2. **Added GitHub secrets** — the FTP server address, username, and password were stored as encrypted secrets in the GitHub repo settings. The code never sees the actual credentials.

3. **Created a GitHub Actions workflow** — a YAML file (`.github/workflows/deploy.yml`) that tells GitHub: "Every time someone pushes to the `main` branch, check out the code and FTP it to the server."

4. **First deploy** — merged to main, the action ran, files appeared on the server. Visited `bottlelore.com` and saw our hello world page.

### What we had at the end of Chapter 1

- A live website at `bottlelore.com`
- Automated deployment: push to GitHub → site updates automatically
- Zero application code — but the entire delivery pipeline works

### Key lessons

- **Infrastructure first.** Get your deployment pipeline working before you write a single line of application code. Every change you make will be immediately visible on a real URL. This keeps momentum high.
- **Scope your FTP accounts.** Seriously. The deploy tool mirrors your repo and deletes extras. If your FTP user has full server access, that's a disaster waiting to happen.
- **Start with hello world.** The simplest possible proof that the whole chain works: code in repo → GitHub → FTP → live site. Once that works, build with confidence.

---

## Chapter 2: Wiring Up the Plumbing

**Date:** March 12–13, 2026
**Goal:** Connect the database and error monitoring — the invisible infrastructure that every real app needs.

### Step 5: Set up the database connection

BottleLore needs a database to store wines, wineries, and tasting notes. We're using Supabase — a hosted Postgres database with a JavaScript client library.

The kickoff document specifies a "config pattern" — PHP reads credentials from environment variables (for production) or a local config file (for development), then injects them into the page as `window.APP_CONFIG`. JavaScript never hardcodes API keys.

We created `api/config.php` with a three-tier credential resolution: env vars → `config.local.php` → null. The config gets JSON-encoded into a `<script>` tag inside `index.php`.

**Vibe coder tip:** This pattern — server injects config, JavaScript reads it — means the same codebase works in dev, CI, and production without `.env` file gymnastics in JavaScript. Ask your AI to use this pattern early. It saves headaches later.

### Step 6: Set up error monitoring

Here's the thing about building for iPad: there's no developer console. No DevTools. If something breaks in production, you'd never know unless a user tells you — and they usually just leave.

Sentry catches JavaScript errors automatically and reports them to a dashboard.

Setup:
1. Created a new "bottlelore" project in Sentry
2. Picked "Browser JavaScript" as the platform
3. Got a Sentry DSN (a URL that identifies your project)
4. Updated `index.php` to load the Sentry script in the `<head>` — before any application code, so it catches errors even during initialization

**Vibe coder tip:** Set up error monitoring early. It costs nothing for small projects. You'll thank yourself the first time you catch a silent error that would have gone unnoticed.

### Step 7: Create the project instruction file

We created `CLAUDE.md` — a file that tells the AI assistant how to behave in this project. It includes hard rules (like "only one file talks to the database"), the tech stack, known gotchas, and deployment steps.

This file is the single most important thing in the repo for vibe coding. It's your AI's memory between sessions. Without it, every new session starts from zero.

**Vibe coder tip:** Your `CLAUDE.md` (or equivalent instruction file) is your project's constitution. Put your non-negotiable rules there. The AI reads it at the start of every session and follows it.

### Step 8: Finish the foundation files

With the plumbing connected, we completed the remaining Phase 1 files:

| File | What it does |
|------|-------------|
| `package.json` | Lists project dependencies and build scripts |
| `vite.config.js` | Configures the build tool (bundles JS for production) |
| `vitest.config.js` | Configures the test runner |
| `eslint.config.js` | Configures the code linter (catches mistakes) |
| `.htaccess` | Server rules: HTTPS redirect, SPA routing, caching |
| `.gitignore` | Tells Git which files to ignore |
| `SECURITY-CHECKLIST.md` | Pre-deploy security verification checklist |
| Directory scaffolding | Empty folders for JS, CSS, views, components, tests, docs |

**Vibe coder tip:** Notice that none of these files are the actual app. They're all scaffolding — the structure that the app will be built inside. A solid foundation means the AI can write clean, organized code in the next phase instead of one giant messy file.

### What we had at the end of Chapter 2

- Sentry connected and catching errors
- Supabase credentials flowing through the config pattern
- Build tooling configured (Vite, Vitest, ESLint)
- Complete project scaffolding ready for application code
- **Phase 1: Complete**

### Key lessons

- **Config injection beats hardcoded keys.** Having PHP inject credentials means one codebase works everywhere.
- **Error monitoring is not optional.** Especially on iPad where you literally cannot open a console.
- **The plan calls for many files, not one.** The kickoff document maps out 10+ individual JavaScript modules, each with a single responsibility. This isn't busywork — it's what lets the AI (and you) understand and modify the code later. One giant file becomes unmaintainable fast.
- **One org, many projects.** You don't need separate Sentry accounts for each app. One organization holds all your projects cleanly.

---

## What's Next: Phase 2

Phase 2 is where the app comes to life. The kickoff document specifies these individual files to create:

**Core JS modules** (built in this order):
1. `assets/js/logger.js` — All logging and Sentry integration
2. `assets/js/utils.js` — Shared utilities (escapeHtml, showToast, etc.)
3. `assets/js/database-tables.js` — Table name constants
4. `assets/js/supabase-gateway.js` — The ONLY file that talks to the database
5. `assets/js/state.js` — Application state management
6. `assets/js/router.js` — URL routing for the single-page app
7. `assets/js/app.js` — Entry point that wires everything together

**Views and components:**
8. `assets/js/views/bottle-page.js` — What guests see when they scan a QR code
9. `assets/js/views/admin.js` — The winery staff admin panel
10. `assets/js/components/qr-generator.js` — Generates QR codes for bottles

**Stylesheets:**
11. `assets/css/main.css` — Global styles
12. `assets/css/bottle-page.css` — Bottle page styles
13. `assets/css/admin.css` — Admin panel styles

Each file has a single job. This is the architecture that keeps the project manageable as it grows.

---

## Chapter 3: Bringing the App to Life

**Date:** March 13, 2026
**Goal:** Build all Phase 2 core JS modules, views, components, and stylesheets — turning the scaffolding into a working application.

### Step 9: Create the core JS modules

Following the build order from `CLAUDE.md` (logger → utils → database-tables → supabase-gateway → state → router → app), we created each module one at a time and ran the linter after each group.

| File | What it does |
|------|-------------|
| `assets/js/logger.js` | All console and Sentry logging. The only file allowed to use `console.*` |
| `assets/js/utils.js` | Shared utilities: `escapeHtml()`, `showToast()`, `formatDate()`, `slugify()`, global error handlers |
| `assets/js/database-tables.js` | Table name constants — single source of truth for DB table names |
| `assets/js/supabase-gateway.js` | The **only** file that imports Supabase. Auth, wineries, wines, admin CRUD |
| `assets/js/state.js` | Plain getter/setter state management. No reactive framework needed |
| `assets/js/router.js` | SPA path parsing and `history.pushState` navigation |
| `assets/js/app.js` | Entry point — wires routes, auth listener, error handlers, dynamic imports |

**Vibe coder tip:** Notice how every module has exactly one job. The logger logs. The gateway talks to the database. The state holds data. When something breaks, you know exactly which file to look at. This isn't about being fancy — it's about staying sane when the project grows.

### Step 10: Create the views

Two views handle the entire UI:

| File | What it does |
|------|-------------|
| `assets/js/views/bottle-page.js` | The public page guests see when scanning a QR code. Shows wine name, vintage, tasting notes, price, and food pairings |
| `assets/js/views/admin.js` | The staff panel — login form, wine list table, and add/edit wine form. All in one file with internal routing |

Both views follow the same pattern: export a `render(container, ...)` function that `app.js` calls via dynamic `import()`. Every piece of user content goes through `escapeHtml()` before hitting `innerHTML`. Every error shows a toast.

### Step 11: Create the QR generator component

`assets/js/components/qr-generator.js` wraps the `qrcode` npm library. It generates a canvas-based QR code for any bottle URL. Simple wrapper — one function in, one canvas out.

### Step 12: Create the stylesheets

Three CSS files, matching the structure:

| File | What it does |
|------|-------------|
| `assets/css/main.css` | Global reset, typography, buttons, toast notifications, forms, loading states |
| `assets/css/bottle-page.css` | The public wine page — clean, mobile-first, designed for quick scanning |
| `assets/css/admin.css` | Login form, wine list table, wine edit form, responsive breakpoints |

### What we had at the end of Chapter 3

- All 7 core JS modules created and linting clean
- 2 views (bottle-page, admin) with full CRUD UI
- 1 component (QR generator)
- 3 stylesheets
- **Phase 2: Complete**

### Key lessons

- **Build order matters.** Each module depends on the ones before it. Logger first, then utils (which imports logger), then gateway (which imports both). Following the specified order means you never have circular dependency surprises.
- **One file, one job.** The gateway pattern (one file owns all DB access) seems strict, but it means you can search for any Supabase call and find it in exactly one place. Same for logging, same for state.
- **escapeHtml() everywhere.** Every single piece of user-supplied data gets escaped before `innerHTML`. This isn't paranoia — it's the rule. XSS vulnerabilities happen when you forget "just this one time."
- **Toast is the only error UI.** No alerts, no console instructions (iPad has no console). Every error the user might encounter shows a toast. This is a hard constraint from the environment.

---

## Chapter 4: Locking Down the Database

**Date:** March 13, 2026
**Goal:** Create the Supabase database schema — tables, Row Level Security, and test data — so the app has real data to talk to.

### Step 13: Create the database tables

The kickoff document specifies three tables:

| Table | Purpose |
|-------|---------|
| `wineries` | One row per winery. Has a slug for URL routing, a name, and an active flag |
| `wines` | One row per wine. Links to a winery via `winery_id`. Stores everything a guest sees: name, varietal, vintage, tasting notes, price, food pairings |
| `winery_admins` | Links a Supabase auth user to a winery. Controls who can manage which wines |

All three use UUID primary keys (via `gen_random_uuid()`), have `created_at` timestamps, and use foreign key constraints with `on delete cascade` to keep data clean.

The `winery_admins` table has a `role` column with a check constraint: only `'owner'` or `'staff'` are valid values. And a unique constraint on `(user_id, winery_id)` prevents duplicate assignments.

**Vibe coder tip:** You don't need to understand every SQL keyword. The important thing is the *shape*: wineries have wines, admins belong to wineries. The SQL is in `docs/phase3-supabase-schema.sql` if you ever need to recreate it.

### Step 14: Enable Row Level Security

Row Level Security (RLS) is what makes Supabase safe to use with a public API key. Without RLS, anyone with the anon key could read, insert, update, or delete any row. With RLS enabled, every query is filtered through policies you define.

We enabled RLS on all three tables. After this step, *no one* can access any data until we create policies — it's locked down by default.

**Vibe coder tip:** "Enable RLS" means "deny everything unless a policy explicitly allows it." This is the right default. It's much safer to start locked and open specific doors than to start open and try to close them.

### Step 15: Create RLS policies

Six policies, each with a specific job:

| Policy | Table | Who | What |
|--------|-------|-----|------|
| Public can view active wineries | wineries | Anyone (no login) | SELECT where `is_active = true` |
| Admins can update own winery | wineries | Logged-in admin | UPDATE only if they're in `winery_admins` for that winery |
| Public can view active wines | wines | Anyone (no login) | SELECT where `is_active = true` |
| Admins can insert wines for own winery | wines | Logged-in admin | INSERT only if they're in `winery_admins` for that `winery_id` |
| Admins can update wines for own winery | wines | Logged-in admin | UPDATE only if they're in `winery_admins` for that `winery_id` |
| Admins can read own row | winery_admins | Logged-in user | SELECT only their own row (`user_id = auth.uid()`) |

The key insight: **public SELECT policies have no auth check** — they use `is_active = true` as the only filter. This is what makes the QR scan bottle page work without login. All write policies check `auth.uid()` against the `winery_admins` table, ensuring admins can only touch their own winery's data.

**Vibe coder tip:** Notice there's no DELETE policy anywhere. That's intentional — wines get soft-deleted by setting `is_active = false`. No data is ever permanently removed through the app. This is a safety net.

### Step 16: Seed test data

We inserted one test winery ("Test Winery" with slug `test-winery`) and two wines:

1. **Estate Cabernet Sauvignon** — 2021 Napa Valley, $58/bottle. Grilled ribeye, aged cheddar, lamb chops.
2. **Reserve Chardonnay** — 2022 Russian River Valley, $42/bottle. Pan-seared halibut, brie, roasted chicken.

Both wines include full descriptions, tasting notes, and food pairings — the exact fields that the bottle page will display when a guest scans a QR code.

### Step 17: Connect Supabase to the app

The config pattern (from Chapter 2) already handles this. Two places need credentials:

**For local development:** Create `config.local.php` in the project root with your Supabase URL and anon key. This file is git-ignored — it never leaves your machine.

**For production:** Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub repository secrets. The deploy workflow passes these as environment variables, and `api/config.php` reads them with `getenv()`.

The anon key is safe to expose in the browser — that's by design. RLS policies (Step 15) enforce all permissions. The `service_role` key must **never** appear in frontend code.

### What we had at the end of Chapter 4

- Three tables created: `wineries`, `wines`, `winery_admins`
- Row Level Security enabled on all tables
- Six RLS policies: public read for guests, winery-scoped write for admins
- Test data: 1 winery, 2 wines with full tasting details
- Supabase credentials documented for both local dev and production
- Complete SQL saved in `docs/phase3-supabase-schema.sql`
- **Phase 3: Complete**

### Key lessons

- **RLS is your security layer, not your app code.** Even if someone bypasses your UI entirely and calls the Supabase API directly, RLS ensures they can only do what the policies allow. The anon key is *meant* to be public — RLS is what makes that safe.
- **Soft delete beats hard delete.** Setting `is_active = false` instead of deleting rows means you can always recover. The public SELECT policies filter on `is_active = true`, so deactivated wines disappear from the guest view instantly.
- **Admin policies check winery ownership, not just "is logged in."** A logged-in user from Winery A cannot modify Winery B's wines. Every write policy joins against `winery_admins` to verify the relationship.
- **The SQL is documentation.** We saved the complete schema in `docs/phase3-supabase-schema.sql`. If you ever need to recreate the database (new Supabase project, staging environment), you have the exact SQL ready to paste.

---

## What's Next: Phase 4

Phase 4 updates the GitHub Actions deploy workflow to pass Supabase and Sentry credentials as environment variables in production. The deploy pipeline from Chapter 1 handles FTP — now it needs to inject the config secrets so the live site can talk to the database.
