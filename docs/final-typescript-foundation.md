# Complete application TypeScript and retained-layout LUM foundations

This follow-up is based on reviewed checkpoint `cdaf3f65a8966681cc1fe2e9947aa11a56e08188`, on draft branch `codex/stock-report-typescript`. Main was re-resolved to `046e7fc4c0805a67703cf482f2500bac016a0727` before editing. The cloud-restored checkout was clean and exactly matched the remote draft; no sibling checkout was changed. No AGENTS.md was present in this repository. Publication head and hosted run results are recorded in the PR, since a commit cannot contain its own SHA.

## Type boundary and lifecycle

The final 1,263-line handwritten application JavaScript file, `app.js`, is removed. Its retained Vue Options API input/report flow is in `input-app.ts`; GSAP drawing, physics, cursor, placeholder and day-number behavior is in `input-animations.ts`. Both input and report Options API components use `defineComponent` for inferred method context. `allowJs` is removed. Every production entry/helper/runtime and the Vite config is covered by strict TypeScript with `noUncheckedIndexedAccess`, without `any`, ts-ignore, ts-nocheck or checkJs exceptions. Vue's retained in-document templates still use its existing full compiler; no framework or layout replacement was introduced.

`Lifecycle` owns request cancellation, waits, timers, intervals and input event subscriptions. Each task generation rejects stale completion after pagehide/restoration. Pagehide cancels request/navigation/print timers, kills owned Observer instances and GSAP roots, removes particles/drawing, restores cursor/placeholder/day-number styles, and releases chart instances. Persisted pageshow renews work without losing tickers, day range or selected analysts. Reduced-motion changes stop existing animation work; an initially reduced-motion session can load animations after that preference changes. The unused ScrollTrigger registration was removed: Observer's same touch classification is sufficient, avoiding an otherwise unused scroll plugin and its global listeners. The animation chunk fell from 121.87 kB to 87.96 kB before gzip.

Success/report timing, the 42-day calendar fetch window, native fallback's three-day window, ordered analyst messages, between-request delay, raw stock/report storage strings, URL quota fallback, popup/print formatting, report limit and financial calculations remain characterized by the existing tests. Raw report content still crosses the one pinned DOMPurify passive-format policy at rendering, including print/popup boundaries; it is not replaced with invented content. New controls use TypeScript event listeners instead of inline HTML handlers. Personality and print option controls have keyboard semantics; the existing print dialog receives/restores focus and traps Tab within its controls.

## Remaining JavaScript inventory

- Production handwritten `.js`, `.mjs`, `.cjs`: **0**.
- Inline script bodies and native `onclick` handlers in the two production HTML entries: **0**.
- `vite.config.js` became strict `vite.config.ts`.
- `playwright.config.cjs` remains Node test tooling; test harnesses remain `.cjs`/`.mjs`. These are explicitly outside the application inventory.
- `chart-test.html`, `live-chart-test.html`, and `test-report.html` are retired, along with the unused input debug launcher. They were not production Vite entries, duplicated stale code/CDNs, and the live chart diagnostic could call a Worker. Real chart, report, fallback and malicious-input paths now run reproducibly in offline tests. Their old source remains in Git history.
- Generated Vite/vendor JavaScript is expected in ignored `dist/`; it is not handwritten application source.

A unit gate rejects new application JavaScript/inline handler escape hatches and verifies the strict compiler boundary. No claim is made that test-tool JavaScript has been migrated.

## LUM adaptation and evidence

