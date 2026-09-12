const NUMBER = "254769604255";

export default function WhatsAppCTA({ text = "Start a project", message, className = "" }) {
  const href = message
    ? `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${NUMBER}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-cvc-ink px-6 py-3 text-sm font-semibold text-cvc-paper transition-transform hover:scale-105 ${className}`}
    >
      {text}
    </a>
  );
}
