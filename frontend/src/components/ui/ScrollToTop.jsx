import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ArrowIcon from "./ArrowIcon.jsx";

// Floating quick-access button to jump back to the top of a long page.
// Only shown once the visitor has actually scrolled somewhere. The whole
// site is a single dark theme now, so one fixed brand-color pairing (amber
// on ink) reads consistently everywhere — no more per-section detection
// needed like when the page alternated between light and dark sections.
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center bg-cvc-amber text-cvc-ink shadow-xl transition-transform hover:scale-105"
        >
          <ArrowIcon size={20} className="-rotate-90" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
