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
