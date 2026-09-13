import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Logo from "../ui/Logo.jsx";
import EyeFollowEyes from "../ui/EyeFollowEyes.jsx";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/work", label: "Work" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

const linkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-cvc-ink" : "text-cvc-muted hover:text-cvc-ink"
  }`;

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-cvc-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <NavLink to="/" className="flex items-center">
          <Logo />
        </NavLink>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <a
            href="https://wa.me/254769604255"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-cvc-ink px-4 py-2 text-sm font-semibold text-cvc-paper transition-transform hover:scale-105"
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
            className="overflow-hidden border-t border-black/5 md:hidden"
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
                      isActive ? "bg-black/5 text-cvc-ink" : "text-cvc-muted"
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
                className="mt-2 flex items-center justify-center gap-2 bg-cvc-ink px-3 py-2.5 text-center text-base font-semibold text-cvc-paper"
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
