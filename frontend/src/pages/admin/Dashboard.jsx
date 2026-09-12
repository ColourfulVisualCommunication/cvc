import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, FileText, Quote, Building2, Plus } from "lucide-react";

import {
  adminListPortfolio,
  adminListPosts,
  adminListTestimonials,
  adminListClientLogos,
} from "../../api/client.js";

const SECTIONS = [
  {
    key: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
    fetch: adminListPortfolio,
    newHref: "/admin/portfolio",
    color: "bg-cvc-amber/15 text-cvc-amber",
  },
  {
    key: "posts",
    label: "Blog posts",
    icon: FileText,
    fetch: adminListPosts,
    newHref: "/admin/posts",
    color: "bg-cvc-cyan/15 text-cvc-cyan",
  },
  {
    key: "testimonials",
    label: "Testimonials",
    icon: Quote,
    fetch: adminListTestimonials,
    newHref: "/admin/testimonials",
    color: "bg-cvc-crimson/15 text-cvc-crimson",
  },
  {
    key: "clients",
    label: "Client logos",
    icon: Building2,
    fetch: adminListClientLogos,
    newHref: "/admin/clients",
    color: "bg-cvc-grey/20 text-cvc-grey",
  },
];

export default function Dashboard() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    Promise.all(SECTIONS.map((s) => s.fetch()))
      .then((results) => {
        setCounts(
          results.map((r) => ({
            total: r.items.length,
            published: r.items.filter((i) => i.published).length,
          }))
        );
      })
      .catch(() => setCounts(SECTIONS.map(() => ({ total: 0, published: 0 }))));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-cvc-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-cvc-muted">What's live on the site right now.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          const count = counts?.[i];
          return (
            <Link
              key={s.key}
              to={s.newHref}
              className="rounded-xl border border-black/10 p-5 transition-colors hover:border-cvc-ink"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                  <Icon size={20} />
                </div>
                <Plus size={16} className="text-cvc-muted" />
              </div>
              <p className="mt-4 text-3xl font-bold text-cvc-ink">
                {count ? count.total : "—"}
              </p>
              <p className="text-sm text-cvc-muted">
                {s.label}
                {count && count.total > 0 && (
                  <> · {count.published} published</>
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
