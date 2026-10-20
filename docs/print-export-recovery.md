# Proportionate print charts and static recovery

Follow-up to reviewed `12a8ed9365df7674f2b10e85f87aba134f343d1f`, on the same draft branch. The reviewed checkpoint and PNGs are retained; new evidence uses separate names.

## Print boundary

Previously `printableChartImage` temporarily recolored/stopped/updated the live chart, then stretched its narrow source canvas to 800×670. Circles became wide ovals and tick/legend text blurred. `utils/print-chart.ts` now constructs a separate **real, already bundled Chart.js** renderer on a detached canvas. It copies raw chart configuration recursively (including dates, callbacks, datasets and selected windows), preserves dataset order, colors and visibility, and renders an 800×570 logical chart at uniform device-pixel-ratio 2: **1600×1140 PNG**. It does not copy a bitmap from the live canvas.

The print-only configuration disables responsiveness, events, tooltip and animation, uses a white background, neutral dark axes/legend and the loaded licensed Geist Mono at 14 logical pixels. Print CSS uses intrinsic image height at the available width, preserving the raster aspect ratio. No live chart stop/update/resize/destroy call is needed. The independent instance is destroyed in `finally`, including a constructor/plugin failure after registration; the detached canvas backing store is released after encoding.

Data, timestamps/date formatting callbacks, trading-day selection, close/high/low order/colors, report/sessionStorage strings, original metadata/price/percentage formulas and the 1,200-character report print limit are unchanged. This is a renderer/print-palette correction, not a data or investment-semantic change. Existing report/print layouts are retained.

Actual print-media testing also reproduced hidden popup content: copied report CSS made `body *` invisible outside a `.print-content` wrapper, while the popup imports the wrapper's children. Scoped popup print CSS makes `.preview-container` descendants visible and hides preview-only controls/header. Print ticker overlay text now uses `--on-acc`, avoiding black text on a black accent in the light paper palette.

## Static 404

The Pages build still emits native static metadata only, no Worker/Functions. Its 404 document links Vite's processed shared foundation stylesheet at a root-absolute URL, using the existing local licensed fonts, light/dark surfaces, semantic error color, 16px body typography, radius and visible keyboard focus. Its simple recovery panel explicitly stays block-level rather than inheriting the input page's flex `main` rule. It contains no script, needs no JavaScript, and adds a document CSP restricting scripts to `none` (in addition to the existing response policy).

Native Pages continues to return **404/no-store**, including requests to nested unknown HTML and missing known/unknown JS/CSS/fonts. The recovery link remains `/`; hashed foundation CSS/font responses retain their exact-file immutable rules. Both build bases are unchanged. No new layout or Paper design/approval is claimed.

## Regression gates and evidence

Three new shared real-engine browser cases run under both Vite preview and local Pages/workerd:

- Mobile (390px) and desktop (1280px) live charts have non-square bounds. Observed actual print renderer datasets/dates/colors match the selected three-day fixture, loaded font and 14px tick/legend options are checked, and actual green point pixel diameters agree horizontally/vertically within two pixels. PNG dimensions/opaque white corner and rendered print-media aspect ratio are asserted.
- Before/after live raw options/data, object identities, chart/canvas geometry, active elements and engine instance registry are identical; instrumented live stop/update/resize/destroy calls remain empty. The tests observe a real registered engine plugin, not an engine stub or fabricated rendered chart.
- Missing print context, real plugin/render failure after instance registration, and PNG encoding failure each preserve report content, clean the registry and leave the live chart unchanged; a subsequent export succeeds.

Each successful source-size case loads actual popup fonts, checks readable print ticker contrast, emulates print media, captures it, and generates an actual Chromium PDF with the real chart image embedded. PDFs and JSON geometry/data/pixel observations are uploaded in the always-run CI `quality-artifacts/print-{preview,pages}-{mobile,desktop}.{pdf,json}` files. This extends coverage beyond a print invocation spy. The existing print invocation/lifecycle/security assertions remain.

Two new native Pages cases disable page JavaScript entirely and verify mobile light/dark recovery, actual local font loading, status/cache/CSP, vertical content flow, semantic error and focus colors, no script requests, and keyboard navigation back to the real index.

New captures: `docs/evidence/print-proportion-{preview,pages}-{mobile,desktop}.png`, `print-media-{preview,pages}-{mobile,desktop}.png`, PDF first-page raster captures, and `pages-recovery-{light,dark}-mobile.png`. These are offline fixtures; source prices/report content have not been replaced with claims about real market data.

## Reproduction and limits

Use the existing frozen install, `npm run typecheck`, `npm test`, `npm audit --json`, `npm run build`, `npm run test:browser`, `npm run build:pages`, `npm run test:pages`. The full suite retains all **16 units, 28 prior preview and eight prior Pages cases**, adding three preview and five Pages cases: **31 preview / 13 Pages**. Hosted CI already runs both complete directories and retains the new PDF/JSON artifacts without additional deployment steps. Handwritten production JavaScript remains zero; dependencies/lockfile are unchanged in this follow-up.

The PDF evidence proves Chromium's headless print-media/PDF rendering, not an OS print dialog, physical printer or another browser engine. Charts are raster images at 2×, not vector charts; text remains subject to normal uniform resampling/printer resolution. Real account/domain/TLS/edge and live Worker/backend readiness remain unverified as described in [Pages readiness](pages-readiness.md). The required Vue `unsafe-eval` and inline-style allowances remain disclosed. No live provider/art calls, account/resources, credentials, deployment, public preview, domain changes, merge or Paper approval.

## Cloud verification result

Frozen offline install installed the same 85 locked packages. Strict types, all 16 units, both 360-module builds, 31 Vite-preview browser cases and 13 local Pages cases pass. Full runtime/tooling audit: zero findings; dependency and lock files unchanged. Runtime: Node 24.19.0, npm 11.9.0, cloud system Chromium 154.0.8037.57; hosted CI uses its existing lock-pinned Chromium. The final hosted exact head/run is recorded in the draft PR.

Cloud `pdftoppm` rasterization of both Pages source-size PDFs was inspected at a 1200px page bound. They produce the same proportionate chart; point centers/labels and the white-on-black ticker remain readable. `pdfinfo` reports one A4 page (594.96×841.92pt); `pdftotext` retains the original report/header/metrics/disclaimer text. `pdffonts` reports embedded Geist and Geist Mono subsets. The chart's own axis/legend text is in the real 2× PNG. These renderer/PDF observations do not establish physical printer quality. Mobile light/dark 404 captures were inspected after correcting inherited flex flow. Reviewed baseline captures were restored unchanged.

The initial hosted follow-up run `39400078400` at `14e1815` passed the new real print cases but caught an existing final-point assertion reading the still-running live animation (0.0488px before completion). Previously export itself stopped/updated that live chart. The security test now waits for font readiness/natural completion while the source is foreground before opening its popup, retaining the original after-export **five-decimal assertion unchanged**, preserving the no-live-mutation requirement rather than stopping the animation in production or weakening the numeric assertion. Failure screenshots/video/trace are retained in artifact `12254697105`; this failed run is not claimed as final validation.
