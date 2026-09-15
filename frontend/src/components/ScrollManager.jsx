import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Per-session scroll memory, keyed by React Router's history entry key —
// each back/forward stack entry gets its own remembered position. Opening
// a new page (a clicked link) always starts at the top; going back or
// forward returns you to exactly where you were, matching how a normal
// multi-page site behaves and unlike the SPA default of just staying at
// whatever scroll position the previous page left the window at.
const positions = new Map();

export default function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const locationRef = useRef(location);

  useEffect(() => {
    // The browser's own scroll restoration fights with ours on
    // back/forward (it fires first, then React re-renders the new route
    // and our effect below runs), so it's turned off in favor of doing
    // this ourselves.
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = "manual";
    }
    const onScroll = () => positions.set(locationRef.current.key, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    locationRef.current = location;
    if (navType === "POP") {
      window.scrollTo(0, positions.get(location.key) ?? 0);
      return;
    }
    if (location.hash) {
      // The target (e.g. #services on the homepage) is often still
      // rendering — its content loads from the API after mount, so the
      // element may not exist in the DOM the instant this effect runs.
      // Poll briefly rather than assume it's already there.
      const id = location.hash.slice(1);
      const deadline = Date.now() + 2000;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: "start" });
        } else if (Date.now() < deadline) {
          requestAnimationFrame(tryScroll);
        }
      };
      tryScroll();
      return;
    }
    window.scrollTo(0, 0);
  }, [location, navType]);

  return null;
}
