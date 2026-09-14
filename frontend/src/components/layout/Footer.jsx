import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaThreads, FaTiktok, FaYoutube, FaXTwitter } from "react-icons/fa6";

import Logo from "../ui/Logo.jsx";

// Threads isn't set up yet — left as "#" so the row's layout is already
// final once it exists.
const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/ColourfulVisualCommunication", Icon: FaFacebookF },
  { label: "Instagram", href: "https://www.instagram.com/_njoroge_stephen/", Icon: FaInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/stephen-njoroge-cvc", Icon: FaLinkedinIn },
  { label: "Threads", href: "#", Icon: FaThreads },
  { label: "TikTok", href: "https://www.tiktok.com/@colorfulvisual", Icon: FaTiktok },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCtwOHu7z1P9OdX4N6Xnnz4g", Icon: FaYoutube },
  { label: "X", href: "https://x.com/stevekamnjoros", Icon: FaXTwitter },
];

const SITE_LINKS = [
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/work", label: "Work" },
  { to: "/blog", label: "Blog" },
];

function Column({ heading, children }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {heading && <span className="font-semibold text-white">{heading}</span>}
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-cvc-ink" data-cvc-theme="dark">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="relative grid grid-cols-2 gap-10 text-sm sm:grid-cols-4">
          {/* Cross divider splitting the 2x2 mobile layout into its four
              quadrants — collapses away once the columns go into a single
              row at sm+, where a cross no longer makes sense. */}
          <div className="pointer-events-none absolute inset-0 sm:hidden" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cvc-crimson" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cvc-crimson" />
          </div>

          <Column>
            <Logo dark />
            <p className="max-w-[16rem] text-white/60">From Idea to Action. From Action to Reality.</p>
          </Column>

          <Column heading="Follow us">
            <div className="flex flex-wrap justify-center gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </Column>

          <Column heading="Navigate">
            <div className="flex flex-col items-center gap-2">
              {SITE_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="text-white/60 hover:text-white">
                  {l.label}
                </Link>
              ))}
            </div>
          </Column>

          <Column heading="Talk to us">
            <div className="flex flex-col items-center gap-2">
              <a href="https://wa.me/254769604255" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white">
                WhatsApp
              </a>
              <a href="mailto:njoroge@colourfulvisualcommunication.com" className="text-white/60 hover:text-white">
                Email
              </a>
              <span className="text-white/60">Online</span>
            </div>
          </Column>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Colourful Visual Communication.
        </div>
      </div>
    </footer>
  );
}
