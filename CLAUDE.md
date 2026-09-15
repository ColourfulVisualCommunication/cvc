# CVC Platform — context for Claude Code

Read this before writing anything. It carries the decisions already made, so they don't get re-litigated or accidentally undone.

## Who this is for

**Njoroge**, founder of **CVC — Colourful Visual Communication**, a strategic creative and digital development agency in Ndeiya, Limuru, Kenya. He is both the client and the developer on this project.

- He has an ICT background and writes code, but is learning React/Flask properly as he goes.
- **Explain as you build.** When you introduce a concept (JWT, migrations, webhooks, signed tokens), say what it does and why it's there in a sentence or two. Don't lecture, don't skip it either.
- Contact: njoroge@colourfulvisualcommunication.com · +254 769 604255

## What is being built

A platform that is **CVC's own operating system**, not a brochure site. Public site + client delivery + money.

The critical context: **most CVC clients arrive through a relationship** — a physical meeting, a WhatsApp message, a phone call from a referral, a friend. That still drives most of the scoping below: no client passwords, no in-app chat, WhatsApp-first delivery.

But the site should also be findable by total strangers searching cold, not referral traffic alone — that's a real goal now, not an assumed non-problem. See **SEO (public pages only)** below for what that changes and what it doesn't.

The platform therefore exists to fix four things WhatsApp cannot do:

1. **Reference** — something to send when a referral asks "what do you do?"
2. **Record** — what was agreed, approved and delivered, instead of a chat that scrolls away
3. **Money** — deposits, invoices, receipts, and who owes what
4. **Unlock** — final files release on payment, instead of being sent before it

## The six rules

1. **Ship every phase.** No phase ends in half a feature. Each is deployed and usable before the next starts.
2. **The site is the portfolio.** CVC sells web development — prospects judge that ability by this site. Design quality is a requirement, not polish. It also has to be found by strangers, not just shown to referrals — see SEO section.
3. **The server owns money.** Payment is confirmed by Safaricom's callback to the Flask API, *never* by the browser reporting success. Every transaction is recorded exactly once.
4. **No client passwords.** Clients reach quotes and projects via signed, expiring links. No registration, no password reset, no sessions for clients. (Admin does log in.)
5. **WhatsApp stays.** Do not build in-app chat. The platform carries documents and decisions; conversation stays where clients already are.
6. **Logic in services.** Routes validate input and shape responses. Business logic lives in `app/services/`. This is what makes it testable.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind + Framer Motion |
| Backend | Flask + SQLAlchemy + Flask-Migrate |
| Database | PostgreSQL |
| Payments | M-Pesa Daraja (STK Push) — credentials already obtained |
| Image upload | Cloudinary |
| Transactional email | Brevo — the six emails (see below) |
| Deploy | Render — web service · Netlify — static site · Supabase — PostgreSQL |

**Still no Next.js — no full SSR framework.** The SPA (React + Vite, client-rendered) is unchanged; that decision stands. What changed since the original "SEO is a non-problem" call: public marketing pages now get a **build-time prerender pass** (e.g. `vite-plugin-ssg` or a Puppeteer snapshot step run after `vite build`) so they ship real, crawlable HTML with per-page metadata baked in. This is the escape hatch this doc always intended — a build step, not a rewrite. Client/admin pages (quotes, projects, invoices, admin login) are untouched: they stay pure CSR and must never be indexed. See **SEO (public pages only)** below.

## SEO (public pages only)

Applies to public marketing routes only — home, services, portfolio (index + case studies), blog (index + posts), about, contact. **Never** applies to client/admin routes (quotes, projects, invoices, login) — those stay unindexed regardless of SEO progress; that's rule 4/5 territory, not this section's.

- **Rendering:** build-time prerender of public routes (see Stack). SPA architecture doesn't change; this is a build step on top of it.
- **Metadata:** unique `<title>` + meta description per public route via `react-helmet-async`, baked into the prerendered HTML. Open Graph + Twitter Card tags on every public page — these also control how links look when shared in WhatsApp, so they're not purely a search concern.
- **Structured data (JSON-LD):** `LocalBusiness` (Ndeiya, Limuru address, phone, logo) for local search; `Service` on service pages; `BlogPosting` on posts.
- **Crawl control:** `sitemap.xml` generated from `portfolio_project` and `post` tables; `robots.txt` allows public routes, disallows `/quote/`, `/project/`, `/admin/`; those private routes also carry `noindex` headers/meta as a second layer.
- **Freshness:** prerendered snapshots are static — trigger a frontend rebuild/redeploy when portfolio or blog content changes in the DB (e.g. a deploy hook fired from the admin publish action), or public pages will serve stale HTML to crawlers.
- **Content:** the `post` table exists for this. Ranking depends on an actual posting cadence targeting Kenya/local search terms — technical setup alone won't rank the site.
- **Off-platform:** Google Business Profile and Search Console are part of achieving this goal and sit outside the codebase — don't treat the website as the whole SEO surface.

## Brand

Taken from the actual logo — note the older CRM planning doc wrongly specifies purple/orange/turquoise. Ignore that; these are correct.

