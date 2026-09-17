import { useEffect, useState } from "react";

import { adminListClients, adminGetClient, adminCreateClient, adminUpdateClient, ApiError } from "../../api/client.js";

const inputClass =
  "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";
const labelClass = "text-sm font-medium text-cvc-paper";

const EMPTY_FORM = { name: "", email: "", phone: "", notes: "" };

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export default function ClientsAdmin() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function refresh() {
    adminListClients().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function toggleExpand(client) {
    if (expandedId === client.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(client.id);
    const full = await adminGetClient(client.id);
    setDetail(full);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminCreateClient({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleOptOut(client) {
    const updated = await adminUpdateClient(client.id, { followup_opt_out: !client.followup_opt_out });
    setItems((prev) => prev.map((c) => (c.id === client.id ? updated : c)));
    if (expandedId === client.id) setDetail((prev) => ({ ...prev, followup_opt_out: updated.followup_opt_out }));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Clients</h1>
          <p className="mt-1 text-sm text-cvc-muted">People with an ongoing relationship — a retainer, or a completed project.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink">
          {showForm ? "Cancel" : "New client"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 max-w-xl space-y-3 border border-white/10 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          {error && <p className="text-sm text-cvc-crimson">{error}</p>}
          <button disabled={busy} type="submit" className="bg-cvc-amber px-4 py-2 text-sm font-semibold text-cvc-ink disabled:opacity-50">
            Create client
          </button>
        </form>
      )}

      <div className="mt-6 divide-y divide-white/10">
        {items.map((c) => (
          <div key={c.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <button onClick={() => toggleExpand(c)} className="text-left">
                <p className="font-medium text-cvc-paper">{c.name}</p>
                <p className="text-sm text-cvc-muted">{c.email || c.phone || "No contact info"}</p>
              </button>
              <div className="flex items-center gap-3 text-sm">
                {c.followup_opt_out && (
                  <span className="bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-cvc-muted">
                    Opted out of follow-ups
                  </span>
                )}
                <button onClick={() => toggleExpand(c)} className="text-cvc-paper underline">
                  {expandedId === c.id ? "Close" : "View"}
                </button>
              </div>
            </div>

            {expandedId === c.id && detail && (
              <div className="space-y-5 border-t border-white/5 bg-white/[0.02] px-4 py-5">
                <label className="flex items-center gap-2 text-sm text-cvc-paper">
                  <input type="checkbox" checked={!!detail.followup_opt_out} onChange={() => handleToggleOptOut(detail)} />
                  Opted out of the post-project follow-up email
                </label>

                {detail.notes && (
                  <div>
                    <p className={labelClass}>Notes</p>
                    <p className="mt-1 text-sm text-cvc-muted">{detail.notes}</p>
                  </div>
                )}

                <div>
                  <p className={labelClass}>Retainers</p>
                  {(!detail.retainers || detail.retainers.length === 0) && (
                    <p className="mt-1 text-sm text-cvc-muted">None.</p>
                  )}
                  <div className="mt-2 space-y-2">
                    {(detail.retainers || []).map((r) => (
                      <div key={r.id} className="border border-white/10 px-3 py-2 text-sm">
                        <p className="text-cvc-paper">{r.plan_name} — {kes(r.monthly_amount_cents)}/mo</p>
                        <p className="text-cvc-muted">{r.status} · next {formatDate(r.next_invoice_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Quotes / projects (matched by email — not a direct link)</p>
                  {(!detail.related_by_email || detail.related_by_email.length === 0) && (
                    <p className="mt-1 text-sm text-cvc-muted">None found.</p>
                  )}
                  <div className="mt-2 space-y-2">
                    {(detail.related_by_email || []).map((q) => (
                      <div key={q.quote_id} className="border border-white/10 px-3 py-2 text-sm">
                        <p className="text-cvc-paper">{q.title}</p>
                        <p className="text-cvc-muted">
                          Quote: {q.status}{q.project_status ? ` · Project: ${q.project_status}` : ""} · {formatDate(q.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No clients yet.</p>}
      </div>
    </div>
  );
}
