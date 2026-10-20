> Follow-up: [proportionate print rendering and styled static recovery](print-export-recovery.md). The fixed-raster limitation recorded below belongs to this earlier checkpoint and is repaired in that follow-up.

# Native fallback recovery and local Pages readiness

This increment follows independently reviewed `79705e5f733d815338376e6e7cbdce9b5b04e04e` on the existing draft branch `codex/stock-report-typescript`. The restored checkout was clean and matched the remote draft; main remained `046e7fc4c0805a67703cf482f2500bac016a0727`. No repository or parent AGENTS.md was present. Exact published heads and hosted results are in the PR, rather than a self-referential commit hash in this file.

## Recovery fix and reproduction

Before the fix, the new offline regression forced the actual Vue chunk to fail, held the stock request, observed its browser abort on persisted pagehide, restored with pageshow, and released the late response. It failed because `.action-panel` remained hidden. Pending work did not store a report, but the native input UI was stranded behind the loading panel.

Persisted restoration now renews the request generation, clears the action panel's temporary display override, hides the loading panel and rerenders the existing ticker array through the text-safe helper. It preserves submitted tickers and the unsubmitted input value. It does not instantiate a substitute Vue runtime, change dates, add analyst behavior to the native fallback, or replace the original native prompt.

The shared regression runs against Vite preview and native Pages. It proves the request actually reports ERR_ABORTED; a late result cannot store/navigate after renewal; the action form, AAPL ticker and pending TSLA input return; and retry uses the original stock/report endpoints, original 150-word trading-guru prompt, original raw stock JSON and legacy sessionStorage shape. The forced Vue failure is transient: the report document's fresh import can load the real Vue module. Existing permanent dependency-failure tests remain unchanged.

## Two explicit build targets

