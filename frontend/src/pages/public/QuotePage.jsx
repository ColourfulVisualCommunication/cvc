import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { getQuote, acceptQuote, declineQuote, ApiError } from "../../api/client.js";
import Logo from "../../components/ui/Logo.jsx";

function kes(cents) {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const STATUS_MESSAGE = {
  accepted: "You've accepted this quote. We'll be in touch shortly to get started.",
  declined: "You've declined this quote. If anything changes, just reach out on WhatsApp.",
  expired: "This quote has expired — message us on WhatsApp for an updated one.",
};

// Reached only via a signed link (CLAUDE.md rule 4: no client passwords,
// no sessions) — never indexed, never part of the prerendered marketing
// site, and deliberately outside the normal site Layout (no marketing
// nav) since this is a document to act on, not a page to browse from.
export default function QuotePage() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getQuote(token)
      .then(setQuote)
      .catch(() => setNotFound(true));
  }, [token]);

  async function respond(action) {
    setBusy(true);
    setError(null);
    try {
      const respondFn = action === "accept" ? acceptQuote : declineQuote;
      const updated = await respondFn(token);
      setQuote(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cvc-ink px-6 py-12">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Your Quote — CVC</title>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <Logo dark />

        <div className="mt-10">
          {notFound && (
            <div className="border border-white/15 p-6">
              <p className="text-lg font-semibold text-cvc-paper">This quote link isn&rsquo;t valid.</p>
              <p className="mt-2 text-cvc-muted">
                It may have been replaced with a newer one. Message us on WhatsApp and we&rsquo;ll resend it.
              </p>
            </div>
          )}

          {!notFound && !quote && <p className="text-cvc-muted">Loading your quote…</p>}

          {quote && (
            <>
              <p className="text-sm text-cvc-muted">Quote for {quote.client_name}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-cvc-paper sm:text-4xl">{quote.title}</h1>
              {quote.notes && <p className="mt-4 text-cvc-muted">{quote.notes}</p>}

              <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {quote.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-cvc-paper">{item.description}</p>
                      {item.quantity > 1 && <p className="text-sm text-cvc-muted">Qty {item.quantity}</p>}
                    </div>
                    <p className="shrink-0 font-mono text-cvc-paper">{kes(item.quantity * item.unit_price_cents)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-1 text-right">
                <p className="text-lg font-semibold text-cvc-paper">Total: {kes(quote.total_cents)}</p>
                <p className="text-cvc-muted">
                  Deposit to start ({quote.deposit_percentage}%): {kes(quote.deposit_cents)}
                </p>
                {quote.expires_at && <p className="text-sm text-cvc-muted">Valid until {quote.expires_at}</p>}
              </div>

              {STATUS_MESSAGE[quote.status] ? (
                <div className="mt-8 border border-white/15 p-6">
                  <p className="text-cvc-paper">{STATUS_MESSAGE[quote.status]}</p>
                </div>
              ) : (
                <div className="mt-8">
                  {error && <p className="mb-3 text-sm text-cvc-crimson">{error}</p>}
                  <div className="flex flex-wrap gap-4">
                    <button
                      disabled={busy}
                      onClick={() => respond("accept")}
                      className="bg-cvc-amber px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 disabled:opacity-50 sm:text-base"
                    >
                      Accept quote
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => respond("decline")}
                      className="border border-white/15 px-6 py-3 text-sm font-semibold text-cvc-paper transition-colors hover:border-cvc-paper disabled:opacity-50 sm:text-base"
                    >
                      Decline
                    </button>
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
