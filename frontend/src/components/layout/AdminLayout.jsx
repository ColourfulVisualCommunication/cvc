import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Quote,
  Building2,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "../../admin/AuthContext.jsx";
import Logo from "../ui/Logo.jsx";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/admin/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/admin/posts", label: "Blog", icon: FileText },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/clients", label: "Client logos", icon: Building2 },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center px-5 py-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-cvc-ink text-cvc-paper"
                    : "text-cvc-muted hover:bg-black/5 hover:text-cvc-ink"
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {l.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-black/5 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cvc-amber/20 text-sm font-semibold text-cvc-ink">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-cvc-ink">{user?.name}</p>
            <p className="truncate text-xs text-cvc-muted">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cvc-crimson hover:bg-cvc-crimson/10"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cvc-paper">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-black/5 bg-cvc-paper lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-cvc-paper shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="flex items-center justify-between border-b border-black/5 px-5 py-4 lg:hidden">
          <Logo />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-cvc-ink hover:bg-black/5"
          >
            <Menu size={20} />
          </button>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
