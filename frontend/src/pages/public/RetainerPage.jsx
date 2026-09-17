import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import {
  getRetainer,
  payRetainerInvoice,
  getRetainerPaymentStatus,
  downloadRetainerReceipt,
  ApiError,
} from "../../api/client.js";
import Logo from "../../components/ui/Logo.jsx";

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

// Reached only via a signed link (CLAUDE.md rule 4: no client passwords),
// same pattern as QuotePage/ProjectPage — no marketing nav, noindex, not
// part of the prerendered site. Unlike those, nothing ever emails this
// link automatically — Njoroge shares it over WhatsApp when a cycle is
// billed (see api/retainers.py's module docstring for why).
export default function RetainerPage() {
  const { token } = useParams();
  const [retainer, setRetainer] = useState(null);
  const [notFound, setNotFound] = useState(false);

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
    getRetainer(token)
      .then((data) => {
        setRetainer(data);
        const pending = data.invoices.find((i) => i.status === "pending");
        if (pending) {
          getRetainerPaymentStatus(token)
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
      getRetainerPaymentStatus(token)
        .then(({ payment: latest }) => {
          setPayment(latest);
          if (latest.status === "pending") {
            if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
              setTimedOut(true);
              return;
            }
            pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
          } else if (latest.status === "success") {
            load();
          }
        })
        .catch(() => {
          pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        });
    };
    tick();
  }

  async function handlePay(e) {
    e.preventDefault();
    setPayBusy(true);
    setPayError(null);
    try {
      const initiated = await payRetainerInvoice(token, phone);
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

  const pendingInvoice = retainer?.invoices.find((i) => i.status === "pending");
  // The receipt.pdf endpoint always serves the single most recent paid
  // invoice (retainer.invoices is ordered newest-first) — only that row
  // gets a Receipt button, so it's never offered against the wrong one.
  const latestPaidInvoiceId = retainer?.invoices.find((i) => i.status === "paid")?.id;

  return (
    <div className="min-h-screen bg-cvc-ink px-6 py-12">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Your Retainer — CVC</title>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <Logo dark />

        <div className="mt-10">
          {notFound && (
            <div className="border border-white/15 p-6">
              <p className="text-lg font-semibold text-cvc-paper">This retainer link isn&rsquo;t valid.</p>
              <p className="mt-2 text-cvc-muted">Message us on WhatsApp and we&rsquo;ll sort it out.</p>
            </div>
          )}

          {!notFound && !retainer && <p className="text-cvc-muted">Loading your retainer…</p>}

          {retainer && (
            <>
              <p className="text-sm text-cvc-muted">Monthly retainer</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-cvc-paper sm:text-4xl">
                {retainer.plan_name}
              </h1>
              <p className="mt-2 text-cvc-muted">
                {kes(retainer.monthly_amount_cents)}/month · {retainer.status}
              </p>

              {retainer.status === "cancelled" ? (
                <p className="mt-6 text-cvc-muted">
                  This retainer has been cancelled. Reach out on WhatsApp with any questions.
                </p>
              ) : pendingInvoice ? (
                <div className="mt-8 border border-white/15 p-6">
                  {payment?.status === "success" ? (
                    <p className="text-lg font-semibold text-cvc-paper">Paid ✓ — thank you.</p>
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
                      <p className="font-semibold text-cvc-paper">
                        {pendingInvoice.number} due — {kes(pendingInvoice.amount_cents)}
                      </p>
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
              ) : (
                <p className="mt-6 text-cvc-muted">Nothing due right now — you're all caught up.</p>
              )}

              {retainer.invoices.length > 0 && (
                <div className="mt-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cvc-muted">Invoice history</p>
                  <div className="mt-2 divide-y divide-white/10 border-y border-white/10">
                    {retainer.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <p className="text-cvc-paper">{inv.number}</p>
                          <p className="text-sm text-cvc-muted">{kes(inv.amount_cents)} · {inv.status}</p>
                        </div>
                        {inv.id === latestPaidInvoiceId && (
                          <button
                            onClick={() => downloadRetainerReceipt(token, `${inv.number}-receipt.pdf`)}
                            className="shrink-0 text-sm text-cvc-cyan underline"
                          >
                            Receipt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
