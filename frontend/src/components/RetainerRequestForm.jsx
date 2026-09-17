import { useState } from "react";

import { submitRetainerRequest, ApiError } from "../api/client.js";

const inputClass =
  "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";
const labelClass = "text-sm font-medium text-cvc-paper";

/**
 * The structured alternative to "message us on WhatsApp" for a retainer
 * plan — same role LeadForm plays for a one-off project. Ships to
 * POST /retainer-requests (see backend/app/api/retainer_requests.py); the
 * hidden `company` field is the same honeypot pattern as LeadForm.
 */
export default function RetainerRequestForm({ serviceId }) {
  const EMPTY = { name: "", email: "", phone: "", message: "", company: "" };
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

    if (!data.name.trim()) {
      setError("Please add your name.");
      return;
    }
    if (!data.email.trim() && !data.phone.trim()) {
      setError("Please add an email or phone number so we can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      await submitRetainerRequest({ ...data, service_id: serviceId });
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
        <p className="mt-2 text-cvc-muted">We&rsquo;ll be in touch shortly, usually on WhatsApp.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="retainer-company">Company</label>
        <input
          id="retainer-company"
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
          <input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Phone / WhatsApp</label>
          <input value={data.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Anything specific to mention? (optional)</label>
        <textarea rows={3} value={data.message} onChange={(e) => update("message", e.target.value)} className={inputClass} />
      </div>

      {error && <p className="text-sm text-cvc-crimson">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-cvc-paper px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 disabled:opacity-50 sm:text-base"
      >
        {submitting ? "Sending…" : "Request this plan"}
      </button>
    </form>
  );
}
