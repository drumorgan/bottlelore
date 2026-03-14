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

## Chapter 5: Making It Real — Build, Deploy, and Debug

**Date:** March 13, 2026
**Goal:** Get the production bundle building in CI, deploying to the server, and loading in the browser.

### Step 18: Add a build step to the deploy workflow

Chapter 1's deploy workflow was simple: check out the code, FTP it to the server. But now we have a Vite build that bundles and minifies JavaScript. The raw source files alone won't work in production — we need the compiled bundle.

We split the workflow into two jobs:

1. **Build job** — checks out the code, runs `npm ci`, runs tests, runs `npm run build`, verifies that `assets/dist/.vite/manifest.json` exists, then uploads `assets/dist/` as a GitHub Actions artifact.

2. **Deploy job** — checks out the code, downloads the build artifact into `assets/dist/`, then FTPs everything to the server.

The deploy job has `needs: build`, so it only runs if the build succeeds. This means a broken build never reaches the live site.

**Vibe coder tip:** The verify step (`if [ ! -f manifest.json ]; exit 1`) is a safety net. If the build silently produces nothing, the workflow fails before deploying. Always verify your build output exists before shipping it.

### Step 19: Add Supabase credentials to the server

The config pattern from Chapter 2 reads credentials from `config.local.php` on the server. We created this file directly in cPanel File Manager at `bottlelore.com/config.local.php`:

```php
<?php
return [
    'supabase_url' => 'https://your-project.supabase.co',
    'supabase_anon_key' => 'your-anon-key-here',
    'sentry_dsn' => 'your-sentry-dsn-here',
];
```

This file is git-ignored — it lives only on the server. The deploy's FTP sync won't delete it because it's not in the repo (and the FTP action only removes files it previously tracked).

**Vibe coder tip:** Never put credentials in your repo, even in a "local config" file. Create it directly on the server through cPanel. If it accidentally ends up in a commit, remove it immediately and rotate the keys.

### Step 20: Wire up index.php to load the production bundle

The entry point `index.php` needs to know which JavaScript file to load. In development, it's just `assets/js/app.js`. In production, Vite generates a hashed filename like `app.Sw2BVqgX.min.js` — and the mapping lives in `.vite/manifest.json`.

We updated `index.php` to:
1. Read the manifest file and extract the hashed bundle filename
2. If found, load the production bundle via a `<script type="module">` tag
3. If not found (local dev, or manifest missing), fall back to loading the raw source with an import map that resolves `@supabase/supabase-js` from a CDN

We also added a visible diagnostics panel (inside a collapsible `<details>` element) that shows whether the bundle was found, whether the manifest exists, and whether the Supabase/Sentry config is set. This is critical for iPad debugging — no DevTools means errors need to be visible on the page.

**Vibe coder tip:** The dev fallback with import maps means you can test the app without running a build. But production should always use the bundle — it's smaller, faster, and has all dependencies compiled in.

### Step 21: Fix hidden files in the artifact upload

After deploying, the site still showed "Bundle: NOT FOUND" and "Manifest: MISSING." The deploy was succeeding (green checkmarks in GitHub Actions), files were appearing on the server — but `.vite/manifest.json` was nowhere to be found.

The culprit: **`actions/upload-artifact@v4` excludes hidden directories by default.** The `.vite` folder (which starts with a dot) was silently dropped from the build artifact. The build job verified the manifest existed (same job, same filesystem), but the artifact that got passed to the deploy job didn't include it.

The fix was one line:

```yaml
- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: |
      assets/dist/
    include-hidden-files: true   # ← this was missing
    retention-days: 1
```

After this fix, the full build output — including `.vite/manifest.json` — reached the server. The app loaded the production bundle correctly.

**Vibe coder tip:** When a deploy "succeeds" but the result is wrong, check what's actually arriving on the server. Green checkmarks in CI don't mean the right files were deployed. In our case, the build was fine, the FTP was fine — but the handoff between them (the artifact) was silently dropping files. cPanel File Manager is your friend here.