| Token | Hex | Use |
|---|---|---|
| amber | `#FAB216` | primary accent, CTAs |
| cyan | `#45BBEB` | secondary, success/progress |
| crimson | `#ED3162` | attention, errors, highlights |
| grey | `#999999` | neutral supporting |

Tagline: **From Idea to Action. From Action to Reality.**
Domain: `colourfulvisualcommunication.com`

## Deliberately cut — do not build these

These were in an earlier, much larger plan. Each was cut for a reason:

| Not building | Why |
|---|---|
| Client accounts & passwords | Signed links reach the project page without one. Removes an entire epic. |
| Product store, cart, checkout | No client journey buys a physical product. Merchandise comes after services work. |
| Inventory & shipping | Follows the store. |
| In-app client messaging | Would be rebuilding WhatsApp badly, then persuading clients to move. They won't. |
| Service configurator | Three fixed packages at fixed prices is enough. |
| AI consultant | Needs client history that doesn't exist yet. |
| Staff roles & permissions | One admin until there's a second person. |
| Milestones & task tracking | Four project statuses is enough for a 2–10 week job. |
| 35 email templates | Cut to six. |

**The six emails, and only these:** quote sent · payment received · brief needed · ready for your approval · files ready · what's next (post-project follow-up).

## Build phases

Current position: **Phase 6 shipped** — Home, About, Our Story, Process, Services + detail pages, Portfolio, Blog, and Contact are all live at colourfulvisualcommunication.com (Cloudflare Workers), with admin CRUD for portfolio/posts/testimonials/client logos, build-time prerendering with meta/OG/JSON-LD, a full typography system, lead capture, quotes, and money (deposit paid via M-Pesa STK Push, Daraja's server-verified callback is what marks it paid, idempotent by design). Now delivery: paying the deposit auto-creates a private Project (brief → in progress → awaiting approval → complete), reached by its own signed link. Clients submit a brief with reference files, admin uploads versioned deliverables for review, the client approves or requests changes (every decision its own audit-trail row), and approving auto-creates a balance invoice for whatever's left — paying it unlocks the original files. Every file lives in Cloudinary as `type=authenticated`, uploaded directly from the browser (never through our server), with every upload report verified against Cloudinary's own signature before being trusted. Services remain public-read-only (edited via seed data, not an admin panel) — the ladder rarely changes and a fixed price list didn't justify the CRUD yet. **Phase 7 next.** See `docs/02-build-plan.md` for full detail.

| # | Phase | Ships |
|---|---|---|
| 1 | Foundation | A live URL serving DB content through the API |
| 2 | Public site | colourfulvisualcommunication.com — live, animated, real |
| 3 | Leads | "Start a project" form → admin inbox → notification |
| 4 | Quotes | Quote builder, public quote link, accept button |
| 5 | Money | M-Pesa STK Push, verified callbacks, invoices, receipts |
| 6 | Projects & delivery | Project page, brief, files, approvals, payment-gated downloads |
| 7 | Retainers & follow-up | Self-generating monthly invoices, post-project nudge |
| 8 | Hardening & launch | Real payment tests, backups, monitoring, soft launch |

Phase 2 matters most and ships early on purpose — it is what protects referrals.

## Data model — 16 tables, plus one added since

**People & pipeline:** `admin_user` · `lead` · `client`
**Selling:** `service` · `quote` · `quote_item`
**Money:** `invoice` · `payment` · `retainer`
**Work:** `project` · `deliverable` · `approval`
**Content:** `portfolio_project` · `post` · `testimonial` · `media`
**Plumbing:** `email_log`

**Added beyond the original 16:** `client_logo` — the public "clients we
work with" strip on the homepage. Deliberately not folded into the future
`client` table (People & Pipeline) — that one is for people with
projects/invoices, a later-phase concept; this is just a logo + name for
display, nothing more.

`payment` carries a **unique constraint on the provider transaction reference** — that constraint is the idempotency guarantee. A retried M-Pesa callback must never produce a second payment row or a second receipt email.

## Conventions

- API is versioned at `/api/v1`. Every frontend call goes through `src/api/` — no `fetch` scattered through components.
- Blueprints per resource in `app/api/`. Keep them thin.
- Money is stored in **cents as integers**, never floats. Currency is KES.
- Timestamps are UTC in the database; display in Africa/Nairobi (UTC+3).
- Migrations for every schema change — never edit the database by hand.
- Secrets live in `.env`, which is gitignored. `.env.example` documents the keys.
- An email failing must never fail the transaction that triggered it. Payment SUCCESS + email FAILED stays that way.
- Tailwind for styling. Shared Framer Motion variants live in `src/motion/` so animation is consistent rather than improvised per component.

## Getting it running

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                              # then fill in DATABASE_URL and SECRET_KEY
flask db upgrade
python run.py                                     # http://localhost:5000

# frontend
cd frontend
npm install
cp .env.example .env
npm run dev                                       # http://localhost:5173
```

## Still needed from Njoroge

Nothing outstanding for Phase 3. Portfolio material (5 real case studies) and the confirmed service ladder are both live in the database via `backend/seed.py`.

Resolved: domain registered (`colourfulvisualcommunication.com`), Supabase Postgres, Cloudinary, Brevo, and M-Pesa Daraja credentials are all in hand — see `backend/.env.example` for what each needs. All go in `.env`, never in Git.
