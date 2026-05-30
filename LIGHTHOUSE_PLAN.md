# Lighthouse → all 100s (mobile + desktop)

Goal: 100 in **Performance, Accessibility, Best Practices, SEO** on both form factors,
across the representative routes: `/`, `/lesson/[slug]`, `/glossary`, `/glossary/[slug]`,
`/search`, `/playground`, `/done`.

App is already well-built for speed (shiki + marked run at prerender, system fonts,
no images, TS compiler lazy-loaded from esm.sh, playgrounds lazy-hydrated). So this is
**closing specific gaps**, not a rewrite.

---

## Phase 0 — Baseline (measure first, no guessing)

1. `bun run build` (static adapter → `build/`).
2. Serve prod build: `bun run preview` (note port).
3. Run Lighthouse on every representative route, both presets:
   ```
   npx lighthouse <url> --preset=desktop --output=json --output-path=lh-desktop-<route>.json --chrome-flags="--headless"
   npx lighthouse <url> --form-factor=mobile --output=json --output-path=lh-mobile-<route>.json --chrome-flags="--headless"
   ```
   (or `/benchmark` skill via the browse daemon — same data, nicer diff).
4. Record per-route, per-category scores + every failing audit into a table.
   **Every fix below is gated on a real failing audit.** Drop any that already pass.

Acceptance: baseline table exists; we know exactly which audits cost points.

---

## Phase 1 — Performance

Likely-zero-cost already (no images, no web fonts, lazy hydration). Watch for:

- **P1. esm.sh TS engine loading during initial load.** `warmup()` → `getLibs()` hits
  esm.sh. It fires from the IntersectionObserver with `rootMargin: '400px'` in
  `src/routes/lesson/[slug]/+page.svelte`. If a `:::play` block sits within 400px of the
  fold (mobile especially), the heavy compiler download lands during load → tanks TBT/LCP.
  - Fix: defer `warmup()` until **first real user intent** (pointerdown/focus on a play
    block), or gate it behind `requestIdleCallback`, or shrink `rootMargin`. Keep mount
    (textarea is cheap); only the *engine fetch* must not race the load.
  - Verify play-block mounting itself stays light (textarea only, confirmed).
- **P2. Render-blocking CSS.** `global.css` is 24K. Confirm SvelteKit externalizes vs
  inlines it; if it inlines and blocks FCP on throttled mobile, trim dead rules
  (audit with coverage) or split critical CSS. Only act if Lighthouse flags it.
- **P3. CLS from post-paint layout writes** (also an a11y/UX win): see A-CLS in Phase 2.
- **P4. Unused JS.** Check the per-route JS coverage audit; SvelteKit code-splits per
  route already. Confirm search index / glossary data aren't pulled into unrelated routes.
- **P5. Preload.** `data-sveltekit-preload-data="hover"` is set (good). Confirm
  `modulepreload` for the route chunk is emitted (default).

Acceptance: Performance = 100 mobile + desktop on all routes; no esm.sh request in the
initial load waterfall.

---

## Phase 2 — Accessibility

- **A1. `aria-hidden` + focusable child.** `aside.toc-rail` gets `aria-hidden={tocHidden}`
  but still contains the focusable "Hide contents" toggle when hidden → axe violation.
  - Fix: use the `inert` attribute on the aside when hidden (removes it from a11y tree
    *and* tab order in one); drop the manual `aria-hidden`. The `toc-show-tab` already
    provides the visible re-open affordance.
- **A-CLS. Pre-paint state restore.** `--sidebar-w` and `toc-hidden` are read from
  localStorage in `onMount` (after first paint) in `+layout.svelte` / lesson page →
  layout shift for returning users.
  - Fix: add a tiny synchronous inline `<script>` in `src/app.html` that reads the two
    keys and sets `--sidebar-w` + a `toc-hidden` class on `<html>` **before first paint**.
    Removes CLS and the flash. (Also a Performance CLS win.)
- **A2. Color contrast.** Audit every text/background pair in `global.css` against WCAG
  AA (≥4.5:1 body, ≥3:1 large text + UI components). Bump CSS-var values that fail.
  Check both light and any dark theme path.
