import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-cvc-paper">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <img src="/logo.svg" alt="Colourful Visual Communication" className="h-20 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-cvc-muted">
              From Idea to Action. From Action to Reality.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:flex sm:gap-16">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-cvc-ink">Site</span>
              <Link to="/about" className="text-cvc-muted hover:text-cvc-ink">About</Link>
              <Link to="/services" className="text-cvc-muted hover:text-cvc-ink">Services</Link>
              <Link to="/work" className="text-cvc-muted hover:text-cvc-ink">Work</Link>
              <Link to="/blog" className="text-cvc-muted hover:text-cvc-ink">Blog</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-cvc-ink">Talk to us</span>
              <a href="https://wa.me/254769604255" target="_blank" rel="noreferrer" className="text-cvc-muted hover:text-cvc-ink">
                WhatsApp
              </a>
              <a href="mailto:njoroge@colourfulvisualcommunication.com" className="text-cvc-muted hover:text-cvc-ink">
                Email
              </a>
              <span className="text-cvc-muted">Ndeiya, Limuru, Kenya</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-black/5 pt-6 text-xs text-cvc-muted">
          © {new Date().getFullYear()} Colourful Visual Communication.
        </div>
      </div>
    </footer>
  );
}
