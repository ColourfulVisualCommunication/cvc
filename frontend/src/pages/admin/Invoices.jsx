import { useEffect, useState } from "react";

import {
  adminListInvoices,
  adminGetInvoice,
  adminRecordPayment,
  adminCheckPaymentStatus,
  adminDownloadInvoicePdf,
} from "../../api/client.js";

const inputClass =
  "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";
const labelClass = "text-sm font-medium text-cvc-paper";

const STATUS_COLOR = {
  pending: "bg-cvc-amber/15 text-cvc-amber",
  paid: "bg-cvc-cyan/15 text-cvc-cyan",
};

const PAYMENT_STATUS_COLOR = {
  pending: "bg-cvc-amber/15 text-cvc-amber",
  success: "bg-cvc-cyan/15 text-cvc-cyan",
  failed: "bg-cvc-crimson/15 text-cvc-crimson",
  cancelled: "bg-white/10 text-cvc-muted",
};

const MANUAL_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const EMPTY_PAYMENT_FORM = { method: "bank_transfer", amount: "", reference: "", note: "" };

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function InvoicesAdmin() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function refresh() {
    adminListInvoices().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function toggleExpand(invoice) {
    if (expandedId === invoice.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(invoice.id);
    setPaymentForm(EMPTY_PAYMENT_FORM);
    setError(null);
    const full = await adminGetInvoice(invoice.id);
    setDetail(full);
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminRecordPayment(expandedId, {
        method: paymentForm.method,
        amount_cents: Math.round(Number(paymentForm.amount) * 100) || 0,
        reference: paymentForm.reference || null,
        note: paymentForm.note || null,
      });
      const full = await adminGetInvoice(expandedId);
      setDetail(full);
      setPaymentForm(EMPTY_PAYMENT_FORM);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckStatus() {
    setBusy(true);
    setError(null);
    try {
      const full = await adminCheckPaymentStatus(expandedId);
      setDetail(full);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const hasPendingMpesa = detail?.payments?.some((p) => p.method === "mpesa" && p.status === "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Invoices</h1>
      <p className="mt-1 text-sm text-cvc-muted">Deposit invoices, created automatically when a quote is accepted.</p>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((inv) => (
          <div key={inv.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-cvc-paper">
                  {inv.number} — {inv.client_name}
                </p>
                <p className="text-sm text-cvc-muted">
                  {inv.quote_title} · {kes(inv.amount_cents)}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[inv.status]}`}>
                  {inv.status}
                </span>
                <button onClick={() => toggleExpand(inv)} className="text-cvc-paper underline">
                  {expandedId === inv.id ? "Close" : "View"}
                </button>
              </div>
            </div>

            {expandedId === inv.id && detail && (
              <div className="space-y-5 border-t border-white/5 bg-white/[0.02] px-4 py-5">
                <div className="flex flex-wrap gap-4 text-sm">
                  <button
                    onClick={() => adminDownloadInvoicePdf(inv.id, `${inv.number}.pdf`)}
                    className="text-cvc-paper underline"
                  >
                    Download invoice PDF
                  </button>
                  {hasPendingMpesa && (
                    <button disabled={busy} onClick={handleCheckStatus} className="text-cvc-amber underline disabled:opacity-50">
                      Check M-Pesa status
                    </button>
                  )}
                </div>

                <div>
                  <p className={labelClass}>Payments</p>
                  {detail.payments.length === 0 && <p className="mt-1 text-sm text-cvc-muted">No payments yet.</p>}
                  <div className="mt-2 space-y-2">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 px-3 py-2 text-sm">
                        <div>
                          <p className="text-cvc-paper">
                            {p.method === "mpesa" ? "M-Pesa" : "Manual"} · {kes(p.amount_cents)}
                          </p>
                          <p className="text-cvc-muted">
                            {p.provider_reference || p.manual_reference || "—"}
                            {p.result_desc ? ` · ${p.result_desc}` : ""}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${PAYMENT_STATUS_COLOR[p.status]}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {detail.status !== "paid" && (
                  <form onSubmit={handleRecordPayment} className="max-w-md space-y-3 border-t border-white/10 pt-4">
                    <p className={labelClass}>Record a manual payment</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Method</label>
                        <select
                          value={paymentForm.method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                          className={inputClass}
                        >
                          {MANUAL_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Amount (KES)</label>
                        <input
                          type="number" min="0" required
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Reference (cheque/transaction no.)</label>
                      <input
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Note (optional)</label>
                      <input
                        value={paymentForm.note}
                        onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    {error && <p className="text-sm text-cvc-crimson">{error}</p>}
                    <button
                      type="submit"
                      disabled={busy}
                      className="bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink disabled:opacity-50"
                    >
                      Record payment
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No invoices yet.</p>}
      </div>
    </div>
  );
}
