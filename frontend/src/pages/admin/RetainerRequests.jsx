import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { adminListRetainerRequests, adminUpdateRetainerRequest, adminDeleteRetainerRequest } from "../../api/client.js";

const STATUSES = ["new", "contacted", "converted", "archived"];

const STATUS_COLOR = {
  new: "bg-cvc-amber/15 text-cvc-amber",
  contacted: "bg-cvc-cyan/15 text-cvc-cyan",
  converted: "bg-cvc-crimson/15 text-cvc-crimson",
  archived: "bg-white/10 text-cvc-muted",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export default function RetainerRequestsAdmin() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const navigate = useNavigate();

  function refresh() {
    adminListRetainerRequests().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function handleStatusChange(request, status) {
    setItems((prev) => prev.map((r) => (r.id === request.id ? { ...r, status } : r)));
    await adminUpdateRetainerRequest(request.id, { status });
  }

  async function handleDelete(id) {
    if (!confirm("Delete this retainer request?")) return;
    await adminDeleteRetainerRequest(id);
    refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Retainer requests</h1>
      <p className="mt-1 text-sm text-cvc-muted">Enquiries about an ongoing retainer plan.</p>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((req) => (
          <div key={req.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setExpanded(expanded === req.id ? null : req.id)} className="text-left">
                <p className="font-medium text-cvc-paper">{req.name}</p>
                <p className="text-sm text-cvc-muted">
                  {req.email || req.phone} · {req.service_name || "No plan specified"} · {formatDate(req.created_at)}
                </p>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    navigate("/admin/retainers", {
                      state: {
                        prefillClient: {
                          client_name: req.name,
                          client_email: req.email || "",
                          client_phone: req.phone || "",
                          service_id: req.service_id ? String(req.service_id) : "",
                        },
                      },
                    })
                  }
                  className="text-sm text-cvc-amber underline"
                >
                  Convert to retainer
                </button>
                <select
                  value={req.status}
                  onChange={(e) => handleStatusChange(req, e.target.value)}
                  className={`border-0 px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[req.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-cvc-ink text-cvc-paper">
                      {s}
                    </option>
                  ))}
                </select>
                <button onClick={() => handleDelete(req.id)} className="text-sm text-cvc-crimson">
                  Delete
                </button>
              </div>
            </div>

            {expanded === req.id && (
              <div className="mt-3 space-y-2 border-l-2 border-white/10 pl-4 text-sm">
                <p className="text-cvc-paper">{req.message || "No message left."}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-cvc-muted">
                  {req.email && <span>Email: {req.email}</span>}
                  {req.phone && <span>Phone: {req.phone}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No retainer requests yet.</p>}
      </div>
    </div>
  );
}
