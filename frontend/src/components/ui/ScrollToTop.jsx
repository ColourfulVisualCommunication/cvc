import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ArrowIcon from "./ArrowIcon.jsx";

// Floating quick-access button to jump back to the top of a long page.
// Only shown once the visitor has actually scrolled somewhere. Its colors
// switch between two fixed brand pairings depending on whether a section
// marked data-cvc-theme="dark" (the footer, the crimson testimonials
// section) currently sits behind it — a mix-blend-mode invert looked
// "clever" but produced off-brand colors no one chose.
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [onDark, setOnDark] = useState(false);

  useEffect(() => {
    const darkSections = () => [...document.querySelectorAll('[data-cvc-theme="dark"]')];

    const onScroll = () => {
      setVisible(window.scrollY > 400);
      const probeX = window.innerWidth - 40;
      const probeY = window.innerHeight - 40;
      const isDark = darkSections().some((el) => {
        const r = el.getBoundingClientRect();
        return probeX >= r.left && probeX <= r.right && probeY >= r.top && probeY <= r.bottom;
      });
      setOnDark(isDark);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center shadow-xl transition-transform hover:scale-105 ${
            onDark ? "bg-cvc-amber text-cvc-ink" : "bg-cvc-ink text-cvc-paper"
          }`}
        >
          <ArrowIcon size={20} className="-rotate-90" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