### What we had at the end of Chapter 5

- Deploy workflow: build → verify → artifact → FTP (two-job pipeline)
- Supabase credentials on the server via `config.local.php`
- `index.php` loading the production Vite bundle via manifest lookup
- Visible diagnostics panel for iPad debugging
- Production bundle successfully deployed and loading in the browser

### Key lessons

- **CI green doesn't mean "working."** Our deploy succeeded 5 times in a row while silently shipping an incomplete build. The artifact upload was dropping hidden files. Trust but verify — check what actually landed on the server.
- **`upload-artifact@v4` excludes dotfiles by default.** This is a breaking change from v3. If your build output includes directories like `.vite`, `.next`, `.nuxt`, etc., you must set `include-hidden-files: true`. This will bite you silently.
- **Two-job pipelines need artifact handoffs.** The build job and deploy job run on different machines. You can't just `npm run build` and expect the files to be there for the FTP step. Artifacts bridge the gap — but only if they include everything.
- **Visible error reporting saves hours.** The diagnostics panel in `index.php` told us exactly what was wrong: manifest missing, bundle not found. Without it, we'd have been guessing. On iPad, every error must surface in the UI.

---

## Chapter 6: The Real Schema and the Bootstrap Saga

**Date:** March 13–14, 2026
**Goal:** Expand the database schema from a simple prototype to the real multi-role architecture, and get the first super admin account working.

### Step 22: Expand the schema for multi-role access

Chapter 4's schema was a starting point — three tables with simple RLS. But the real app needs a **three-tier permission model**: super admins (platform owners), winery owners, and winery staff. We also need flights (curated wine tasting sets).

The expanded schema added:

| New table / concept | Purpose |
|---|---|
| `super_admins` | Platform-level admin. You. One row with your auth user ID |
| `flights` | A named group of wines (e.g., "Summer Tasting Flight") — belongs to a winery |
| `flight_wines` | Join table linking wines to flights, with sort order |
| `is_super_admin()` | SQL helper function — checks if `auth.uid()` is in `super_admins` |
| `is_winery_admin()` | SQL helper — checks if current user admins a specific winery |
| `is_winery_owner()` | SQL helper — checks if current user is an *owner* (not just staff) |
| `link_user_to_winery()` | Function to safely link a user to a winery with role checks |

The `wineries` table also got more profile fields: description, location, website, phone, hours, and social media links.

### Step 23: Rewrite RLS policies for the three-tier model

The original 6 policies became **30+ policies**. The key pattern:

- **Public:** Can SELECT active records (wines, wineries, flights). No auth needed — this is what makes QR scan work.
- **Super admin:** Can do everything. Every table has SELECT/INSERT/UPDATE policies that check `is_super_admin()`.
- **Winery owner:** Full control of *their* winery — wines, flights, staff. Can't touch other wineries.
- **Winery staff:** Can manage wines and flights for their winery, but can't change the winery profile or add other admins.

The `flight_wines` join table also gets DELETE policies (unlike wines, which use soft-delete). Removing a wine from a flight is a real delete because the join row has no meaning on its own.

**Vibe coder tip:** Helper functions like `is_super_admin()` are marked `security definer` — they run with elevated privileges so they can read the `super_admins` table even though RLS would normally block it. This is safe because the function only returns true/false, never exposes data.

### Step 24: The bootstrap saga — and why we abandoned it

The original plan was elegant: the first person to sign up automatically becomes the super admin. A database function `bootstrap_super_admin()` would insert the caller's `auth.uid()` into `super_admins`, but only if the table was empty. A companion function `is_bootstrap_needed()` let the login page check whether to show a "Create Account" form or a regular login form.

**What actually happened:** A cascade of bugs, each fix revealing the next.

1. **Dev mode crash.** The admin page referenced `__BUILD_SHA__` — a Vite build-time constant that doesn't exist when running unbundled. Safari/iPad crashed silently. *Fix: check if the variable is defined before using it.*

