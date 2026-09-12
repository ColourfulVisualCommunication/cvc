import { Link } from "react-router-dom";

const CARDS = [
  { to: "/admin/portfolio", label: "Portfolio", body: "Add or edit case studies." },
  { to: "/admin/posts", label: "Blog", body: "Write and publish posts." },
  { to: "/admin/testimonials", label: "Testimonials", body: "Add client quotes." },
];

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-black/10 p-5 transition-colors hover:border-cvc-ink"
          >
            <h2 className="font-semibold">{c.label}</h2>
            <p className="mt-1 text-sm text-cvc-muted">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
