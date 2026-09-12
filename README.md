# CVC Platform

The operating system for **CVC — Colourful Visual Communication**: public site, client delivery and payments in one application.

React + Vite + Tailwind + Framer Motion · Flask + SQLAlchemy + PostgreSQL · M-Pesa Daraja

> **Start here:** [`CLAUDE.md`](CLAUDE.md) carries the decisions already made — scope, rules, conventions, and what was deliberately cut. Read it before changing anything.
> Context is in [`docs/01-context.md`](docs/01-context.md); the phase plan is in [`docs/02-build-plan.md`](docs/02-build-plan.md).

---

## Running it locally

You need Python 3.11+, Node 18+, and (optionally, at first) PostgreSQL.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # fill in SECRET_KEY; DATABASE_URL is optional at first
python seed.py                  # creates tables and loads the service ladder
python run.py                   # http://localhost:5000
```

Check it: <http://localhost:5000/api/v1/health>

Without `DATABASE_URL` it falls back to a local SQLite file, so you can start before Postgres is set up. Switch to Postgres before the first migration.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                     # http://localhost:5173
```

In development, `/api` is proxied to Flask by Vite, so there's one origin in the browser and CORS stays out of the way.

If both are running, the home page will report the API status and list the seeded services. That is phase 1 complete.

---

## Layout

```
backend/
  app/
    models/      database tables
    api/         routes — thin: validate, call a service, respond
    services/    business logic lives here
    email/       Jinja templates for the six emails
    utils/
  migrations/
  tests/
  config.py
  seed.py

frontend/src/
  components/    shared UI
  motion/        Framer Motion variants — animation defined once
  pages/
    public/      the site
    client/      quote and project pages, reached by signed link
    admin/       dashboard
  api/           every call to Flask goes through here
  hooks/
```

## Non-negotiables

- **The server owns money.** A payment is confirmed by Safaricom's callback to Flask, never by the browser. Each transaction is recorded exactly once.
- **Money is integer cents.** Never floats. Currency is KES.
- **Secrets live in `.env`**, which is gitignored.
- **No in-app client chat.** WhatsApp already does that job.
- **Clients have no passwords.** They reach quotes and projects through signed, expiring links.