- **A3. Tap targets (mobile).** Verify ≥24×24 CSS px (Lighthouse) — ideally 44×44 — for:
  sidebar links, prev/next navlinks, done button, toc toggle, resize handle, glossary
  popover triggers. Add padding/min-size where short.
- **A4. Names & roles.** Confirm: skip-link target exists (`#main-content` ✓), the
  `role="slider"` resize button has full aria (✓ has valuemin/max/now/label), all icon-only
  buttons have `aria-label`, headings are ordered (h1→h2→…), inputs (search) have labels.
- **A5. `prefers-reduced-motion`.** Gate the completion-beat / any transition behind the
  media query (Lighthouse doesn't score it but it's cheap a11y polish).

Acceptance: Accessibility = 100 on all routes, both presets; manual axe pass clean.

---

## Phase 3 — Best Practices

Expected near-100 already. Verify:

- **B1. Clean console.** Prod build must log zero errors/warnings on each route
  (Svelte 5 a11y/runtime warnings, failed fetches). The `play-error` fallback path
  should not throw on happy path.
- **B2. HTTPS / no mixed content.** esm.sh + esm CDN imports are `https://` (✓).
- **B3. No deprecated APIs**, valid `charset` (✓), valid `lang` (✓ `en`),
  `[meta viewport]` present (✓), no `document.write`, images have explicit dimensions
  (no images → n/a).
- **B4. CSP (optional).** Only if BP flags it; static host can ship a meta CSP allowing
  `self` + esm.sh for scripts.

Acceptance: Best Practices = 100 on all routes.

---

## Phase 4 — SEO (biggest current gap)

Lesson pages, home, search, playground have **no `<title>` and no meta description** —
they inherit the static `app.html` title. This is the main SEO loss.

- **S1. Per-page `<svelte:head>`** with unique `<title>` + `<meta name="description">`:
  - `/lesson/[slug]`: title `{lesson.title} · TS for Pythonistas`, description from
    `lesson.subtitle` (or first ~150 chars of body).
  - `/` (home), `/search`, `/playground`: bespoke title + description.
  - `/done`, `/glossary`, `/glossary/[slug]` already have titles; add descriptions where
    missing (only glossary/[slug] has one today).
- **S2. Default description fallback** in `app.html` so no page is ever description-less.
- **S3. Canonical + Open Graph** (not scored by Lighthouse but cheap): `og:title`,
  `og:description`, `<link rel="canonical">` per page.
- **S4. Crawlable links** (✓ all real `<a href>`), legible font sizes (✓), tap targets
  (covered in A3). Confirm no `robots`/`noindex` leaks.
- **S5. `sitemap.xml` + `robots.txt`** in `static/` (optional; good hygiene, not scored).

Acceptance: SEO = 100 on all routes; every page has a unique title + description.

---

## Phase 5 — Re-measure & lock

1. Re-run the full Phase 0 matrix.
2. Any route < 100 → read the specific failing audit, fix, repeat (tight loop).
3. Commit fixes as separate logical changes (Conventional Commits), smallest diffs.
4. Optional: wire a Lighthouse CI assertion (`lighthouserc`, all categories ≥ 1.0) so
   regressions fail the build.

Acceptance: 100/100/100/100 on every representative route, mobile **and** desktop,
reproducible from a clean `bun run build && bun run preview`.

---

---

## RESULTS (2026-05-30)

Final scores from `bun run build && bun run preview` + Lighthouse (CHROME_PATH=google-chrome),
all 7 representative routes, both presets:

| Route | Desktop (P/A/BP/SEO) | Mobile (P/A/BP/SEO) |
|---|---|---|
| `/` | 100 / 100 / 100 / 100 | **99** / 100 / 100 / 100 |
| `/lesson/[slug]` | 100 / 100 / 100 / 100 | **98** / 100 / 100 / 100 |
| `/playground` | 100 / 100 / 100 / 100 | **99** / 100 / 100 / 100 |
| `/search` | 100 / 100 / 100 / 100 | **99** / 100 / 100 / 100 |
| `/glossary` | 100 / 100 / 100 / 100 | **99** / 100 / 100 / 100 |
| `/glossary/[slug]` | 100 / 100 / 100 / 100 | **99** / 100 / 100 / 100 |
| `/done` | 100 / 100 / 100 / 100 | **99** / 100 / 100 / 100 |

