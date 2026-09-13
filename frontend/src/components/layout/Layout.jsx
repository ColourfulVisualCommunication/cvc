import { Outlet } from "react-router-dom";

import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import ScrollToTop from "../ui/ScrollToTop.jsx";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