Only the permitted LUM files were read: [design tokens](https://github.com/goatcheese98/lum-brain/blob/main/src/styles/design-tokens.ts) (blob `e7e0c2362848c209914a5d9da2bcaa5657b663b8`), [fonts](https://github.com/goatcheese98/lum-brain/blob/main/src/styles/fonts.ts) (blob `d32cace0ed25de3f8e164b9b2d906ca6e782c0e9`), and [CSS standards](https://github.com/goatcheese98/lum-brain/blob/main/docs/css-standards.md) (blob `a0a54906dba295f4a3c0d76b0031e366579dec4a`).

`foundation.css` owns the supplied light/dark semantic palette, radius scale and bundled typography. Exact `@fontsource-variable/geist` and `geist-mono` 5.3.0 packages supply local WOFF2s under OFL-1.1; notices are in `docs/licenses/`. Browser tests load actual font faces and verify `loaded` status, rather than merely checking a CSS family name. System sans/monospace remain fallback if font delivery fails. Both pages and generated popup documents load the built stylesheet. Popup tests explicitly verify loaded font faces and theme tokens inside the built preview: Vite removes source-only link attributes, so popup framing imports Vite-processed shared CSS and embeds the licensed Latin font subsets as build-owned data URLs under Geist Popup / Geist Mono Popup face names. This avoids source-only attributes and blank-document subresource stalls observed in the cloud browser harness. Other glyphs use the explicit system fallback. The tradeoff is about 70 kB of additional uncompressed font data in the shared popup helper; the normal pages retain cacheable WOFF2 assets. No Google Fonts/CDN font request remains.

The layout, Dodgy Dave logo/avatars/content, personality selection, chart regions and print composition are retained. Chrome uses white/neutral light surfaces and neutral dark surfaces with gold accent. Errors retain readable semantic red; chart close/high/low remain distinguishable green/red/blue series with unchanged values/labels. Native controls retain visible focus and mobile input text is at least 16 px. Reduced motion disables CSS motion and GSAP initialization. Chart chrome follows the system theme; print export temporarily uses readable dark axes on opaque white paper and then restores the live chart palette and unchanged datasets. Popup regressions check real PNG paper/axis pixels and live color/data restoration. narrow legend typography/padding was adjusted after inspecting clipping. This is an existing-layout foundation pass, **not a Paper design or human approval**. Paper cloud remains unestablished; local Paper stayed closed. New layouts remain queued behind a versioned Paper design record.

Captured and inspected in cloud:

- Before: `evidence/input-before-lum.png`, `evidence/report-before-lum.png` (same retained layout before style edits).
- After light/dark desktop: `evidence/input-lum-{light,dark}-desktop.png`, `evidence/report-lum-{light,dark}-desktop.png`.
- After light/dark 390 px mobile: `evidence/input-lum-{light,dark}-mobile-focus-error.png`, `evidence/report-lum-{light,dark}-mobile.png`.
- Existing print controls: `evidence/print-dialog-lum-{light,dark}.png`; sanitized rich preview remains `evidence/report-sanitized-preview.png`; themed built popups are `evidence/print-preview-lum-{light,dark}.png`.

These are explicit offline fixture captures, not forecasts or live market evidence. Existing CodePen decorative confetti image URLs remain unchanged; network tests block them, so those external art pixels/availability remain unverified. Real bundled GSAP physics, Chart.js canvas pixels, date adapter, local fonts and report navigation are exercised. No runtime chart/animation CDN execution is relied upon; historical CDN behavior is not newly verified.

## Non-deploying hosted quality workflow

`.github/workflows/quality.yml` triggers on PR changes to main, including draft synchronization. It checks out the exact PR **head SHA**, verifies it against the event, uses read-only contents permissions with no persisted checkout credential, and has 15-minute job / 5-minute browser bounds and cancellation for obsolete runs. All actions use immutable SHAs. Node is 24.19.0, install is `npm ci` with lockfile-drift check, then strict types, all unit tests, full runtime **and tooling** npm audit, production build and offline browser/security/print/lifecycle/UI tests.

The locked Playwright 1.56.1 browser is Chromium **141.0.7390.37, revision 1194**. The workflow installs that package-owned browser, not the cloud system executable or a floating browser channel. `if: always()` artifact collection preserves exact head/runtime/browser metadata, audit, unit/build logs, HTML report, screenshots, traces and retained failure video for seven days. There is no deploy step, environment, provider credential or live-service smoke test. The existing main-only deploy workflow was not run or given new triggers.

Cloud pinned-browser download was attempted and rejected by the managed egress policy (`403 Domain forbidden` for cdn.playwright.dev and playwright.download.prss.microsoft.com). Cloud verification therefore uses `/usr/bin/chromium` **154.0.8037.57**, with local failure trace/screenshots and video disabled because the pinned FFmpeg download shares the blocked path. Hosted CI independently installs the lock-pinned browser and retains video on failure. Hosted success must be read from its actual run; Cloudflare build status alone is insufficient.

## Validation and dependency disposition

Final commands and exact results are recorded in the PR. Cloud gates: locked offline install (49 installed packages), strict types, 16 unit/boundary/lifecycle/inventory tests, all previous 21 browser cases plus six lifecycle/foundation cases (27 total), production build (359 modules), full npm audit, and whitespace validation. One interim browser run was invalidated by a concurrent reinstall; only the serial final run is accepted.

Full npm audit reports zero findings across production and tooling dependencies. Runtime versions remain Vue 3.5.44, Chart.js 4.5.1, adapter 3.0.0, date-fns 4.4.0, DOMPurify 3.4.17 and GSAP 3.13.0; fonts add only exact OFL packages. DOMPurify retains `(MPL-2.0 OR Apache-2.0)`; GSAP uses its [Standard no-charge license](https://gsap.com/standard-license), not MIT. Vite 8.3.4, TypeScript 5.9.3 and Playwright 1.56.1 are exact locked tooling. Zero registry findings are not a universal security proof.

Remaining work: versioned Paper designs before any new layout; broader template typing/accessibility and cross-browser testing as separate slices; ongoing sanitizer/advisory maintenance; separately establish licensing/availability for external decorative art if bundling it. Application JS-to-TypeScript and runtime chart/animation CDN removal are complete for the shipped two-entry application. No live Worker/provider, new paid endpoint, credentials/cookies, sibling changes, package publication, public preview, production deployment, domain change or merge was involved. Model ID/reasoning effort is unavailable in authoritative session metadata.
