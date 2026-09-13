import { motion } from "framer-motion";

import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";

/**
 * The eyebrow + big headline + subtext pattern, used consistently across
 * every homepage section: eyebrow is a small label, the headline is the
 * bold/playful hook, the subtext is one plain sentence that says what the
 * section actually is — the hook earns attention, the subtext earns trust.
 */
export default function SectionHeading({ eyebrow, title, subtitle, center = false, light = false }) {
  return (
    <motion.div
      {...revealOnce}
      variants={stagger(0.08)}
      className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
    >
      {eyebrow && (
        <motion.p
          variants={fadeUp}
          className={`font-mono text-xs uppercase tracking-[0.18em] ${light ? "text-white/70" : "text-cvc-muted"}`}
        >
          {eyebrow}
        </motion.p>
      )}
      <motion.h2
        variants={fadeUp}
        className={`mt-3 text-4xl font-bold tracking-tight sm:text-6xl ${light ? "text-white" : "text-cvc-ink"}`}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className={`mt-4 text-lg ${light ? "text-white/80" : "text-cvc-muted"}`}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
