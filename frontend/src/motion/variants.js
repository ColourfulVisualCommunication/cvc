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

/** A heavier scroll-in reveal (scale + blur, not just a fade/offset) for
 * content that should land with more weight than fadeUp — a grid of
 * portfolio cards, say, where a plain fade read as flat next to the
 * rest of the page's bolder motion. */
export const revealBold = {
  hidden: { opacity: 0, y: 48, scale: 0.92, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
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
