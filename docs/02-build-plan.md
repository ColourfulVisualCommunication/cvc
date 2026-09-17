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

## Phase 3 — Leads · ~4 days · **shipped**

**Ships:** a "Start a project" form producing a record with a budget and a deadline, with instant notification.

- [x] Enquiry form (on the Contact page, alongside the existing WhatsApp CTA) with server-side validation
- [x] `lead` model and statuses (new · contacted · quoted · closed · archived)
- [x] Admin lead inbox — list, expand for full details, change status, delete
- [x] Email notification to Njoroge and auto-acknowledgement to the enquirer (Brevo REST API, best-effort — never fails the lead creation itself)
- [x] Spam protection — a honeypot field, the simplest option that needed no new dependency

*Learning: server-side validation — never trust anything the browser sends.*

---

## Phase 4 — Quotes · ~1 week · **shipped**

**Ships:** a quote built in the admin, sent as one link, with open-tracking and an accept button.

- [x] Quote builder with line items (admin, `/admin/quotes`)
- [x] Deposit percentage per quote, total/deposit computed server-side from line items
- [x] Public quote page reached by signed token (`/quote/:token`, no login, `noindex`)
- [x] Expiry date and exactly one reminder (blocked once `reminder_sent_at` is set)
- [x] Accept/decline, with a terminal status message once decided
- [x] Viewed, accepted and declined timestamps; quotes past `expires_at` auto-transition to expired
- [x] Email notification on send and on reminder (Brevo REST API, best-effort as with leads)

*Learning: signed tokens — how a link can prove who it belongs to without anyone logging in. The same idea secures every client page after this.*

---

## Phase 5 — Money · ~1.5 weeks · **shipped**

**Ships:** a client accepts, pays the deposit from their phone, and gets a receipt with no action from Njoroge.

- [x] M-Pesa STK Push, triggered from the quote's own signed link — no separate login or token
- [x] Callback endpoint with server-side verification (`/payments/mpesa/callback`) — the browser never marks anything paid
- [x] **Idempotency** — an atomic conditional update (not read-then-write) plus a unique constraint on the M-Pesa receipt number; a retried callback is a documented, tested no-op
- [x] `invoice` model, auto-created the moment a quote is accepted, with a read-time invoice number (`INV-YYYY-NNNN`)
- [x] PDF invoices and receipts (reportlab), the receipt attached to the "payment received" email
- [x] Manual payment recording — bank transfer, cheque, cash (admin, `/admin/invoices`)
- [x] Failed and timed-out payment handling — Daraja's own result codes surfaced (cancelled, timeout, etc.), plus an admin-triggered status-reconciliation query for a stuck pending payment
- [x] Sandbox test suite — a mocked pytest suite (idempotency, amount-mismatch handling, PDF generation) plus a live pass against Daraja's real sandbox via ngrok: real STK pushes, real callbacks round-tripping in seconds, and a genuine retried-callback no-op confirmed against a live payment row

**Never** mark an order paid because the browser said so. Only the verified callback counts. A retried callback must not create a second payment or send a second receipt.

*Learning: webhooks and idempotency — the two ideas behind every payment integration. This phase is resellable for the rest of your career.*

---

## Phase 6 — Projects & delivery · ~1.5 weeks · **shipped**

**Ships:** a private project page per client — status, brief, files, approvals, outstanding balance. Final files unlock when the balance clears.

- [x] Project auto-created the moment the deposit is paid (not at quote acceptance) — reached by its own signed link, same pattern as a quote
- [x] Brief form (client-submitted text) and asset upload at full resolution, direct-to-Cloudinary (bytes never transit our server)
- [x] Four-state status: brief → in progress → awaiting approval → complete
- [x] Versioned deliverables — a new upload round only starts once the current one has been decided
- [x] Approve or request changes, with a required note on changes requested
- [x] Approval audit trail — every decision is its own row, never overwritten
- [x] **Payment-gated downloads** — "view" (for approval) always serves a resized/compressed preview; "download" serves the original and is hard-gated on the balance being fully paid. Verified live against the real Cloudinary API: view works pre-payment, download 403s pre-payment, download unlocks with the original the instant the balance clears
- [x] Signed, expiring file URLs — every upload report is verified against Cloudinary's own signature and scoped to the uploading project's folder before anything is persisted, closing a cross-tenant file-leak a naive version of this would have had
- [x] `invoice` extended to many-per-quote (deposit + balance) — approving the final round auto-creates a balance invoice for whatever's left of the quote total, reusing Phase 5's STK-push/manual-payment/idempotency machinery unchanged

*Learning: file storage done properly — why client brand files must never sit at a guessable URL.*

---

## Phase 7 — Retainers & follow-up · ~1 week · **shipped**

**Ships:** recurring revenue that invoices itself, plus the one automated email that earns money.

- [x] `Client`, `Retainer`, `RetainerRequest`, `EmailLog`, `JobRun` tables added — additive migration, existing `invoices`/`projects` rows untouched (`quote_id` loosened to nullable, `retainer_id` added, a `CHECK` constraint enforces exactly one parent per invoice kind)
- [x] Retainer plans billed on a locked `monthly_amount_cents` snapshot — never re-derived from `Service.price_cents`, same convention as a quote's deposit
- [x] Self-generating monthly invoices — `retainer_service.generate_due_invoices()` advances `next_invoice_date` via fresh `(year, month, day)` recomputation each cycle (no drift from repeated relative-month addition), skips a retainer whose previous invoice is still unpaid rather than stacking a second one
- [x] **Free-tier scheduled job runner, no paid or external dependency**: `JobRun`'s unique `(job_name, run_date)` constraint gates a daily sweep triggered opportunistically off real authenticated `/admin/*` traffic (`before_request` hook) — same INSERT-first/catch-conflict idempotency idiom as payment resolution. `flask run-daily-jobs` CLI for manual runs; swappable for a real Render Cron Job later with zero change to the underlying job functions
- [x] Post-project follow-up email — six weeks after `Project.completed_at`, only once fully paid, folding in a review-link ask and a soft retainer mention rather than adding a 7th canonical email
- [x] Retainer request log — public form (honeypot-protected, admin-only notification) + admin list/status, with a "convert to retainer" action that pre-fills the retainer creation form
- [x] Client history view — `Client` rows populated lazily (find-or-create by email), FK-backed retainer history plus quotes/projects matched by email, clearly labeled as a computed match rather than a real relationship
- [x] Email log — every send attempt (sent/failed/skipped) across every transactional email function logged from the single place they all funnel through
- [x] Regression-tested the exact crash class this phase introduced risk of: `initiate_payment`, `send_payment_received`, and both PDF functions previously assumed every invoice had a `quote` — all three now branch correctly for a retainer invoice, with tests

*Learning: background jobs — how a program does something on a schedule when nobody is using the site, and how to do it for free before there's a scheduler.*

---

## Phase 8 — Hardening & launch · ~1 week

**Ships:** the whole thing, tested with real money, backed up and monitored.

Live M-Pesa credentials · end-to-end payment test with a real small amount · security pass (authorization on every protected endpoint, file upload limits, rate limiting) · performance on Kenyan mobile data · automated database backups · error monitoring · soft launch with two friendly clients, then everyone.

No migration or redirect work — the domain is new and there is no existing site.

---

**Total:** roughly nine weeks part-time to a complete platform, with a live, sendable website in the first two.
