/**
 * Shared Framer Motion variants.
 *
 * Animation is defined once here and reused, so the whole site moves as one
 * system instead of every component inventing its own timing.
 */

export const EASE = [0.22, 1, 0.36, 1]; // a confident ease-out

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

/** Put on a parent so children animate in sequence rather than together. */
export const stagger = (delayChildren = 0, staggerChildren = 0.08) => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren } },
});

/** Animate on scroll into view, once. */
export const revealOnce = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "-80px" },
};
