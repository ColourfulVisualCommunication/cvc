import EyeFollowEyes from "./EyeFollowEyes.jsx";

const NUMBER = "254769604255";

// Kept unrounded on purpose — square corners are the site's design
// language, the ported Framer button's own rounded pill styling isn't.
export default function WhatsAppCTA({ text = "Start a project", message, className = "" }) {
  const href = message
    ? `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${NUMBER}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-3 bg-cvc-amber px-6 py-3 text-sm font-semibold text-cvc-ink transition-transform hover:scale-105 ${className}`}
    >
      <EyeFollowEyes />
      {text}
    </a>
  );
}
