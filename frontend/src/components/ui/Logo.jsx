/**
 * The one place logo sizing is decided. Every usage imports this instead of
 * reaching for its own <img> + height class — that's how the size kept
 * drifting (too small) across the public header, footer, and admin sidebar
 * before this existed.
 */
export default function Logo({ className = "", dark = false }) {
  return (
    <img
      src={dark ? "/logo-white.svg" : "/logo.svg"}
      alt="Colourful Visual Communication"
      className={`h-20 w-auto ${className}`}
    />
  );
}