2. **Bootstrap errors swallowed.** The bootstrap flow called Supabase but didn't surface errors in the UI. On iPad with no console, the signup appeared to succeed when it actually failed. *Fix: show the actual Supabase error in a toast.*

3. **Login error message useless.** Failed logins showed a generic "Login failed" with no detail. *Fix: display the actual error message from Supabase (e.g., "Invalid login credentials").*

4. **Wine list crash.** Super admins don't have a `winery_admins` row (they're in `super_admins` instead). The admin view assumed every logged-in user had a winery assignment and crashed when the query returned nothing. *Fix: detect super admin role and load all wines instead of filtering by winery.*

5. **Email confirmation timing.** Supabase requires email confirmation by default. The bootstrap flow signed the user up, but the `bootstrap_super_admin()` call happened before the user confirmed their email — so `auth.uid()` was null. *Fix: defer bootstrap until after sign-in, checking for a pending flag.*

6. **Bootstrap deadlock.** If the user existed in Supabase auth but the `super_admins` row wasn't created (because of bug #5), subsequent sign-ins would see "bootstrap not needed" (user exists) but the user had no admin role. Stuck in limbo. *Fix: check for the specific case where the user is authenticated but has no super_admin row.*

7. **The final realization.** After fixing six bugs, we stepped back and asked: why is the app creating accounts at all? This is a private admin tool. The platform owner (you) has full access to the Supabase dashboard. **Just create the user directly in Supabase.**

### Step 25: Remove bootstrap, do it the simple way

We deleted all the bootstrap UI code from the admin view. The signup flow, the pending-bootstrap detection, the conditional form rendering — all gone. The admin page is now just a login form.

**The simple setup process:**