- `npm run build`: existing GitHub Pages base `/stock-predictions-llm/`, preserving the current main-only deployment workflow. That workflow was not run or changed.
- `npm run build:pages`: root base `/`, native Pages `_headers` and minimal static `404.html`, output to the existing `dist` directory declared in wrangler.toml.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: Vite preview, 28 cases (all previous 27 plus fallback recovery).
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:pages`: actual built root artifacts through local Wrangler Pages/workerd, eight additional cases. Hosted CI omits CHROMIUM_PATH and uses its lock-pinned Playwright browser.

Build targets run serially because they intentionally share dist. The Pages policy is build metadata only; there is **no application Worker/Pages Function**, new endpoint, remote binding, account ID, credential, account resource or deployment action. The static 404 disables Pages' implicit SPA fallback for missing assets. The ordinary GitHub Pages build does not emit this Pages-specific metadata.

Pinned development tooling: Wrangler **4.151.2**, Miniflare **5.20261019.0-beta**, workerd **1.20261019.1** (`workerd 2026-10-19`), compatibility date **2026-10-01**. The prerelease Miniflare version is the exact dependency shipped by this Wrangler release, not a claim of production-edge parity. Wrangler is MIT OR Apache-2.0; Miniflare is MIT; workerd is Apache-2.0. Runtime application dependencies and their licenses are unchanged.

The server binds only 127.0.0.1:8788, with an ephemeral inspector port. `WRANGLER_SEND_METRICS=false` and `CLOUDFLARE_CF_FETCH_ENABLED=false` disable telemetry and optional remote Request.cf lookup. Config/log paths stay within the cloud workspace; config files are excluded from hosted artifacts. An initial exploratory local startup attempted the optional cf-metadata fetch, which the restricted environment could not complete; all final harness runs explicitly disable it. No app Worker/provider or decorative-art request is sent live: context-wide offline interception supplies provider fixtures and blocks external art.

## Response and caching evidence

`pages-build.ts` emits a global security/no-store rule plus **exact emitted JS/CSS/WOFF2 paths** with long-lived caching. It removes the broad cache header before setting each exact immutable value, avoiding conflicting comma-joined no-store/immutable directives. A build guard enforces the Pages 100-rule bound; the current output has one global rule and 20 exact hashed assets. No wildcard grants immutable caching to arbitrary asset-like URLs.

| Native local response | Verified behavior |
| --- | --- |
| `/index.html?x=%25` | 308 to `/?x=%25`, no-store |
| `/report.html?id=fixture` | 308 to `/report?id=fixture`, no-store |
| `/`, `/report?id=...`, legacy report query | 200 HTML identical to the built index/report bytes, no-store |
| Existing emitted JS / CSS / WOFF2 | 200, correct MIME and exact built bytes, public max-age=31536000 immutable |
| Unversioned existing image | no-store |
| Temporary nonfinancial JSON policy probe | application/json, no-store; removed by test, never shipped |
| `/stockReport.json` | 404, no-store; session reports are not a server data API |
| Unknown hash-shaped JS/CSS/font | genuine 404, no-store, static Not found body; no successful index HTML |
| Temporarily removed **known** JS/CSS/font with immutable rule | genuine 404, no-store; restored files return 200 immutable again |

`docs/evidence/pages-responses.json` records actual local status/headers. Tests remove only generated dist files and restore them in finally blocks. They also remove the real chart runtime chunk, verify report text/raw storage survive with an explicit unavailable state and disabled controls, then restore it and reload to a functioning real chart. Native Pages' error handling removes immutable cache headers on 404; the runtime tests exercise this behavior rather than assuming a successful build proves it. Real edge caching/purging remains unverified.

## Compatible CSP inventory, not a strict CSP claim

The emitted policy uses default-src none and these explicit requirements:

| Directive | Why it is present |
| --- | --- |
| script-src self + **unsafe-eval** | Existing full Vue compiler generates render functions from in-document templates. The negative control removes only this allowance and observes an actual compilation failure; restoring the declared policy runs real Vue and GSAP physics. No engine is stubbed or disabled. |
| style-src self + **unsafe-inline** | Existing report/print CSS, Vue/GSAP style mutations, DOM-built popup styles and embedded font-face declarations. No unsafe-inline script allowance is granted. |
| img-src self, data:, assets.codepen.io | Local identity/avatars/icons, real canvas PNG exports, existing optional confetti art. Art is blocked by the offline harness, not silently replaced. |
| font-src self, data: | Cacheable licensed local Geist/Mono WOFF2 assets and the existing embedded popup Latin fonts. Loaded font faces are asserted in parent and popup. |
| connect-src self + the two existing Worker origins | Build-owned module loading and the unchanged Polygon/OpenAI Worker contracts. Provider requests remain offline fixtures in tests. |
| base-uri none, object-src none, frame-ancestors none, form-action self | No base override, plugins or embedding required; native forms are handled within the app. |

Also emitted: nosniff, no-referrer, X-Frame-Options DENY and Permissions-Policy disabling unused camera, microphone, location, payment and USB access. No HSTS/domain policy is invented for an unverified real account/TLS configuration. CSP is defense in depth: it deliberately retains eval/style allowances and does not replace the single passive DOMPurify boundary or text-safe ticker rendering. A strict script CSP would require a separate precompiled-template slice.

## Browser and CI gates

The Pages tests exercise native HTML canonicalization and reload for session-backed and malicious legacy URLs; real Vue/GSAP; provider error/retry with actual GET/POST URLs, JSON headers and original message content; loaded local and popup fonts; mobile width, keyboard form submission, analyst toggles, slider and print focus; real chart data and PNG export; native print invocation; unavailable chunk recovery; and all response/cache cases above. No forecast or report content is fabricated to hide an unavailable dependency.

Cloud capture inspection: `evidence/pages-mobile-report.png` shows the explicit offline report and final chart values after rendering; `evidence/pages-print-preview.png` shows actual exported chart pixels and licensed popup typography. Existing fixed 800×670 print raster resampling can stretch a narrow mobile canvas; this pre-existing export geometry is retained. Native OS printing, PDF output and non-Chromium browsers are not certified by an invocation spy and canvas tests.

Hosted PR quality CI keeps exact-head checkout verification, read-only permissions, SHA-pinned actions, 15-minute job and 5-minute browser-suite bounds. It runs frozen install, strict types, all 16 existing units, full runtime+tooling audit, the normal build and 28 browser tests, then records pinned Wrangler/workerd versions, builds Pages and runs the eight local-runtime cases. It never deploys. Always-run seven-day artifacts include separate preview/Pages HTML reports, failure screenshots/traces/video, Wrangler logs, version metadata and response observations. Generated `.wrangler` vendor shims are excluded from the application-JS inventory like dist; handwritten production JS remains **0**.

Final local commands: locked offline npm ci (85 installed packages), strict typecheck, 16 units, full npm audit (0 findings), both production builds (359 modules each), 28 Vite-preview browser tests and eight Pages/workerd tests. Exact timings and the final hosted head/run are recorded in the PR. The full audit JSON is `evidence/pages-dependency-audit.json`; adding the pinned development emulator introduces no new production package dependency.

## Narrow remaining blockers

A later authorized release must verify the real account's build command selects `npm run build:pages` and dist, then establish real domain/TLS/header/cache behavior, native edge canonicalization, backend availability/auth/CORS/rate limits and any rollback/purge procedure. None is proven by local workerd or Cloudflare build status. No credentials/account/resource provisioning, deployment, public preview setup, domain change, package publication, merge or sibling repository edit occurred. All original financial/date/personality/report/storage semantics remain unchanged. No new layout or Paper approval is claimed; versioned Paper design records remain required for layout work. Model ID/reasoning effort remains unavailable in authoritative session metadata.
