import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ArrowIcon from "./ArrowIcon.jsx";

// Floating quick-access button to jump back to the top of a long page.
// Only shown once the visitor has actually scrolled somewhere. Most pages
// are one flat dark surface, so the default amber-on-ink pairing reads
// fine everywhere — except Home, which alternates into bright cyan/amber
// sections (see data-scroll-surface="light" on those <section>s). Without
// switching, an amber button disappears entirely over the amber CTA
// section, so on every scroll/resize we check which surface currently sits
// behind the button's fixed position and flip the pairing to match.
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [onLight, setOnLight] = useState(false);

  useEffect(() => {
    function update() {
      setVisible(window.scrollY > 400);

      const probeY = window.innerHeight - 40; // roughly where the button sits (bottom-6)
      let matched = false;
      for (const el of document.querySelectorAll("[data-scroll-surface]")) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom >= probeY) {
          matched = el.dataset.scrollSurface === "light";
          break;
        }
      }
      setOnLight(matched);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
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
          className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center shadow-xl transition-all duration-300 hover:scale-105 ${
            onLight ? "bg-cvc-ink text-cvc-amber" : "bg-cvc-amber text-cvc-ink"
          }`}
        >
          <ArrowIcon size={20} className="-rotate-90" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
