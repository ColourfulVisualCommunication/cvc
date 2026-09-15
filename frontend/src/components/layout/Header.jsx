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

const linkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors lg:text-base ${
    isActive ? "text-cvc-ink" : "text-cvc-ink/70 hover:text-cvc-ink"
  }`;

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

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-cvc-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <NavLink to="/" className="flex items-center">
          <Logo />
        </NavLink>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => linkClass({ isActive: isActiveLink(l, isActive) })}
            >
              {l.label}
            </NavLink>
          ))}
          <a
            href="https://wa.me/254769604255"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-cvc-amber px-4 py-2 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 lg:px-5 lg:py-2.5 lg:text-base"
          >
            <EyeFollowEyes size={13} pupilSize={5} gap={4} />
            Start a project
          </a>
        </nav>

        <button
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={`h-0.5 w-6 bg-cvc-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-6 bg-cvc-ink transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-6 bg-cvc-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-black/10 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 text-base font-medium ${
                      isActiveLink(l, isActive) ? "bg-black/5 text-cvc-ink" : "text-cvc-ink/70"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <a
                href="https://wa.me/254769604255"
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-2 bg-cvc-amber px-3 py-2.5 text-center text-base font-semibold text-cvc-ink"
              >
                <EyeFollowEyes size={15} pupilSize={5} gap={4} />
                Start a project
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
