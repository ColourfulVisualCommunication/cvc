import { Helmet } from "react-helmet-async";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../admin/AuthContext.jsx";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/portfolio", label: "Portfolio" },
  { to: "/admin/posts", label: "Blog" },
  { to: "/admin/testimonials", label: "Testimonials" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-cvc-paper">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="border-b border-black/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <nav className="flex flex-wrap gap-6 text-sm font-medium">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => (isActive ? "text-cvc-ink" : "text-cvc-muted hover:text-cvc-ink")}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-cvc-muted">{user?.name}</span>
            <button onClick={handleLogout} className="font-medium text-cvc-crimson">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
