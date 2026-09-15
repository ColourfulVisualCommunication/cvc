import { Outlet } from "react-router-dom";

import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import ScrollToTop from "../ui/ScrollToTop.jsx";
import SiteLoader from "../ui/SiteLoader.jsx";
import CustomCursor from "../ui/CustomCursor.jsx";

export default function Layout() {
  return (
    // The custom cursor's `cursor: none` (see index.css) is scoped to this
    // class rather than applied globally — /admin, /quote/:token and
    // /project/:token don't render CustomCursor (this Layout doesn't wrap
    // them), so a global rule would leave desktop visitors there with no
    // pointer at all.
    <div className="cvc-cursor-none flex min-h-screen flex-col">
      <SiteLoader />
      <CustomCursor />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
