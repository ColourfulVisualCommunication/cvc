# Build plan — eight phases

Each phase ends in something deployed and usable. Estimates assume part-time building around client work.

---

## Phase 1 — Foundation · ~3 days · **shipped**

**Ships:** a live URL serving database content through the API.

- [x] Repo structure, `.gitignore`, `CLAUDE.md`
- [x] Flask app factory, config from environment, JSON error handlers
- [x] SQLAlchemy + Migrate wired up
- [x] `Service` model + seed of the full ladder
- [x] `/api/v1/health` and `/api/v1/services`
- [x] React + Vite + Tailwind v4 + Framer Motion shell, API client, motion variants
- [x] Supabase Postgres connected in every environment — no SQLite fallback
- [x] `flask db init` / `migrate` / `upgrade` — first real migration (`services`, `admin_users`)
- [x] Admin login: `AdminUser` model, JWT in an httpOnly cookie, protected `/auth/me`, `flask create-admin` CLI
- [x] Deploy all three pieces to Render + Netlify, confirm the live health check — `https://cvc-api.onrender.com/api/v1/health`

*Learning: how React and Flask are two separate programs talking over HTTP; why secrets never go in Git; what a migration actually does.*

---

## Phase 2 — The public site · ~2 weeks · **shipped**

**Ships:** colourfulvisualcommunication.com, live, animated, real. The link you send when a referral asks what you do. **This is the phase that changes the business.**

- [x] Home · About · Our Story · Process · service pages generated from the ladder · portfolio index and case studies · blog · contact
- [x] A Framer Motion system rather than scattered animations
- [x] Admin CRUD for portfolio, posts, testimonials, client logos (services stayed public-read-only — the ladder rarely changes, so a fixed price list didn't justify the CRUD yet)
- [x] Image upload and optimisation (Cloudinary)
- [x] Build-time prerendering with meta, Open Graph, and JSON-LD baked into every public route
- [x] Deployed live on Cloudflare Workers (migrated off Netlify after it ran out of build credits), DNS cut over from Namecheap
- [x] Mobile-first fixes (greyscale client logos, touch targets, responsive typography)

*Learning: React components and routing, Tailwind as a design system rather than utility soup, Framer Motion orchestration, admin-writes/public-reads, build-time prerendering vs. full SSR, Cloudflare Workers static-assets deploys.*

---

## Phase 3 — Leads · ~4 days

**Ships:** a "Start a project" form producing a record with a budget and a deadline, with instant notification.

Enquiry form and server-side validation · `lead` model and statuses · admin lead inbox · email notification to Njoroge · auto-acknowledgement to the enquirer · spam protection.

*Learning: server-side validation — never trust anything the browser sends.*

---

## Phase 4 — Quotes · ~1 week

**Ships:** a quote built in the admin, sent as one link, with open-tracking and an accept button.

Quote builder with line items · deposit percentage · public quote page reached by signed token · expiry date and exactly one reminder · accept/decline · viewed and accepted timestamps.

*Learning: signed tokens — how a link can prove who it belongs to without anyone logging in. The same idea secures every client page after this.*

---

## Phase 5 — Money · ~1.5 weeks

**Ships:** a client accepts, pays the deposit from their phone, and gets a receipt with no action from Njoroge.

M-Pesa STK Push · callback endpoint with server-side verification · **idempotency** via a unique constraint on the provider reference · `invoice` model and numbering · PDF invoices and receipts · manual payment recording (for cheque and bank transfer — journey 4 needs this) · failed and timed-out payment handling · sandbox test suite.

**Never** mark an order paid because the browser said so. Only the verified callback counts. A retried callback must not create a second payment or send a second receipt.

*Learning: webhooks and idempotency — the two ideas behind every payment integration. This phase is resellable for the rest of your career.*

---

## Phase 6 — Projects & delivery · ~1.5 weeks

**Ships:** a private project page per client — status, brief, files, approvals, outstanding balance. Final files unlock when the balance clears.

Project created from an accepted quote · brief form and asset upload at full resolution · four-state status (brief / in progress / awaiting approval / complete) · versioned deliverables · approve or request changes · approval audit trail · payment-gated downloads · signed, expiring file URLs.

*Learning: file storage done properly — why client brand files must never sit at a guessable URL.*

---

## Phase 7 — Retainers & follow-up · ~1 week

**Ships:** recurring revenue that invoices itself, plus the one automated email that earns money.

Retainer plans (Digital Care, Brand Care, Growth Partner) · monthly invoice generation · retainer request log · scheduled job runner · post-project follow-up six weeks after completion · review request · client history view · email log and preferences.

*Learning: background jobs — how a program does something on a schedule when nobody is using the site.*

---

## Phase 8 — Hardening & launch · ~1 week

**Ships:** the whole thing, tested with real money, backed up and monitored.

Live M-Pesa credentials · end-to-end payment test with a real small amount · security pass (authorization on every protected endpoint, file upload limits, rate limiting) · performance on Kenyan mobile data · automated database backups · error monitoring · soft launch with two friendly clients, then everyone.

No migration or redirect work — the domain is new and there is no existing site.

---

**Total:** roughly nine weeks part-time to a complete platform, with a live, sendable website in the first two.
