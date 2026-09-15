import { useEffect, useState } from "react";

import { adminListLeads, adminUpdateLead, adminDeleteLead } from "../../api/client.js";

const STATUSES = ["new", "contacted", "quoted", "closed", "archived"];

const STATUS_COLOR = {
  new: "bg-cvc-amber/15 text-cvc-amber",
  contacted: "bg-cvc-cyan/15 text-cvc-cyan",
  quoted: "bg-cvc-crimson/15 text-cvc-crimson",
  closed: "bg-cvc-grey/20 text-cvc-grey",
  archived: "bg-white/10 text-cvc-muted",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export default function LeadsAdmin() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);

  function refresh() {
    adminListLeads().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function handleStatusChange(lead, status) {
    setItems((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    await adminUpdateLead(lead.id, { status });
  }

  async function handleDelete(id) {
    if (!confirm("Delete this lead?")) return;
    await adminDeleteLead(id);
    refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Leads</h1>
      <p className="mt-1 text-sm text-cvc-muted">Enquiries submitted through the "Start a project" form.</p>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((lead) => (
          <div key={lead.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                className="text-left"
              >
                <p className="font-medium text-cvc-paper">{lead.name}</p>
                <p className="text-sm text-cvc-muted">
                  {lead.email || lead.phone} · {formatDate(lead.created_at)}
                </p>
              </button>
              <div className="flex items-center gap-3">
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(lead, e.target.value)}
                  className={`border-0 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[lead.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-cvc-ink text-cvc-paper">
                      {s}
                    </option>
                  ))}
                </select>
                <button onClick={() => handleDelete(lead.id)} className="text-sm text-cvc-crimson">
                  Delete
                </button>
              </div>
            </div>

            {expanded === lead.id && (
              <div className="mt-3 space-y-2 border-l-2 border-white/10 pl-4 text-sm">
                <p className="text-cvc-paper">{lead.project_description}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-cvc-muted">
                  {lead.email && <span>Email: {lead.email}</span>}
                  {lead.phone && <span>Phone: {lead.phone}</span>}
                  {lead.budget && <span>Budget: {lead.budget}</span>}
                  {lead.deadline && <span>Deadline: {lead.deadline}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No leads yet.</p>}
      </div>
    </div>
  );
}