1. Run the schema SQL in Supabase SQL Editor (it includes `bootstrap_super_admin()` for reference, but you don't use it from the app)
2. In Supabase → Authentication → Users → click "Add user"
3. Enter your email and password, check "Auto Confirm User"
4. Copy the new user's UUID
5. In SQL Editor: `INSERT INTO public.super_admins (user_id) VALUES ('your-uuid-here');`
6. Log in at `/admin` — done

**Vibe coder tip:** Not everything needs to be automated. The bootstrap flow was 200+ lines of code, caused six bugs, and served a use case (first-time setup) that happens exactly once. Doing it manually in the Supabase dashboard takes 30 seconds and can't break. Sometimes the simplest solution is the best one.

### Step 26: Password recovery

After multiple test signups and password changes during the bootstrap debugging, the working password got lost. Recovery was straightforward:

1. In Supabase → Authentication → Users, delete the old user
2. Create a fresh user with "Add user" → new email/password → Auto Confirm
3. Insert the new UUID into `super_admins`
4. Log in successfully at `/admin`

### What we had at the end of Chapter 6

- Expanded schema: 6 tables, 30+ RLS policies, 4 helper functions, performance indexes
- Three-tier permission model: super admin → winery owner → winery staff
- Flights and flight-wines support for curated tasting experiences
- Clean admin login page (no bootstrap complexity)
- Super admin account created and working
- Complete SQL saved in `docs/phase3-supabase-schema.sql`

### Key lessons

- **Don't automate one-time setup.** The bootstrap flow solved a problem that occurs exactly once per deployment. A 30-second manual step in the Supabase dashboard replaced 200+ lines of buggy code. Ask yourself: "How often does this happen?" If the answer is "once," just document the manual steps.
- **Each bug fix can reveal the next.** The bootstrap saga was six bugs deep — each fix exposed a new failure mode. When you're that deep in a rabbit hole, consider whether the feature itself is the problem, not just the implementation.
- **iPad debugging is hard.** Half these bugs were invisible without a console. The visible diagnostics panel (from Chapter 5) and toast error messages were the only way to diagnose issues. Never skip error surfacing in the UI.
- **Security functions need `security definer`.** Helper functions like `is_super_admin()` need elevated privileges to read protected tables. Without `security definer`, RLS blocks the helper itself, and every policy that uses it silently returns false.
- **The schema SQL is your safety net.** Having the complete schema in `docs/phase3-supabase-schema.sql` meant we could reason about the entire permission model in one place. When we needed to delete and recreate the user, the SQL was ready.

---

## Chapter 7: End-to-End Testing & Fixes

**Date:** March 14, 2026
**Goal:** Test every user flow end-to-end and fix what's broken. Wire in the QR code generator. Harden error handling.

### Step 27: Test the guest QR scan flow

We traced the full path from URL to rendered wine page: `/:winerySlug/:wineId` → router.js → bottle-page.js → supabase-gateway.js → Supabase. The flow worked but had a security gap — the winery slug in the URL was never validated against the wine's actual winery. A user could use any slug with any wine ID and still see the wine.

**Fix:** Added winery slug validation in `bottle-page.js`. After fetching the wine, we now compare `wine.wineries.slug` against the URL's `winerySlug`. A mismatch shows "Wine not found" — preventing URL spoofing.

### Step 28: Fix the admin auth race condition

A critical bug: refreshing any admin page (`/admin/wines`, `/admin/wines/new`, etc.) would redirect to the login form — even when the user had a valid session. The root cause was a race condition:

1. `app.js` sets up `onAuthStateChange()` (async — waits for Supabase to restore the session)
2. `app.js` calls `route()` immediately
3. Admin views check `state.isLoggedIn()` — which is still `false` because the auth callback hasn't fired yet
4. Admin view redirects to `/admin`

**Fix:** Created an `authReadyPromise` in `app.js` that resolves when the first `onAuthStateChange` event fires. Admin views now `await authReadyPromise` before checking login state. A 3-second timeout ensures the app doesn't hang if Supabase is unreachable.

### Step 29: Fix the form.name collision

A subtle but critical bug in the wine create/edit form: `form.name.value` on line 223 of admin.js was supposed to read the wine name input, but `HTMLFormElement.name` is an inherited property that returns the form's own `name` attribute (an empty string) — NOT the `<input name="name">` element. This meant `form.name.value` was `undefined`, and `.trim()` would throw a `TypeError`, crashing every wine save attempt.

**Fix:** Replaced all `form.fieldName.value` accessors with explicit `document.getElementById('wine-name').value` calls. This is unambiguous and avoids the prototype property shadowing issue entirely.

**Vibe coder tip:** HTML form elements have built-in properties like `name`, `action`, `method`, and `length` that shadow identically-named input elements. If you have an `<input name="name">` inside a form, `form.name` returns the form's own attribute, not the input. Use `getElementById` or `form.elements.namedItem()` to avoid this class of bugs.

### Step 30: Wire the QR code generator into the admin panel

The `qr-generator.js` component existed but wasn't connected to any view. We wired it into the admin panel in two places:

1. **Wine list table** — Added a "QR" button next to each wine's "Edit" button. Clicking it opens a modal overlay with the generated QR code, the wine name as a title, and the full bottle URL displayed below. The modal closes by clicking "Close" or the backdrop.

2. **Wine edit form** — When editing an existing wine, a QR code section appears below the form, showing the QR code and URL for that wine. This lets staff quickly scan or screenshot the QR code while reviewing wine details.

Both use the `generateQR()` and `getBottleUrl()` functions from the existing component — no changes needed to the component itself.

### Step 31: Add winery guard to the wine form

Another bug: navigating directly to `/admin/wines/new` (e.g., via browser bookmark or page refresh) would crash because `state.getCurrentWinery()` was `null`. The winery is normally set by the wine list view, but direct navigation skips that step.

**Fix:** The wine form now checks for a winery in state before rendering. If missing, it fetches the admin's winery (or falls back to the first winery for super admins) — the same logic used by the wine list. If no winery is found, it shows an error toast and redirects back.

### Step 32: Add loading states and Sentry user tracking

Two polish items:

1. **Loading states on buttons** — Login and wine save buttons now disable and show "Signing in…" or "Saving…" while the async operation is in progress. On failure, they re-enable with the original text. This prevents double-submits and gives iPad users visible feedback.

2. **Sentry user tracking** — `app.js` now calls `logger.setUser(user)` on login and `logger.clearUser()` on logout, so Sentry error reports include the user's ID and email. This was a gap — errors were being reported but with no user context.

### Step 33: Fix redundant parsePath() call

A minor bug in `app.js:33` — the admin route case was calling `parsePath()` a second time to extract `wineId`, despite it already being destructured on line 18. Fixed to use the existing `wineId` variable.

### Step 34: Validate RLS policies

Reviewed all 30+ RLS policies in `docs/phase3-supabase-schema.sql` against the app's data access patterns:

| Flow | Policy | Status |
|------|--------|--------|
| Guest reads wine (public SELECT) | `is_active = true` filter, no auth | Correct |
| Guest reads winery (public SELECT) | `is_active = true` filter, no auth | Correct |
| Admin reads own wines | `is_winery_admin(winery_id)` check | Correct |
| Admin creates wine | `is_winery_admin(winery_id)` check on INSERT | Correct |
| Admin updates wine | `is_winery_admin(winery_id)` check on UPDATE | Correct |
| Super admin full access | `is_super_admin()` on all tables | Correct |
| Cross-winery isolation | Admin can only modify wines for their winery | Correct |
| No DELETE policies on wines | Intentional — soft-delete via `is_active` | Correct |

All RLS policies are sound. The three-tier model (public → winery admin → super admin) is correctly enforced at the database level.

### Step 35: Verify error handling

All error paths surface via `showToast()`:

| Error scenario | Handler | Toast? |
|---|---|---|
| Wine not found (invalid QR) | bottle-page.js catch block | Yes |
| Login failed | admin.js login catch | Yes |
| Wine save failed | admin.js form submit catch | Yes |
| Wine list load failed | admin.js renderWineList catch | Yes |
| QR generation failed | qr-generator.js catch | Yes |
| Route render failed | app.js route() catch | Yes |
| Unhandled promise rejection | utils.js global handler | Logged (Sentry) |
| Global JS error | utils.js global handler | Logged (Sentry) |

No `console.*` calls exist outside of `logger.js`. All user-facing errors use `showToast()`.

### What was fixed in Phase 7

| Bug | Severity | Fix |
|-----|----------|-----|
| `form.name.value` crashes wine save | Critical | Use `getElementById` for all form field access |
| Admin pages redirect on refresh | Critical | `authReadyPromise` waits for session restore |
| Direct nav to wine form crashes (no winery) | High | Fetch winery if not in state |
| QR generator not integrated | High | Added to wine list (modal) and edit form |
| Winery slug not validated in bottle page | Medium | Compare URL slug to wine's winery slug |
| Redundant `parsePath()` call | Low | Use already-destructured variable |
| No Sentry user context | Low | Call `logger.setUser()`/`clearUser()` on auth |
| No loading states on buttons | Low | Disable + text change during async ops |

### Key lessons

- **`HTMLFormElement.name` is a trap.** It's one of several built-in form properties (`name`, `action`, `method`, `length`) that shadow identically-named input elements. Always use `getElementById` or `form.elements.namedItem()` for disambiguation.
- **Auth state is async.** On page load, Supabase needs time to restore the session from storage. Any code that checks "is the user logged in?" during initialization must wait for the auth state to resolve first. A promise-based gate pattern handles this cleanly.
- **Wire features end-to-end, not just write them.** The QR generator component was complete but never imported by any view. A component that exists but isn't used is the same as a component that doesn't exist.
- **Direct navigation breaks assumptions.** SPAs often set state incrementally as users navigate through screens. But users can bookmark or refresh any URL. Every view must handle being the entry point — not just the happy path from the previous screen.
