import { Fragment } from "react";
import { motion } from "framer-motion";

import { revealOnce } from "../../motion/variants.js";

// Ported from a Framer community component ("Staggered Text Hover") — the
// original triggers its per-letter flip on hover, which doesn't apply to a
// heading, so this replays the same flip-up reveal on scroll-into-view
// instead, once, via the site's existing revealOnce/stagger convention.
// Characters are split per word, not across the whole string, and the
// space between words is a plain sibling text node (not nowrap-glued to
// either word) — otherwise the browser has no word-boundary information
// left to wrap on and can break lines mid-word.
const container = (staggerChildren) => ({
  hidden: {},
  visible: { transition: { staggerChildren } },
});

const charVariant = {
  hidden: { y: "110%", opacity: 0 },
  visible: { y: "0%", opacity: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export default function StaggerText({ text, className = "", staggerDelay = 0.025 }) {
  const words = text.split(" ");

  return (
    <motion.span {...revealOnce} variants={container(staggerDelay)} className={`inline-block ${className}`}>
      {words.map((word, w) => (
        <Fragment key={w}>
          <span className="inline-block whitespace-nowrap">
            {[...word].map((char, i) => (
              <span key={i} className="inline-block overflow-hidden align-top" style={{ lineHeight: 1.15 }}>
                <motion.span variants={charVariant} className="inline-block">
                  {char}
                </motion.span>
              </span>
            ))}
          </span>
          {w < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </motion.span>
  );
}
