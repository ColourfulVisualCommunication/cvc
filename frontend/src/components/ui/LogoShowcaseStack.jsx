import { motion } from "framer-motion";

import { stagger } from "../../motion/variants.js";

// A small fanned stack of logo cards, each entering with a staggered
// spring drop — the visual idiom from a Framer Marketplace component
// ("Visual Showcase Stack"), rebuilt in plain Framer Motion rather than
// ported: the original is hard-wired to exactly 5 images and Framer's own
// canvas runtime (useVariantState, useComponentViewport — none of which
// exist outside their editor), whereas this needs to work with however
// many real client logos the API actually returns. Meant to sit inline
// within a heading (small footprint, like the original's 95x77 default).
//
// animate="visible" rather than whileInView: this sits inside an <h2>,
// nested two motion-component levels deep with absolutely-positioned
// children — whileInView's own intersection observer never fired there in
// testing (empirically reproduced: opacity stuck at 0 indefinitely).
// Animating on mount sidesteps that; since this lives below the fold,
// visitors never see the "before" state either way.
const drop = {
  hidden: { opacity: 0, y: -30 },
  visible: ({ angle, x, y }) => ({
    opacity: 1,
    x,
    y,
    rotate: angle,
    transition: { type: "spring", damping: 15, mass: 0.7, stiffness: 340 },
  }),
};

export default function LogoShowcaseStack({ logos, size = 44 }) {
  const cards = logos.slice(0, 5);
  if (cards.length === 0) return null;

  const rotationSpread = 10; // degrees between adjacent cards' tilt
  const xSpread = size * 0.62; // horizontal distance between adjacent card centers
  const mid = (cards.length - 1) / 2;

  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={stagger(0, 0.12)}
      className="relative inline-flex shrink-0 align-middle"
      style={{ width: size + xSpread * (cards.length - 1) + 12, height: size * 1.3 }}
    >
      {cards.map((logo, i) => {
        const offset = i - mid;
        return (
          <motion.span
            key={logo.id}
            custom={{ angle: offset * rotationSpread, x: offset * xSpread, y: Math.abs(offset) * (size * 0.08) }}
            variants={drop}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: size,
              height: size * 0.82,
              marginLeft: -size / 2,
              marginTop: (-size * 0.82) / 2,
              zIndex: i,
            }}
            className="flex items-center justify-center overflow-hidden rounded-md border border-black/10 bg-white p-1.5 shadow-md transition-transform duration-200 hover:z-10 hover:scale-110"
          >
            <img
              src={logo.logo_url}
              alt={logo.name}
              className="h-full w-full object-contain grayscale transition-all duration-200 [@media(hover:hover)]:hover:grayscale-0"
            />
          </motion.span>
        );
      })}
    </motion.span>
  );
}
