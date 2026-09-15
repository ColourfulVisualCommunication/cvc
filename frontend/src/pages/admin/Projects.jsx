import { useEffect, useRef, useState } from "react";

import {
  adminListProjects,
  adminGetProject,
  adminAddDeliverable,
  adminPublishProject,
  adminDownloadDeliverable,
  adminGetUploadSignature,
  uploadFileDirect,
} from "../../api/client.js";

const STATUS_COLOR = {
  brief: "bg-white/10 text-cvc-muted",
  in_progress: "bg-cvc-cyan/15 text-cvc-cyan",
  awaiting_approval: "bg-cvc-amber/15 text-cvc-amber",
  complete: "bg-cvc-crimson/15 text-cvc-crimson",
};
const STATUS_LABEL = {
  brief: "Awaiting brief",
  in_progress: "In progress",
  awaiting_approval: "Awaiting approval",
  complete: "Complete",
};

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function ProjectsAdmin() {
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  function refresh() {
    adminListProjects().then((r) => setItems(r.items));
  }

  useEffect(refresh, []);

  async function toggleExpand(project) {
    if (expandedId === project.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(project.id);
    setError(null);
    const full = await adminGetProject(project.id);
    setDetail(full);
  }

  async function refreshDetail() {
    const full = await adminGetProject(expandedId);
    setDetail(full);
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const signature = await adminGetUploadSignature(expandedId);
        const uploaded = await uploadFileDirect(file, signature);
        await adminAddDeliverable(expandedId, {
          public_id: uploaded.public_id,
          version: uploaded.version,
          signature: uploaded.signature,
          resource_type: uploaded.resource_type,
          filename: file.name,
          format: uploaded.format,
        });
      }
      await refreshDetail();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    try {
      await adminPublishProject(expandedId);
      await refreshDetail();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(deliverableId, filename) {
    try {
      const { url } = await adminDownloadDeliverable(expandedId, deliverableId);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      setError(err.message);
    }
  }

  const deliverablesByVersion = {};
  (detail?.deliverables || []).forEach((d) => {
    (deliverablesByVersion[d.version] ||= []).push(d);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Projects</h1>
      <p className="mt-1 text-sm text-cvc-muted">Created automatically the moment a deposit is paid.</p>

      <div className="mt-6 divide-y divide-white/10">
        {items.map((p) => (
          <div key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-cvc-paper">
                  {p.quote_title} — {p.client_name}
                </p>
                <p className="text-sm text-cvc-muted">
                  {kes(p.paid_cents)} of {kes(p.total_cents)} paid
                  {p.balance_due_cents > 0 && ` · ${kes(p.balance_due_cents)} due`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
                <button onClick={() => toggleExpand(p)} className="text-cvc-paper underline">
                  {expandedId === p.id ? "Close" : "View"}
                </button>
              </div>
            </div>

            {expandedId === p.id && detail && (
              <div className="space-y-5 border-t border-white/5 bg-white/[0.02] px-4 py-5">
                {error && <p className="text-sm text-cvc-crimson">{error}</p>}

                <div>
                  <p className="text-sm font-medium text-cvc-paper">Brief</p>
                  {detail.brief_text ? (
                    <>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-cvc-muted">{detail.brief_text}</p>
                      {detail.brief_assets.length > 0 && (
                        <p className="mt-2 text-xs text-cvc-muted">
                          {detail.brief_assets.length} reference file{detail.brief_assets.length === 1 ? "" : "s"} attached
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-cvc-muted">Not submitted yet.</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-cvc-paper">Deliverables</p>
                    <label className="cursor-pointer text-sm text-cvc-cyan underline">
                      {busy ? "Uploading…" : "Upload files"}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        disabled={busy}
                        onChange={handleUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {Object.keys(deliverablesByVersion).length === 0 && (
                    <p className="mt-1 text-sm text-cvc-muted">No files uploaded yet.</p>
                  )}
                  {Object.entries(deliverablesByVersion)
                    .sort((a, b) => b[0] - a[0])
                    .map(([version, files]) => (
                      <div key={version} className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cvc-muted">Round {version}</p>
                        <div className="mt-1 space-y-1">
                          {files.map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-sm">
                              <span className="text-cvc-paper">{d.original_filename}</span>
                              <button onClick={() => handleDownload(d.id, d.original_filename)} className="text-cvc-cyan underline">
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  {(detail.status === "brief" || detail.status === "in_progress") && detail.deliverables.length > 0 && (
                    <button
                      disabled={busy}
                      onClick={handlePublish}
                      className="mt-3 bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink disabled:opacity-50"
                    >
                      Publish for approval
                    </button>
                  )}
                </div>

                {detail.approvals?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-cvc-paper">Approval history</p>
                    <div className="mt-1 space-y-1">
                      {detail.approvals.map((a) => (
                        <div key={a.id} className="text-sm">
                          <span className={a.status === "approved" ? "text-cvc-cyan" : "text-cvc-amber"}>
                            Round {a.version}: {a.status === "approved" ? "Approved" : "Changes requested"}
                          </span>
                          {a.client_note && <p className="text-cvc-muted">"{a.client_note}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="py-6 text-cvc-muted">No projects yet.</p>}
      </div>
    </div>
  );
}
