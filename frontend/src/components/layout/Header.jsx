import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Logo from "../ui/Logo.jsx";
import EyeFollowEyes from "../ui/EyeFollowEyes.jsx";

// sectionId matches an `id` on a homepage section (see Home.jsx) — while
// on "/", scrolling past that section highlights this link instead of the
// plain route match, so the nav doubles as a map of the landing page's
// own preview sections, not just a page switcher.
const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About", sectionId: "about" },
  { to: "/#services", label: "Services", sectionId: "services", end: true },
  { to: "/work", label: "Work", sectionId: "work" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact", sectionId: "contact" },
];

const SECTION_IDS = LINKS.map((l) => l.sectionId).filter(Boolean);

function useHomeActiveSection(onHome) {
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!onHome) {
      setActiveSection(null);
      return;
    }
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Among sections currently crossing the viewport's vertical
        // center band, highlight whichever one is closest to dead center
        // — keeps exactly one nav item active even while two sections are
        // both partially on screen during a scroll.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const closest = visible.reduce((a, b) =>
          Math.abs(a.boundingClientRect.top) < Math.abs(b.boundingClientRect.top) ? a : b
        );
        setActiveSection(closest.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onHome]);

  return activeSection;
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const onHome = location.pathname === "/";
  const activeSection = useHomeActiveSection(onHome);

  function isActiveLink(link, routeIsActive) {
    if (!onHome) return routeIsActive;
    if (link.to === "/") return activeSection === null;
    return link.sectionId ? activeSection === link.sectionId : false;
  }

  // A full-screen takeover behind an open menu shouldn't let the page
  // scroll underneath it, and should close on Escape like any modal.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Closes on every route change (including a same-page hash link like
  // "/#services", which doesn't unmount anything React Router would
  // otherwise treat as "navigating away from" the open menu).
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-cvc-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NavLink to="/" className="flex items-center">
          <Logo />
        </NavLink>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-cvc-ink"
          aria-expanded={open}
          aria-label="Open menu"
        >
          Menu
          <span className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 border border-cvc-ink/15">
            <span className="h-0.5 w-4 bg-cvc-ink" />
            <span className="h-0.5 w-4 bg-cvc-ink" />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex h-dvh flex-col bg-cvc-ink text-cvc-paper"
          >
            <div className="mx-auto flex h-16 w-full max-w-6xl shrink-0 items-center justify-between px-6">
              <NavLink to="/" className="flex items-center" onClick={() => setOpen(false)}>
                <Logo dark />
              </NavLink>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center border border-white/15 text-cvc-paper"
                aria-label="Close menu"
              >
                <span className="relative block h-4 w-4">
                  <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cvc-paper" />
                  <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-cvc-paper" />
                </span>
              </button>
            </div>

            <nav className="flex flex-1 flex-col items-center justify-center gap-1 px-6">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.35, ease: "easeOut" }}
                  className="flex items-center gap-4 sm:gap-6"
                >
                  <span className="font-mono text-sm text-cvc-paper/40 sm:text-base">{String(i + 1).padStart(2, "0")}</span>
                  <NavLink
                    to={l.to}
                    end={l.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `text-5xl font-bold tracking-tight transition-colors sm:text-7xl ${
                        isActiveLink(l, isActive) ? "text-cvc-amber" : "text-cvc-paper hover:text-cvc-amber"
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 * LINKS.length + 0.1 }}
              className="mx-auto w-full max-w-6xl shrink-0 px-6 pb-10"
            >
              <a
                href="https://wa.me/254769604255"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-cvc-amber px-5 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 sm:text-base"
              >
                <EyeFollowEyes size={13} pupilSize={5} gap={4} />
                Start a project
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
