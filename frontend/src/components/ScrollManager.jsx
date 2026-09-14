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
    } else {
      window.scrollTo(0, 0);
    }
  }, [location, navType]);

  return null;
}
