import { motion } from "framer-motion";

import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import StaggerText from "./StaggerText.jsx";

/**
 * The eyebrow + big headline + subtext pattern, used consistently across
 * every homepage section: eyebrow is a small label, the headline is the
 * bold/playful hook, the subtext is one plain sentence that says what the
 * section actually is — the hook earns attention, the subtext earns trust.
 */
export default function SectionHeading({ eyebrow, title, subtitle, center = false, onLight = false }) {
  return (
    <motion.div
      {...revealOnce}
      variants={stagger(0.08)}
      className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
    >
      {eyebrow && (
        <motion.p
          variants={fadeUp}
          className={`font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm lg:text-base ${onLight ? "text-cvc-ink/70" : "text-cvc-muted"}`}
        >
          {eyebrow}
        </motion.p>
      )}
      <h2 className={`mt-3 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl ${onLight ? "text-cvc-ink" : "text-cvc-paper"}`}>
        {/* Keyed on the text itself: when a heading's title swaps after its
            first mount (e.g. a loading-state placeholder replaced by real
            data), this forces a full remount instead of React reusing the
            existing character nodes — reused nodes at settled positions
            would keep their already-resolved opacity/transform instead of
            replaying the reveal, while newly-added trailing characters
            would stay stuck at their initial hidden state forever, since
            the reveal-once trigger only fires a single time per mount. */}
        <StaggerText key={title} text={title} />
      </h2>
      {subtitle && (
        <motion.p variants={fadeUp} className={`mt-4 text-lg sm:text-xl lg:text-2xl ${onLight ? "text-cvc-ink/70" : "text-cvc-paper/80"}`}>
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
