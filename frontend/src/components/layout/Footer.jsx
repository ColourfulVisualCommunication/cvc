import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaThreads, FaTiktok, FaYoutube, FaXTwitter } from "react-icons/fa6";

import Logo from "../ui/Logo.jsx";

// Threads, TikTok, YouTube and X accounts aren't set up yet — left as "#"
// so the row's layout is already final once they exist.
const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/ColourfulVisualCommunication", Icon: FaFacebookF },
  { label: "Instagram", href: "https://www.instagram.com/_njoroge_stephen/", Icon: FaInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/stephen-njoroge-cvc", Icon: FaLinkedinIn },
  { label: "Threads", href: "#", Icon: FaThreads },
  { label: "TikTok", href: "https://www.tiktok.com/@colorfulvisual", Icon: FaTiktok },
  { label: "YouTube", href: "#", Icon: FaYoutube },
  { label: "X", href: "#", Icon: FaXTwitter },
];

export default function Footer() {
  return (
    <footer className="bg-cvc-ink">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <Logo dark />
            <p className="mt-3 max-w-xs text-sm text-white/60">
              From Idea to Action. From Action to Reality.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:flex sm:gap-16">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-white">Site</span>
              <Link to="/about" className="text-white/60 hover:text-white">About</Link>
              <Link to="/services" className="text-white/60 hover:text-white">Services</Link>
              <Link to="/work" className="text-white/60 hover:text-white">Work</Link>
              <Link to="/blog" className="text-white/60 hover:text-white">Blog</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-white">Talk to us</span>
              <a href="https://wa.me/254769604255" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white">
                WhatsApp
              </a>
              <a href="mailto:njoroge@colourfulvisualcommunication.com" className="text-white/60 hover:text-white">
                Email
              </a>
              <span className="text-white/60">Ndeiya, Limuru, Kenya</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} Colourful Visual Communication.
        </div>
      </div>
    </footer>
  );
}
