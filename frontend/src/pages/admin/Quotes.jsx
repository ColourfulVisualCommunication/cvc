import { useEffect, useState } from "react";

import {
  adminListQuotes,
  adminGetQuote,
  adminCreateQuote,
  adminUpdateQuote,
  adminDeleteQuote,
  adminSendQuote,
  adminRemindQuote,
} from "../../api/client.js";

const EMPTY = {
  client_name: "",
  client_email: "",
  client_phone: "",
  title: "",
  notes: "",
  deposit_percentage: 50,
  expires_at: "",
  items: [{ description: "", quantity: 1, unit_price: "" }],
};

const inputClass =
  "mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper";
const labelClass = "text-sm font-medium text-cvc-paper";

const STATUS_COLOR = {
  draft: "bg-white/10 text-cvc-muted",
  sent: "bg-cvc-cyan/15 text-cvc-cyan",
  viewed: "bg-cvc-amber/15 text-cvc-amber",
  accepted: "bg-cvc-cyan/15 text-cvc-cyan",
  declined: "bg-cvc-crimson/15 text-cvc-crimson",
  expired: "bg-white/10 text-cvc-muted",
};

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Line items round-trip through cents (the API's unit) and whole KES (what
// an admin actually types) — converted at the edges, never stored as a
// float in between.
function itemsFromApi(items) {
  return items.map((i) => ({ ...i, unit_price: (i.unit_price_cents / 100).toString() }));
}

function itemsToApi(items) {
  return items
    .filter((i) => i.description.trim())
    .map((i) => ({
      description: i.description,
      quantity: Number(i.quantity) || 1,
      unit_price_cents: Math.round(Number(i.unit_price) * 100) || 0,
    }));
}

export default function QuotesAdmin() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    adminListQuotes().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function openEditor(quote) {
    if (!quote) {
      setEditing({ ...EMPTY });
      return;
    }
    const full = await adminGetQuote(quote.id);
    setEditing({ ...full, items: itemsFromApi(full.items) });
  }

  function updateItem(i, field, value) {
    setEditing((e) => {
      const items = [...e.items];
      items[i] = { ...items[i], [field]: value };
      return { ...e, items };
    });
  }

  function addItem() {
    setEditing((e) => ({ ...e, items: [...e.items, { description: "", quantity: 1, unit_price: "" }] }));
  }

  function removeItem(i) {
    setEditing((e) => ({ ...e, items: e.items.filter((_, idx) => idx !== i) }));
  }

  const previewTotal = editing
    ? itemsToApi(editing.items).reduce((sum, i) => sum + i.quantity * i.unit_price_cents, 0)
    : 0;
  const previewDeposit = editing ? Math.round((previewTotal * (Number(editing.deposit_percentage) || 0)) / 100) : 0;

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { ...editing, deposit_percentage: Number(editing.deposit_percentage) || 0, items: itemsToApi(editing.items) };
    try {
      if (editing.id) {
        await adminUpdateQuote(editing.id, payload);
      } else {
        await adminCreateQuote(payload);
      }
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this quote?")) return;
    await adminDeleteQuote(id);
    refresh();
  }

  async function handleSend(id) {
    if (!confirm("Send this quote to the client by email? This also finalizes it.")) return;
    setBusy(true);
    try {
      const result = await adminSendQuote(id);
      const link = `${window.location.origin}/quote/${result.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      alert(`Sent. Link copied to your clipboard:\n${link}`);
      refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemind(id) {
    if (!confirm("Send the one reminder for this quote?")) return;
    setBusy(true);
    try {
      await adminRemindQuote(id);
      refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="max-w-2xl space-y-4">
        <h1 className="text-xl font-bold text-cvc-paper">{editing.id ? "Edit quote" : "New quote"}</h1>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Client name</label>
            <input required value={editing.client_name} onChange={(e) => setEditing({ ...editing, client_name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Client email</label>
            <input type="email" value={editing.client_email || ""} onChange={(e) => setEditing({ ...editing, client_email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Client phone</label>
            <input value={editing.client_phone || ""} onChange={(e) => setEditing({ ...editing, client_phone: e.target.value })} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Title</label>
          <input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className={inputClass} placeholder="e.g. Brand Identity System" />
        </div>

        <div>
          <label className={labelClass}>Notes (optional, shown to the client)</label>
          <textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className={inputClass} rows={2} />
        </div>

        <div>
          <label className={labelClass}>Line items</label>
          <div className="mt-1 space-y-2">
            {editing.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  className={`${inputClass} mt-0 flex-1`}
                  placeholder="Description"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  className={`${inputClass} mt-0 w-20`}
                  placeholder="Qty"
                />
                <input
                  type="number"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                  className={`${inputClass} mt-0 w-32`}
                  placeholder="KES each"
                />
                <button type="button" onClick={() => removeItem(i)} className="px-2 text-cvc-crimson">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-sm text-cvc-paper underline">
            + Add line item
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Deposit percentage</label>
            <input
              type="number"
              min="0"
              max="100"
              value={editing.deposit_percentage}
              onChange={(e) => setEditing({ ...editing, deposit_percentage: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Expires</label>
            <input
              type="date"
              value={editing.expires_at || ""}
              onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="border border-white/15 p-4 text-sm">
          <p className="text-cvc-paper">
            Total: <span className="font-semibold">{kes(previewTotal)}</span>
          </p>
          <p className="text-cvc-muted">
            Deposit due: {kes(previewDeposit)} ({editing.deposit_percentage || 0}%)
          </p>
        </div>

        {error && <p className="text-sm text-cvc-crimson">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" className="bg-cvc-paper px-4 py-2 font-semibold text-cvc-ink">
            Save
          </button>
          <button type="button" onClick={() => setEditing(null)} className="text-sm text-cvc-muted">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Quotes</h1>
        <button onClick={() => openEditor(null)} className="bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink">
          New quote
        </button>
      </div>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((q) => (
          <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-cvc-paper">
                {q.title} — {q.client_name}
              </p>
              <p className="text-sm text-cvc-muted">
                {kes(q.total_cents)}
                {q.expires_at && ` · expires ${q.expires_at}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[q.status]}`}>
                {q.status}
              </span>
              <button onClick={() => openEditor(q)} className="text-cvc-paper underline">
                Edit
              </button>
              {q.status === "draft" && (
                <button disabled={busy} onClick={() => handleSend(q.id)} className="text-cvc-cyan disabled:opacity-50">
                  Send
                </button>
              )}
              {(q.status === "sent" || q.status === "viewed") && !q.reminder_sent_at && (
                <button disabled={busy} onClick={() => handleRemind(q.id)} className="text-cvc-amber disabled:opacity-50">
                  Remind
                </button>
              )}
              <button onClick={() => handleDelete(q.id)} className="text-cvc-crimson">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No quotes yet.</p>}
      </div>
    </div>
  );
}
