import { useState } from "react";

import { submitLead, ApiError } from "../api/client.js";

const EMPTY = { name: "", email: "", phone: "", project_description: "", budget: "", deadline: "", company: "" };

const inputClass =
  "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";
const labelClass = "text-sm font-medium text-cvc-paper";

/**
 * The structured alternative to "message us on WhatsApp" — for anyone who'd
 * rather write it all out once than start a back-and-forth. Ships to
 * POST /leads (see backend/app/api/leads.py); a hidden `company` field is
 * the spam honeypot, invisible to a real visitor but a giveaway for a bot
 * that fills in every field it can find.
 */
export default function LeadForm() {
  const [data, setData] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!data.name.trim() || !data.project_description.trim()) {
      setError("Please fill in your name and project description.");
      return;
    }
    if (!data.email.trim() && !data.phone.trim()) {
      setError("Please add an email or phone number so we can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      await submitLead(data);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="border border-white/15 p-6">
        <p className="text-lg font-semibold text-cvc-paper">Thanks — we&rsquo;ve got it.</p>
        <p className="mt-2 text-cvc-muted">
          We&rsquo;ll be in touch shortly, usually on WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — visually hidden from real visitors, not display:none
          (which some bots skip), so it still occupies the DOM normally. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={data.company}
          onChange={(e) => update("company", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Name</label>
        <input required value={data.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone / WhatsApp</label>
          <input value={data.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tell us about the project</label>
        <textarea
          required
          rows={4}
          value={data.project_description}
          onChange={(e) => update("project_description", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Budget (optional)</label>
          <input
            value={data.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="e.g. KES 50,000"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Deadline (optional)</label>
          <input
            value={data.deadline}
            onChange={(e) => update("deadline", e.target.value)}
            placeholder="e.g. In 3 weeks"
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-cvc-crimson">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-cvc-paper px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 disabled:opacity-50 sm:text-base"
      >
        {submitting ? "Sending…" : "Send project details"}
      </button>
    </form>
  );
}
