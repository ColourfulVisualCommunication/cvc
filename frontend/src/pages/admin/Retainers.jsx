import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  adminListRetainers,
  adminGetRetainer,
  adminCreateRetainer,
  adminUpdateRetainer,
  adminDeleteRetainer,
  adminGenerateRetainerInvoiceNow,
  listServices,
  ApiError,
} from "../../api/client.js";

const inputClass =
  "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";
const labelClass = "text-sm font-medium text-cvc-paper";

const STATUSES = ["active", "paused", "cancelled"];

const STATUS_COLOR = {
  active: "bg-cvc-cyan/15 text-cvc-cyan",
  paused: "bg-cvc-amber/15 text-cvc-amber",
  cancelled: "bg-white/10 text-cvc-muted",
};

const INVOICE_STATUS_COLOR = {
  pending: "bg-cvc-amber/15 text-cvc-amber",
  paid: "bg-cvc-cyan/15 text-cvc-cyan",
};

const EMPTY_FORM = {
  client_name: "",
  client_email: "",
  client_phone: "",
  service_id: "",
  plan_name: "",
  monthly_amount_cents: "",
  billing_day: "28",
  notes: "",
};

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export default function RetainersAdmin() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(!!location.state?.prefillClient);
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(location.state?.prefillClient || {}) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function refresh() {
    adminListRetainers().then((r) => setItems(r.items));
  }

  useEffect(() => {
    refresh();
    listServices().then((r) => setServices(r.items)).catch(() => setServices([]));
    // Clear the navigation state so a later back/forward or refresh
    // doesn't keep re-prefilling the form from a stale request.
    if (location.state?.prefillClient) window.history.replaceState({}, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleExpand(retainer) {
    if (expandedId === retainer.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(retainer.id);
    setError(null);
    const full = await adminGetRetainer(retainer.id);
    setDetail(full);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminCreateRetainer({
        client_name: form.client_name,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        service_id: Number(form.service_id),
        plan_name: form.plan_name || null,
        monthly_amount_cents: Math.round(Number(form.monthly_amount_cents) * 100) || 0,
        billing_day: Number(form.billing_day),
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

  async function handleStatusChange(retainer, status) {
    setItems((prev) => prev.map((r) => (r.id === retainer.id ? { ...r, status } : r)));
    await adminUpdateRetainer(retainer.id, { status });
    if (expandedId === retainer.id) setDetail(await adminGetRetainer(retainer.id));
  }

  async function handleGenerateNow(retainer) {
    setBusy(true);
    setError(null);
    try {
      await adminGenerateRetainerInvoiceNow(retainer.id);
      setDetail(await adminGetRetainer(retainer.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(retainer) {
    if (!confirm("Delete this retainer? Only possible if it has no billing history.")) return;
    try {
      await adminDeleteRetainer(retainer.id);
      setExpandedId(null);
      refresh();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Retainers</h1>
          <p className="mt-1 text-sm text-cvc-muted">Standing monthly billing arrangements.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink"
        >
          {showForm ? "Cancel" : "New retainer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 max-w-xl space-y-3 border border-white/10 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Client name</label>
              <input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Client email</label>
              <input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Client phone</label>
            <input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className={inputClass} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Plan (service)</label>
              <select required value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} className={inputClass}>
                <option value="">Select…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Monthly amount (KES)</label>
              <input type="number" min="0" required value={form.monthly_amount_cents} onChange={(e) => setForm({ ...form, monthly_amount_cents: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Billing day (1–28)</label>
              <input type="number" min="1" max="28" required value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Plan name (optional — defaults to the service name)</label>
              <input value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          {error && <p className="text-sm text-cvc-crimson">{error}</p>}
          <button disabled={busy} type="submit" className="bg-cvc-amber px-4 py-2 text-sm font-semibold text-cvc-ink disabled:opacity-50">
            Create retainer
          </button>
        </form>
      )}

      <div className="mt-6 divide-y divide-white/10">
        {items.map((r) => (
          <div key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <button onClick={() => toggleExpand(r)} className="text-left">
                <p className="font-medium text-cvc-paper">{r.client_name} — {r.plan_name}</p>
                <p className="text-sm text-cvc-muted">
                  {kes(r.monthly_amount_cents)}/mo · next {formatDate(r.next_invoice_date)}
                </p>
              </button>
              <div className="flex items-center gap-3">
                <select
                  value={r.status}
                  onChange={(e) => handleStatusChange(r, e.target.value)}
                  className={`border-0 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[r.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-cvc-ink text-cvc-paper">{s}</option>
                  ))}
                </select>
                <button onClick={() => toggleExpand(r)} className="text-sm text-cvc-paper underline">
                  {expandedId === r.id ? "Close" : "View"}
                </button>
              </div>
            </div>

            {expandedId === r.id && detail && (
              <div className="space-y-5 border-t border-white/5 bg-white/[0.02] px-4 py-5">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <button disabled={busy} onClick={() => handleGenerateNow(r)} className="text-cvc-amber underline disabled:opacity-50">
                    Generate invoice now
                  </button>
                  <button onClick={() => handleDelete(r)} className="text-cvc-crimson underline">
                    Delete
                  </button>
                </div>

                <div>
                  <p className={labelClass}>Client link (share over WhatsApp)</p>
                  <p className="mt-1 break-all text-sm text-cvc-muted">
                    {window.location.origin}/retainer/{detail.client_link_token}
                  </p>
                </div>

                {error && <p className="text-sm text-cvc-crimson">{error}</p>}

                <div>
                  <p className={labelClass}>Invoices</p>
                  {detail.invoices.length === 0 && <p className="mt-1 text-sm text-cvc-muted">No invoices yet.</p>}
                  <div className="mt-2 space-y-2">
                    {detail.invoices.map((inv) => (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 px-3 py-2 text-sm">
                        <p className="text-cvc-paper">{inv.number} · {kes(inv.amount_cents)}</p>
                        <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${INVOICE_STATUS_COLOR[inv.status]}`}>
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {detail.notes && (
                  <div>
                    <p className={labelClass}>Notes</p>
                    <p className="mt-1 text-sm text-cvc-muted">{detail.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No retainers yet.</p>}
      </div>
    </div>
  );
}
