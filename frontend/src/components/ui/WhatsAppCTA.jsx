import EyeFollowEyes from "./EyeFollowEyes.jsx";

const NUMBER = "254769604255";

// Kept unrounded on purpose — square corners are the site's design
// language, the ported Framer button's own rounded pill styling isn't.
// `dark` swaps to an ink button — for placements on an amber/bright
// section, where the default amber button would vanish into it.
export default function WhatsAppCTA({ text = "Start a project", message, className = "", dark = false }) {
  const href = message
    ? `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${NUMBER}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-transform hover:scale-105 sm:text-base lg:text-lg ${
        dark ? "bg-cvc-ink text-cvc-paper" : "bg-cvc-amber text-cvc-ink"
      } ${className}`}
    >
      <EyeFollowEyes />
      {text}
    </a>
  );
}
