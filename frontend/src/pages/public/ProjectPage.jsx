import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import {
  getProject,
  submitProjectBrief,
  addProjectBriefAsset,
  getProjectUploadSignature,
  uploadFileDirect,
  viewDeliverable,
  downloadDeliverable,
  approveProject,
  requestProjectChanges,
  payProjectBalance,
  getProjectPaymentStatus,
  ApiError,
} from "../../api/client.js";
import Logo from "../../components/ui/Logo.jsx";

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const STATUS_LABEL = {
  brief: "Tell us about your project",
  in_progress: "In progress",
  awaiting_approval: "Ready for your review",
  complete: "Complete",
};

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

// Reached only via a signed link (CLAUDE.md rule 4: no client passwords,
// no sessions), same pattern as QuotePage — no marketing nav, noindex,
// not part of the prerendered site.
export default function ProjectPage() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [briefText, setBriefText] = useState("");
  const [briefFiles, setBriefFiles] = useState([]);
  const [changesNote, setChangesNote] = useState(null);

  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    load();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function load() {
    getProject(token)
      .then((data) => {
        setProject(data);
        if (data.status === "complete" && !data.is_fully_paid) {
          getProjectPaymentStatus(token)
            .then(({ payment: latest }) => {
              if (latest.status === "pending") startPolling();
              else setPayment(latest);
            })
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true));
  }

  function stopPolling() {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    setTimedOut(false);
    const startedAt = Date.now();
    const tick = () => {
      getProjectPaymentStatus(token)
        .then(({ payment: latest, project: updated }) => {
          setPayment(latest);
          if (latest.status === "pending") {
            if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
              setTimedOut(true);
              return;
            }
            pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
          } else if (latest.status === "success") {
            setProject(updated);
          }
        })
        .catch(() => {
          pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        });
    };
    tick();
  }

  async function handleSubmitBrief(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      for (const file of briefFiles) {
        const signature = await getProjectUploadSignature(token);
        const uploaded = await uploadFileDirect(file, signature);
        await addProjectBriefAsset(token, {
          public_id: uploaded.public_id,
          version: uploaded.version,
          signature: uploaded.signature,
          resource_type: uploaded.resource_type,
          filename: file.name,
        });
      }
      const updated = await submitProjectBrief(token, briefText);
      setProject(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    setBusy(true);
    setError(null);
    try {
      const updated = await approveProject(token);
      setProject(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestChanges(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await requestProjectChanges(token, changesNote);
      setProject(updated);
      setChangesNote(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleView(deliverableId) {
    const { url } = await viewDeliverable(token, deliverableId);
    window.open(url, "_blank", "noopener");
  }

  async function handleDownload(deliverableId) {
    const { url } = await downloadDeliverable(token, deliverableId);
    window.open(url, "_blank", "noopener");
  }

  async function handlePay(e) {
    e.preventDefault();
    setPayBusy(true);
    setPayError(null);
    try {
      const initiated = await payProjectBalance(token, phone);
      setPayment(initiated);
      startPolling();
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Something went wrong — try again.");
    } finally {
      setPayBusy(false);
    }
  }

  function retryPayment() {
    stopPolling();
    setPayment(null);
    setTimedOut(false);
    setPayError(null);
  }

  const deliverablesByVersion = {};
  (project?.deliverables || []).forEach((d) => {
    (deliverablesByVersion[d.version] ||= []).push(d);
  });
  const currentVersion = project ? Math.max(0, ...(project.deliverables || []).map((d) => d.version)) : 0;

  return (
    <div className="min-h-screen bg-cvc-ink px-6 py-12">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Your Project — CVC</title>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <Logo dark />

        <div className="mt-10">
          {notFound && (
            <div className="border border-white/15 p-6">
              <p className="text-lg font-semibold text-cvc-paper">This project link isn&rsquo;t valid.</p>
              <p className="mt-2 text-cvc-muted">Message us on WhatsApp and we&rsquo;ll sort it out.</p>
            </div>
          )}

          {!notFound && !project && <p className="text-cvc-muted">Loading your project…</p>}

          {project && (
            <>
              <p className="text-sm text-cvc-muted">{project.quote_title}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-cvc-paper sm:text-4xl">
                {STATUS_LABEL[project.status]}
              </h1>

              {error && <p className="mt-4 text-sm text-cvc-crimson">{error}</p>}

              {project.status === "brief" && (
                <form onSubmit={handleSubmitBrief} className="mt-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cvc-paper">
                      Tell us what you're after — goals, must-haves, anything you have in mind
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={briefText}
                      onChange={(e) => setBriefText(e.target.value)}
                      className="mt-1 w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-cvc-paper">
                      Existing files (logo, brand guide, photos) — optional
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setBriefFiles(Array.from(e.target.files || []))}
                      className="mt-1 text-sm text-cvc-muted"
                    />
                  </div>
                  <button
                    disabled={busy}
                    type="submit"
                    className="bg-cvc-amber px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 disabled:opacity-50 sm:text-base"
                  >
                    Submit brief
                  </button>
                </form>
              )}

              {project.status === "in_progress" && (
                <p className="mt-6 text-cvc-muted">
                  We're on it — you'll get an email the moment there's something to review.
                </p>
              )}

              {(project.status === "awaiting_approval" || project.status === "complete") && (
                <div className="mt-8">
                  {Object.entries(deliverablesByVersion)
                    .sort((a, b) => b[0] - a[0])
                    .map(([version, files]) => (
                      <div key={version} className="mt-4 first:mt-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-cvc-muted">Round {version}</p>
                        <div className="mt-2 divide-y divide-white/10 border-y border-white/10">
                          {files.map((d) => (
                            <div key={d.id} className="flex items-center justify-between gap-4 py-3">
                              <p className="text-cvc-paper">{d.original_filename}</p>
                              <div className="flex shrink-0 gap-3 text-sm">
                                <button onClick={() => handleView(d.id)} className="text-cvc-cyan underline">
                                  View
                                </button>
                                {project.is_fully_paid && (
                                  <button onClick={() => handleDownload(d.id)} className="text-cvc-amber underline">
                                    Download
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                  {project.status === "awaiting_approval" && Number(currentVersion) > 0 && (
                    <div className="mt-6 space-y-3">
                      <div className="flex flex-wrap gap-4">
                        <button
                          disabled={busy}
                          onClick={handleApprove}
                          className="bg-cvc-amber px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 disabled:opacity-50 sm:text-base"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setChangesNote(changesNote === null ? "" : null)}
                          className="border border-white/15 px-6 py-3 text-sm font-semibold text-cvc-paper transition-colors hover:border-cvc-paper disabled:opacity-50 sm:text-base"
                        >
                          Request changes
                        </button>
                      </div>
                      {changesNote !== null && (
                        <form onSubmit={handleRequestChanges} className="space-y-2">
                          <textarea
                            required
                            rows={3}
                            placeholder="What would you like changed?"
                            value={changesNote}
                            onChange={(e) => setChangesNote(e.target.value)}
                            className="w-full border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper"
                          />
                          <button
                            disabled={busy}
                            type="submit"
                            className="bg-cvc-paper px-4 py-2 text-sm font-semibold text-cvc-ink disabled:opacity-50"
                          >
                            Send
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {project.status === "complete" && (
                <div className="mt-8 border border-white/15 p-6">
                  {project.is_fully_paid ? (
                    <p className="text-lg font-semibold text-cvc-paper">Paid in full — your files are ready above.</p>
                  ) : payment?.status === "success" ? (
                    <p className="text-lg font-semibold text-cvc-paper">Paid ✓ — your files are unlocked above.</p>
                  ) : payment && (payment.status === "pending" || payment.status === "failed" || payment.status === "cancelled") ? (
                    <>
                      {payment.status === "pending" && !timedOut && (
                        <p className="text-cvc-paper">Check your phone — enter your M-Pesa PIN to complete the payment.</p>
                      )}
                      {(payment.status === "failed" || payment.status === "cancelled" || timedOut) && (
                        <>
                          <p className="text-cvc-paper">
                            {timedOut
                              ? "This is taking longer than expected. Check your phone, or try again."
                              : "That payment didn't go through — you can try again."}
                          </p>
                          <button
                            onClick={retryPayment}
                            className="mt-4 bg-cvc-amber px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 sm:text-base"
                          >
                            Try again
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <form onSubmit={handlePay}>
                      <p className="font-semibold text-cvc-paper">Balance due — {kes(project.balance_due_cents)}</p>
                      <label className="mt-4 block text-sm text-cvc-muted">M-Pesa phone number</label>
                      <input
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        className="mt-1 w-full max-w-xs border border-white/15 bg-cvc-ink px-3 py-2 text-cvc-paper outline-none focus:border-cvc-paper"
                      />
                      {payError && <p className="mt-3 text-sm text-cvc-crimson">{payError}</p>}
                      <button
                        disabled={payBusy}
                        type="submit"
                        className="mt-4 bg-cvc-amber px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 disabled:opacity-50 sm:text-base"
                      >
                        Pay via M-Pesa
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
