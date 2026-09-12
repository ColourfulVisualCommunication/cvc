/**
 * Build-time prerender: after `vite build`, boot the built app under a
 * static server, visit every public route in headless Chrome, and replace
 * each route's shell with the fully-rendered HTML (including react-helmet's
 * title/meta/OG/JSON-LD). Crawlers and link-unfurlers that don't execute JS
 * (WhatsApp, Twitter, Facebook) then see real content instead of the bare
 * SPA shell. See CLAUDE.md's SEO section.
 *
 * Content routes (service/portfolio/blog slugs) are discovered live from
 * the API at build time, so a rebuild always prerenders whatever actually
 * exists — nothing hardcoded to fall out of sync.
 *
 * This never touches client/admin routes (/admin/*) — those are
 * deliberately excluded and must stay unindexed regardless.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import puppeteer from "puppeteer";

const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;
const API_URL = process.env.VITE_API_URL || "http://localhost:5000/api/v1";
const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const DIST = path.resolve(ROOT, "dist");

const STATIC_ROUTES = ["/", "/about", "/process", "/services", "/work", "/blog", "/contact"];

async function fetchSlugs(endpoint, attempt = 1) {
  try {
    // Generous timeout: Render's free tier spins down when idle and can take
    // 30-60s+ to cold-start on the first request after inactivity. A cold
    // instance can also actively refuse the very first connection rather
    // than queue it — that fails instantly with a generic "fetch failed",
    // not a timeout, which is exactly why this needs a retry, not just a
    // longer wait.
    const res = await fetch(`${API_URL}${endpoint}`, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item) => item.slug);
  } catch (err) {
    if (attempt < 3) {
      console.warn(`Fetch ${endpoint} failed (${err.message}), retrying (${attempt}/3)...`);
      await new Promise((r) => setTimeout(r, 5000));
      return fetchSlugs(endpoint, attempt + 1);
    }
    console.warn(`Could not fetch ${endpoint} for prerendering after 3 attempts (${err.message}) — skipping those routes.`);
    return [];
  }
}

async function discoverRoutes() {
  const [services, portfolio, posts] = await Promise.all([
    fetchSlugs("/services"),
    fetchSlugs("/portfolio"),
    fetchSlugs("/posts"),
  ]);
  return [
    ...STATIC_ROUTES,
    ...services.map((s) => `/services/${s}`),
    ...portfolio.map((s) => `/work/${s}`),
    ...posts.map((s) => `/blog/${s}`),
  ];
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) });
      if (res.status) return; // any HTTP response at all means it's up
    } catch {
      // not up yet, keep polling
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`vite preview did not respond at ${ORIGIN} within ${timeoutMs}ms`);
}

async function startServer() {
  // detached so it gets its own process group — `npx vite preview` spawns a
  // further child for the actual server, so killing just the wrapper
  // process on cleanup leaves that grandchild (and the port) behind.
  const proc = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  proc.stdout.on("data", (d) => process.stdout.write(d));
  proc.stderr.on("data", (d) => process.stderr.write(d));
  const exitPromise = new Promise((_, reject) =>
    proc.on("exit", (code) => reject(new Error(`vite preview exited early with code ${code}`)))
  );
  // Once the race below settles via the server responding, this promise is
  // still listening — it'll reject "unhandled" when we deliberately kill
  // the process later during cleanup unless something is always attached.
  exitPromise.catch(() => {});

  // Race against the process exiting so a real startup failure surfaces
  // immediately instead of waiting out the full poll timeout. Polling the
  // actual HTTP endpoint — rather than scanning stdout for a "Local:" log
  // line — is what actually matters and isn't sensitive to a CI
  // environment block-buffering the child's stdout instead of line-
  // buffering it, which is why the previous stdout-based check silently
  // never fired on Netlify despite the server starting up fine.
  await Promise.race([waitForServer(30000), exitPromise]);
  return proc;
}

function stopServer(proc) {
  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {
    proc.kill("SIGTERM");
  }
}

function routeToFile(route) {
  if (route === "/") return path.join(DIST, "index.html");
  return path.join(DIST, route.replace(/^\//, ""), "index.html");
}

// Framer Motion's whileInView animations only fire once an element actually
// crosses into the viewport. A single tall viewport misses long pages, so
// scroll the whole page first to trigger every reveal before capturing.
async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
  });
  await new Promise((r) => setTimeout(r, 300)); // let in-flight transitions settle
}

async function main() {
  console.log("Discovering routes to prerender...");
  const routes = await discoverRoutes();
  console.log(`Prerendering ${routes.length} routes:`, routes);

  const server = await startServer();
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    for (const route of routes) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1600 });
      await page.goto(`${ORIGIN}${route}`, { waitUntil: "networkidle0", timeout: 30000 });
      // networkidle0 alone isn't reliable here: JS parsing/mounting has zero
      // network activity, so the idle-timer can already have elapsed before
      // React even starts its data fetch, capturing the loading state
      // instead of the real content. Wait for the app's own explicit signal
      // (see src/lib/prerenderReady.js) instead, with networkidle0 as the
      // floor and a generous timeout as the ceiling if something's stuck.
      await page
        .waitForFunction("window.__PRERENDER_READY__ === true", { timeout: 15000 })
        .catch(() => console.warn(`  ! ${route} never signalled ready — capturing whatever's there`));
      await scrollToBottom(page);
      const html = await page.content();
      const file = routeToFile(route);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, `<!doctype html>\n${html}`);
      await page.close();
      console.log(`  ✓ ${route} -> ${path.relative(DIST, file)}`);
    }
  } finally {
    await browser.close();
    stopServer(server);
  }

  console.log("Prerendering complete.");
}

main().catch((err) => {
  console.error("Prerendering failed:", err);
  process.exit(1);
});
