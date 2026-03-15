# Vibe Coding with Claude: From Zero to Live App

A step-by-step guide to building a real web app with AI — written for someone who's never done it before. If you can describe what you want, you can vibe-code it into existence. This guide shows you how.

We built this guide while creating [BottleLore](https://bottlelore.com), a winery QR code app. Every lesson here came from a real mistake, a real fix, or a real "aha" moment — but the advice applies to any project.

---

## How to Use This Guide

This isn't a textbook. It's a real project diary — mistakes, detours, and all. Each chapter covers one phase of development. By the end, you'll understand the full arc from "I have an idea" to "people are using my app."

**What you need to start:**
- A description of what you want to build (a doc, a sketch, even a paragraph)
- An AI coding assistant (we used [Claude Code](https://docs.anthropic.com/en/docs/claude-code))
- A willingness to learn as you go

**What you don't need:**
- Programming experience
- A computer science degree
- To understand every line of code the AI writes

---

## Chapter 1: Start with the Pipeline, Not the App

**Goal:** Go from nothing to a live URL that updates automatically when you push code.

Most people want to start writing the app. Don't. Start with the delivery pipeline — the system that gets your code from your computer to a live URL. Once that works, every change you make is instantly visible to the world. This keeps momentum high and eliminates the "it works on my machine" problem.

### Step 1: Describe your project to the AI

Your first prompt sets the tone for the whole project. Give the AI everything you have: who the users are, what they need, what the constraints are. A PDF, a doc, a detailed paragraph — whatever you've got.

We gave Claude a client requirements PDF and asked it to create a kickoff document. It produced a detailed build plan broken into phases, with every file mapped out. That kickoff document became our roadmap for the entire project.

**Tip:** The better the brief, the better the code. Spend 10 minutes making your initial description detailed. It saves hours later.

### Step 2: Get hosting and a domain

You need somewhere to put your site. The specifics depend on your hosting provider, but the basics are:

1. **Register a domain** (or use one you already have)
2. **Point DNS to your hosting** — change nameservers or add DNS records
3. **Create the site directory** on your server
4. **Put a "Hello World" page there** — just to prove the chain works

DNS changes can take minutes to hours to propagate. Don't panic if the site doesn't load right away. Do something else and come back.

### Step 3: Set up automated deployment

You don't want to manually upload files every time you make a change. Set up a pipeline: push code to GitHub, and it automatically appears on the live site.

The basic recipe:
1. **Create deployment credentials** scoped to your site's directory only. If you're using FTP, create an FTP account limited to just your site folder. This is critical — deploy tools often sync by deleting files that aren't in the repo. A scoped account can't accidentally delete your other sites.
2. **Store credentials as GitHub Secrets** — never in your code.
3. **Create a GitHub Actions workflow** — a YAML file that says "on push to main, deploy to the server."
4. **Test it** — push a change, watch the action run, verify the change appears on the live site.

### What you have at the end of Chapter 1

- A live website at your domain
- Automated deployment: push to GitHub → site updates automatically
- Zero application code — but the entire delivery pipeline works

### Key lessons

- **Infrastructure first.** Get deployment working before you write a single line of application code. Every future change will be immediately visible on a real URL.
- **Scope your deploy credentials.** The deploy tool mirrors your repo and deletes extras. If your deploy user has full server access, that's a disaster waiting to happen.
- **Start with Hello World.** The simplest possible proof that the whole chain works: code in repo → GitHub → deploy → live site.

---

## Chapter 2: Wire Up the Plumbing

**Goal:** Connect the database, error monitoring, and project structure — the invisible infrastructure that every real app needs.

### Step 4: Set up config management

Your app will need API keys, database URLs, and other credentials. Establish a config pattern early:

- **Never hardcode credentials in JavaScript.** They'd be visible to anyone who views your page source.
- **Use server-side injection.** Have your server (PHP, Node, etc.) read credentials from environment variables or a local config file, then inject them into the page as a JavaScript variable.
- **Git-ignore local config files.** Credentials stay on the machine, never in the repo.

This pattern means the same codebase works in development, CI, and production without environment file gymnastics.

### Step 5: Set up error monitoring

If you're building for mobile, tablets, or any device without developer tools: **error monitoring is not optional.** When something breaks in production, you need to know — and users won't tell you. They'll just leave.

Services like [Sentry](https://sentry.io) catch JavaScript errors automatically and report them to a dashboard. Setup takes about 5 minutes. Load the monitoring script before your application code so it catches errors even during initialization.

**Tip:** Set up error monitoring early. It costs nothing for small projects. You'll thank yourself the first time you catch a silent error.

### Step 6: Create the project instruction file

This is the **single most important thing in your repo for vibe coding**: a file that tells your AI assistant how to behave in this project.

Create a `CLAUDE.md` file (or equivalent) that includes:
- **Hard rules** — things the AI must never violate (e.g., "only one file talks to the database")
- **Tech stack** — what tools and libraries you're using
- **Build order** — which modules depend on which
- **Known gotchas** — platform quirks, browser bugs, deployment issues
- **Deployment flow** — how code gets from repo to production

This file is your AI's memory between sessions. Without it, every new session starts from zero. With it, the AI picks up exactly where it left off and follows your rules.

**Tip:** Your `CLAUDE.md` is your project's constitution. Put your non-negotiable rules there. The AI reads it at the start of every session and follows it.

### Step 7: Set up the project scaffolding

Before writing any application code, create the project structure:

- **Package manager config** (`package.json`) — lists dependencies and build scripts
- **Build tool config** (Vite, Webpack, etc.) — bundles your code for production
- **Test runner config** — so you can verify things work
- **Linter config** (ESLint, etc.) — catches mistakes automatically
- **Server config** (`.htaccess`, `nginx.conf`, etc.) — routing, HTTPS, caching
- **`.gitignore`** — keep build artifacts, node_modules, and secrets out of the repo
- **Directory structure** — folders for JS, CSS, views, components, tests, docs

None of these are the actual app. They're the scaffolding the app will be built inside. A solid foundation means the AI can write clean, organized code instead of one giant messy file.

### What you have at the end of Chapter 2

- Error monitoring connected and catching errors
- Database credentials flowing through your config pattern
- Build tooling configured
- Complete project scaffolding ready for application code

### Key lessons

- **Config injection beats hardcoded keys.** One codebase works everywhere.
- **Error monitoring is not optional.** Especially on devices where you can't open a console.
- **The plan calls for many files, not one.** Multiple small modules with single responsibilities are what let the AI (and you) understand and modify the code later.

---

## Chapter 3: Build the Application

**Goal:** Create all the core modules, views, and styles — turning the scaffolding into a working application.

### Step 8: Build modules in dependency order

Your kickoff document should specify a build order. Follow it. Each module depends on the ones before it. Building in order means you never have circular dependency surprises.

A typical module structure for a web app:

| Layer | Examples | Purpose |
|-------|----------|---------|
| Utilities | Logger, helpers, formatters | Shared tools everything else uses |
| Data | Database gateway, table constants | One file owns all database access |
| State | State manager | Plain getters/setters for app state |
| Routing | Router | URL parsing and navigation |
| Views | Page components | What users see and interact with |
| Components | Reusable UI pieces | Shared across views |
| Entry point | App initializer | Wires everything together |

**The gateway pattern:** One file owns all database access. It seems strict, but it means you can search for any database call and find it in exactly one place. Same idea for logging — one file does all logging.

### Step 9: Build the views

Views are what users actually see. Each view exports a render function that the entry point calls. Key rules:

- **Escape all user content.** Every piece of user-supplied data gets sanitized before being inserted into HTML. XSS vulnerabilities happen when you forget "just this one time."
- **Surface all errors visually.** No `alert()` boxes, no console-only errors. Use toast notifications or visible error states.
- **Keep views focused.** One view = one purpose. A public-facing page and an admin panel should be separate views.

### Step 10: Style it

Match your CSS structure to your view structure. Global styles in one file, view-specific styles in their own files. Mobile-first responsive design means it works on phones by default.

### What you have at the end of Chapter 3

- All core modules created and linting clean
- Views with full UI
- Reusable components
- Stylesheets
- A complete application (though not yet connected to real data)

### Key lessons

- **Build order matters.** Logger first, then utils (which imports logger), then gateway (which imports both). Follow the dependency chain.
- **One file, one job.** When something breaks, you know exactly which file to look at.
- **Escape HTML everywhere.** This is a security rule, not a suggestion.

---

## Chapter 4: Set Up Your Database

**Goal:** Create the database schema — tables, security rules, and test data — so the app has real data to talk to.

### Step 11: Design your tables

Start with the core entities your app needs. For every table:

- Use UUID primary keys (not auto-incrementing integers) — they're safer for public-facing apps
- Add `created_at` timestamps
- Use foreign key constraints to keep data relationships clean
- Add a soft-delete flag (like `is_active`) instead of actually deleting rows

**Tip:** Soft delete (setting `is_active = false` instead of deleting rows) means you can always recover data. Your public queries filter on `is_active = true`, so deactivated records disappear from the user's view instantly.

### Step 12: Lock down security

If you're using a service like Supabase where the API key is in the browser, **Row Level Security (RLS) is your security layer, not your app code.**

The principle: "Deny everything unless a policy explicitly allows it."

- Enable RLS on every table (this blocks all access by default)
- Create explicit policies for each operation (SELECT, INSERT, UPDATE, DELETE)
- Public data gets policies with no auth check (just content filters like `is_active = true`)
- Private data gets policies that verify the user's identity and permissions
- Use database helper functions for permission checks (e.g., `is_admin()`)

Even if someone bypasses your UI entirely and calls the API directly, RLS ensures they can only do what the policies allow.

### Step 13: Seed test data

Insert realistic test data so you can verify the app works end-to-end. Include all the fields your views expect — don't leave optional fields empty during testing, or you'll never test the full render path.

### Step 14: Connect the database to your app

Your config pattern (from Chapter 2) already handles this. Two places need credentials:

- **Local development:** A git-ignored config file on your machine
- **Production:** Environment variables or a server-side config file created directly on the server (never in the repo)

### What you have at the end of Chapter 4

- Database tables created with proper relationships
- Security rules enabled and tested
- Test data seeded
- App connected to the database in both dev and production

### Key lessons

- **RLS is your security layer.** The API key is *meant* to be public — security rules are what make that safe.
- **Soft delete beats hard delete.** You can always recover. And your public queries just filter on a flag.
- **Save your schema SQL.** If you ever need to recreate the database (new project, staging environment), you have the exact SQL ready.
- **Admin policies check ownership, not just "is logged in."** A logged-in user from Organization A should not be able to modify Organization B's data.

---

## Chapter 5: Ship It — Build, Deploy, and Debug

**Goal:** Get the production build working in CI, deploying to the server, and loading in the browser.

### Step 15: Add a build step to your deploy workflow

Your Chapter 1 workflow was simple: push code, deploy it. But now you have a build step (bundling, minifying). Split the workflow into two jobs:

1. **Build job** — install dependencies, run tests, run the build, verify the output exists, upload as an artifact
2. **Deploy job** — download the build artifact, deploy to server

The deploy job depends on the build job, so a broken build never reaches the live site.

**Tip:** Always verify your build output exists before deploying. A simple check like "does the manifest file exist?" catches silent build failures.

### Step 16: The hidden files gotcha

This one bit us and will bite you too: **GitHub Actions `upload-artifact@v4` excludes hidden directories by default.** If your build tool outputs to a folder starting with a dot (`.vite`, `.next`, `.nuxt`, etc.), those files will silently disappear from the artifact.

The fix: `include-hidden-files: true` in your artifact upload step.

We deployed 5 times with green checkmarks before discovering the manifest file was being silently dropped. The build was fine, the FTP was fine — but the handoff between them was losing files. CI green doesn't always mean "working."

### Step 17: Set up server-side config

Create your production config file directly on the server (via cPanel, SSH, etc.). Never in the repo. The deploy tool won't delete it because it's not tracked.

### Step 18: Wire up the entry point for production

Your HTML entry point needs to load the right JavaScript:
- **Production:** Read the build manifest to find the hashed bundle filename
- **Development fallback:** Load raw source files (for local testing without a build)

Also add a **visible diagnostics panel** — a collapsible section showing whether the bundle loaded, whether config is set, whether the database is reachable. On devices without developer tools, this is your only debugging lifeline.

### What you have at the end of Chapter 5

- Two-job CI pipeline: build → verify → deploy
- Production bundle building and deploying correctly
- Visible diagnostics for debugging on any device

### Key lessons

- **CI green doesn't mean "working."** Check what actually arrived on the server. Green checkmarks mean the steps ran, not that the right files were deployed.
- **`upload-artifact@v4` excludes dotfiles by default.** Set `include-hidden-files: true` if your build output has dot-directories. This will bite you silently.
- **Two-job pipelines need artifact handoffs.** Build and deploy run on different machines. Artifacts bridge the gap.
- **Visible error reporting saves hours.** On any device without a console, errors must surface in the UI.

---

## Chapter 6: Permissions, Admin, and Knowing When to Simplify

**Goal:** Build out the permission model and admin access. Learn the most important vibe coding lesson: when to delete code.

### Step 19: Design your permission model

Most apps need at least two tiers: public users and admins. Many need three or more. Design this in the database, not in your app code:

- **Public tier:** No login required. Can view public content.
- **Admin tier:** Logged in. Can manage content for their organization.
- **Super admin tier:** Platform owner. Can manage everything.

Use database helper functions (`is_admin()`, `is_super_admin()`) in your security policies. Mark them as `security definer` so they can read permission tables that RLS would normally block.

### Step 20: The automation trap (our biggest lesson)

We tried to build an automated first-run setup: the first person to sign up automatically becomes the super admin. It was elegant in theory. In practice, it caused a cascade of **six bugs**, each fix revealing the next:

1. **Dev mode crash** — a build-time variable didn't exist when running unbundled
2. **Errors swallowed** — the flow didn't surface errors in the UI
3. **Useless error messages** — "Login failed" with no detail
4. **Missing role handling** — admin views assumed every user had an organization
5. **Email confirmation timing** — the setup ran before email was confirmed
6. **State deadlock** — user existed but had no admin role, couldn't proceed or retry

After fixing all six bugs, we asked the right question: **"How often does this happen?"** The answer was: once. Per deployment. Ever.

We deleted 200+ lines of code and replaced it with a 6-step manual process that takes 30 seconds in the database dashboard. The admin page became a simple login form.

**Tip:** Not everything needs to be automated. If something happens once, document the manual steps and move on. Code you don't write has zero bugs.

### What you have at the end of Chapter 6

- Multi-tier permission model enforced at the database level
- Clean admin login page
- Working admin account
- 200 fewer lines of code (and 6 fewer bugs)

### Key lessons

- **Don't automate one-time setup.** If it happens once, a 30-second manual step beats 200 lines of buggy code. Ask: "How often does this happen?"
- **Each bug fix can reveal the next.** When you're six bugs deep in a rabbit hole, consider whether the feature itself is the problem, not just the implementation.
- **"Delete it" is a valid fix.** The best code is code you didn't write. If a feature is causing more problems than it solves, the feature is the bug.
- **Security functions need elevated privileges.** Database helper functions that check permissions need `security definer` to read protected tables. Without it, RLS blocks the helper itself.

---

## Chapter 7: Test Everything End-to-End

**Goal:** Test every user flow, fix what's broken, wire up remaining features, and harden error handling.

### Step 21: Trace every user flow

Walk through every path a user can take in your app. For each flow, verify:
- Does the data load correctly?
- Are there any security gaps? (e.g., can a URL be spoofed to show unauthorized data?)
- What happens on error?
- What happens on slow connections?

We found that our public page accepted any URL slug without validating it against the actual data. A user could construct a fake URL and still see the content. Fix: validate URL parameters against the fetched data.

### Step 22: Handle auth race conditions

A critical class of bug in single-page apps: **auth state is async.** On page load, your auth service needs time to restore the session from storage. Any code that checks "is the user logged in?" during initialization must wait for auth to resolve first.

The pattern: create a promise that resolves when the auth state is ready. All protected views await that promise before checking login status. Add a timeout so the app doesn't hang if the auth service is unreachable.

### Step 23: Watch out for platform traps

Every platform has gotchas. Some real ones we hit:

- **`HTMLFormElement.name` shadows input fields.** If you have `<input name="name">` inside a form, `form.name` returns the form's own attribute, not the input. Use `getElementById` instead.
- **Build-time variables crash in dev mode.** Variables like `__BUILD_VERSION__` that your bundler replaces at build time don't exist when running unbundled. Always check if they're defined.
- **Direct URL navigation breaks SPA assumptions.** Users can bookmark or refresh any URL. Every view must handle being the entry point, not just the happy path from the previous screen.

### Step 24: Wire up all features end-to-end

Check that every component is actually imported and used by a view. A component that exists in the codebase but isn't connected to anything is the same as a component that doesn't exist.

### Step 25: Add loading states and tracking

Two quick wins that dramatically improve the experience:

1. **Loading states on buttons** — disable and change text during async operations ("Save" → "Saving…"). Prevents double-submits and gives visible feedback.
2. **User context in error reports** — when a user logs in, attach their identity to your error monitoring. When something breaks, you'll know who was affected.

### What you have at the end of Chapter 7

- Every user flow tested and verified
- Auth race conditions handled
- Platform-specific bugs fixed
- All features wired end-to-end
- Loading states and error tracking in place
- **A working app.**

### Key lessons

- **Auth state is async.** On page load, the session needs time to restore. Use a promise-based gate pattern.
- **Wire features end-to-end.** A component that isn't imported anywhere doesn't exist.
- **Direct navigation breaks assumptions.** Every view must handle being the entry point.
- **`form.name` is a trap.** HTML form elements have built-in properties that shadow identically-named inputs.

---

## The Meta-Lessons: What Vibe Coding Actually Taught Us

After building an entire app this way, here are the big takeaways:

### 1. The instruction file is everything

Your `CLAUDE.md` (or equivalent) is the most important file in the repo. It's your AI's memory, your project's constitution, and your onboarding doc all in one. Keep it updated. Put hard rules there. The AI reads it every session.

### 2. Infrastructure before features

Get your deployment pipeline, error monitoring, and database working before you write any application code. It feels slow at first, but it means every feature you build afterward is immediately testable on a real URL with real error reporting.

### 3. One file, one job

The gateway pattern (one file for all database access), the logger pattern (one file for all logging), the state pattern (one file for all state management) — these aren't about being fancy. They're about being able to find things. When something breaks at 11 PM, you want to know exactly which file to open.

### 4. Escape everything, surface everything

Two rules that prevent 90% of headaches:
- **Escape all user content** before putting it in HTML (prevents XSS)
- **Surface all errors in the UI** (prevents silent failures, especially on mobile/tablet)

### 5. Delete code fearlessly

The bootstrap saga taught us: if a feature is causing more problems than it solves, the feature is the bug. We deleted 200 lines and replaced them with a 30-second manual process. The app got simpler, more reliable, and easier to understand.

### 6. "How often does this happen?"

Before automating anything, ask this question. If the answer is "once" or "rarely," document the manual steps and move on. Code you don't write has zero bugs, needs zero maintenance, and confuses zero future readers.

### 7. CI green ≠ working

Green checkmarks mean the steps ran. They don't mean the right files were deployed, the right config was loaded, or the app actually works. Always verify the end result — load the URL, check the server, look at what actually arrived.

### 8. The AI is a partner, not a magic wand

You still need to:
- **Describe what you want clearly** — the AI can't read your mind
- **Review what it produces** — look for security issues, missing error handling, hardcoded values
- **Make judgment calls** — when to automate vs. keep manual, when to delete vs. fix
- **Test the result** — load the page, click the buttons, try the edge cases

The AI writes the code. You make the decisions. That's the partnership.

---

## Quick-Start Checklist

For anyone starting a new vibe-coded project, here's the order:

- [ ] Write a detailed description of what you want to build
- [ ] Create a `CLAUDE.md` with your hard rules and tech stack
- [ ] Get a domain pointed at hosting
- [ ] Set up automated deployment (GitHub Actions + your hosting)
- [ ] Deploy a "Hello World" page to verify the pipeline
- [ ] Set up error monitoring (Sentry or equivalent)
- [ ] Set up config management (server-side injection, no hardcoded keys)
- [ ] Create project scaffolding (build tools, linter, directory structure)
- [ ] Build core modules in dependency order
- [ ] Build views and components
- [ ] Set up your database (tables, security rules, test data)
- [ ] Add a build step to your deploy workflow
- [ ] Test every user flow end-to-end
- [ ] Fix the bugs you find (there will be bugs)
- [ ] Ship it

---

*Built with Claude Code. Every lesson here came from a real session, a real bug, or a real "aha" moment. Your project will have its own bugs and its own moments — but the process works.*