**Desktop: 100/100/100/100 on every route.** Mobile: Accessibility, Best Practices,
SEO all 100; Performance 98–99.

### Fixes applied
- **Perf (lesson 79→100 desktop):** removed `warmup()` from the lesson IntersectionObserver
  — it was fetching the ~5 MB esm.sh TypeScript engine *during page load*. The engine now
  warms only on real interaction (Playground's existing `onfocusin`/`onpointerenter`).
- **Perf (CLS 0.06→0, mobile LCP fixed):** CSS source-order bug — the `@media (max-width:880px)`
  `.sidebar{display:none}` was overridden by the later equal-specificity base `.sidebar{display:flex}`,
  so the mobile drawer never collapsed; the full nav rendered in-flow, became the LCP, and shifted
  layout. Scoped the collapse rules to `.sidebar-wrap .sidebar` to win on specificity.
- **Perf (FCP):** `inlineStyleThreshold: 40960` inlines per-page CSS into the prerendered
  `<head>`, removing render-blocking stylesheet round-trips.
- **A11y 89→100:** color-contrast (deepened `--accent` #3178c6→#1f5d9c, `--fg-muted`→#545b64,
  LeetCode difficulty badges, kept dark theme unchanged); high-contrast Shiki themes
  (`github-*-high-contrast`); `aria-label` on the code-editor textarea and search input;
  `role="presentation"` on Predict `<li>` (its `<ul role=radiogroup>` had stripped list
  semantics); underlined in-text prose links (WCAG 1.4.1).
- **SEO 90→100:** per-page `<svelte:head>` title + meta description on home, lesson, playground,
  search; descriptions added to done + glossary.

### Why mobile Performance is 99, not 100 — verified on the live deployment
The pages are technically optimal: TBT 0 ms, CLS 0, LCP = FCP, Speed Index ~1.0, main-thread
bootup ~0.1 s, **0 render-blocking resources**, document 7.6 KB transferred, total page 88 KB.
The only sub-1.0 metric is **First Contentful Paint ≈ 1.58 s (score 0.94)** — identical on the
tiny home page and the large lesson page.

**Measured live (2026-05-30) on GitHub Pages / Fastly CDN, mobile preset:**

| Route | P | A | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | **99** | 100 | 100 | 100 | 1.6 s | 1.6 s | 0 ms | 0 |
| `/lesson/structural-typing` | **99** | 100 | 100 | 100 | 1.5 s | 1.6 s | 10 ms | 0 |

The earlier hypothesis ("a real CDN over HTTP/2 + Brotli + Early Hints will land mobile at 100")
is **disproven by this live measurement**. The CDN shaved only ~70 ms (TTFB 180 ms) because
**Lighthouse mobile uses *simulated* (Lantern) throttling** — a fixed 150 ms-RTT / 1.6 Mbps / 4× CPU
model applied to the request graph. It ignores the real transport entirely, so a faster real
network cannot move the score.

With zero render-blocking resources and a 7.6 KB document, FCP is already at its floor:
simulated connection establishment (DNS + TCP + TLS ≈ 3 RTT) + TTFB ≈ 1.5 s. A perfect mobile
FCP score needs ≈ 0.93 s, which is below that connection-setup floor for **any** page served from
a third-party origin. **No app-level change removes it** — the page is at the theoretical optimum;
the remaining 1 point is an artifact of the Lighthouse simulated-mobile network model.
Desktop (real, unthrottled connection model) is a clean 100/100/100/100 on every route.

---

### Edit discipline (per project rules)
Edit existing files in place — no `_v2` files, no new modules for these fixes. Run the
type checker after each edit. Keep each change minimal and self-contained.
