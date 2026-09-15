import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Receipt, Wallet, Briefcase, FileText, Quote, Building2, Plus } from "lucide-react";

import {
  adminListLeads,
  adminListQuotes,
  adminListInvoices,
  adminListPortfolio,
  adminListPosts,
  adminListTestimonials,
  adminListClientLogos,
} from "../../api/client.js";

// `highlight` picks out which items count toward the second, smaller
// number shown under the total — "published" for content, "new" (i.e.
// not yet followed up) for leads, since those aren't the same kind of
// state at all.
const SECTIONS = [
  {
    key: "leads",
    label: "Leads",
    icon: Inbox,
    fetch: adminListLeads,
    newHref: "/admin/leads",
    color: "bg-cvc-amber/15 text-cvc-amber",
    highlight: (item) => item.status === "new",
    highlightLabel: "new",
  },
  {
    key: "quotes",
    label: "Quotes",
    icon: Receipt,
    fetch: adminListQuotes,
    newHref: "/admin/quotes",
    color: "bg-cvc-cyan/15 text-cvc-cyan",
    highlight: (item) => item.status === "sent" || item.status === "viewed",
    highlightLabel: "awaiting reply",
  },
  {
    key: "invoices",
    label: "Invoices",
    icon: Wallet,
    fetch: adminListInvoices,
    newHref: "/admin/invoices",
    color: "bg-cvc-amber/15 text-cvc-amber",
    highlight: (item) => item.status !== "paid",
    highlightLabel: "unpaid",
  },
  {
    key: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
    fetch: adminListPortfolio,
    newHref: "/admin/portfolio",
    color: "bg-cvc-cyan/15 text-cvc-cyan",
    highlight: (item) => item.published,
    highlightLabel: "published",
  },
  {
    key: "posts",
    label: "Blog posts",
    icon: FileText,
    fetch: adminListPosts,
    newHref: "/admin/posts",
    color: "bg-cvc-crimson/15 text-cvc-crimson",
    highlight: (item) => item.published,
    highlightLabel: "published",
  },
  {
    key: "testimonials",
    label: "Testimonials",
    icon: Quote,
    fetch: adminListTestimonials,
    newHref: "/admin/testimonials",
    color: "bg-cvc-grey/20 text-cvc-grey",
    highlight: (item) => item.published,
    highlightLabel: "published",
  },
  {
    key: "clients",
    label: "Client logos",
    icon: Building2,
    fetch: adminListClientLogos,
    newHref: "/admin/clients",
    color: "bg-cvc-amber/15 text-cvc-amber",
    highlight: (item) => item.published,
    highlightLabel: "published",
  },
];

export default function Dashboard() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    Promise.all(SECTIONS.map((s) => s.fetch()))
      .then((results) => {
        setCounts(
          results.map((r, i) => ({
            total: r.items.length,
            highlighted: r.items.filter(SECTIONS[i].highlight).length,
          }))
        );
      })
      .catch(() => setCounts(SECTIONS.map(() => ({ total: 0, highlighted: 0 }))));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-paper">Dashboard</h1>
      <p className="mt-1 text-sm text-cvc-muted">What's live on the site right now.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const count = counts?.[i];
          return (
            <Link
              key={s.key}
              to={s.newHref}
              className="border border-white/10 p-5 transition-colors hover:border-cvc-paper"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center ${s.color}`}>
                  <Icon size={20} />
                </div>
                <Plus size={16} className="text-cvc-muted" />
              </div>
              <p className="mt-4 text-3xl font-bold text-cvc-paper">
                {count ? count.total : "—"}
              </p>
              <p className="text-sm text-cvc-muted">
                {s.label}
                {count && count.total > 0 && (
                  <> · {count.highlighted} {s.highlightLabel}</>
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
