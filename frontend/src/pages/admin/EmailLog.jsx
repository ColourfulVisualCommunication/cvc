import { useEffect, useState } from "react";

import { adminListEmailLog } from "../../api/client.js";

const STATUS_COLOR = {
  sent: "bg-cvc-cyan/15 text-cvc-cyan",
  failed: "bg-cvc-crimson/15 text-cvc-crimson",
  skipped: "bg-white/10 text-cvc-muted",
};

const inputClass =
  "border border-white/15 bg-cvc-ink px-3 py-2 text-sm text-cvc-paper outline-none focus:border-cvc-paper";

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-KE", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function EmailLogAdmin() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [toEmail, setToEmail] = useState("");

  function refresh() {
    const params = {};
    if (category) params.category = category;
    if (toEmail) params.to_email = toEmail;
    adminListEmailLog(params).then((r) => setItems(r.items));
  }

  useEffect(refresh, [category, toEmail]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Email log</h1>
      <p className="mt-1 text-sm text-cvc-muted">Every send attempt across every transactional email — sent, failed, or skipped.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          placeholder="Filter by category…"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="Filter by recipient email…"
          value={toEmail}
          onChange={(e) => setToEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-cvc-paper">{e.subject}</p>
              <p className="text-sm text-cvc-muted">
                {e.to_name ? `${e.to_name} · ` : ""}{e.to_email} · {e.category || "uncategorized"} · {formatDateTime(e.created_at)}
              </p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[e.status]}`}>
              {e.status}
            </span>
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No emails logged yet.</p>}
      </div>
    </div>
  );
}
