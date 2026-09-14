/**
 * The accent role in practice — Literata italic, used sparingly (a direct
 * quote or a standalone manifesto line, once or twice a page at most).
 * Animation-agnostic on purpose: call sites that already animate their
 * surrounding content (motion.blockquote in a testimonial card, a
 * stagger group on a page section) wrap this themselves rather than it
 * inventing its own motion.
 */
export default function Pullquote({ children, cite, className = "" }) {
  return (
    <blockquote className={className}>
      <p className="accent-quote text-lg leading-snug sm:text-xl">{children}</p>
      {cite && <footer className="mt-3 text-sm not-italic font-body text-cvc-muted">{cite}</footer>}
    </blockquote>
  );
}
