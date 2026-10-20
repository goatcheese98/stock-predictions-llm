> Follow-up: [complete application TypeScript and retained-layout LUM foundations](final-typescript-foundation.md). This file records its earlier checkpoint.

# Runtime modernization — follow-up on draft PR #1

Historical checkpoint at `44e1495`. The continued HTML trust/typed print slice is
recorded in [report HTML trust](report-html-trust.md).

This slice is based on `1f367fe367aa0ebca9c58811ae167cf8fcfaf4a7` on
`codex/stock-report-typescript`. A fresh remote inspection confirmed that head,
the original `main` baseline, and no repository AGENTS.md before editing. No
sibling repository was modified. All installation, test execution, mocks and
screenshots ran in the managed cloud environment.

## What changed

- `charts.ts` owns the actual typed Chart.js renderer, OHLC mapping, local-date
  sorting, trading-day windows, tooltip callbacks and individual day controls.
  It validates saved chart payloads while retaining markdown-wrapped historical
  data support and the existing parse/no-data/error presentations.
- `report-app.ts` owns the existing Vue Options API report component under strict
  TypeScript. `utils/report-state.ts` normalizes stored single/multiple-personality
  and URL report data. The print code consumes that mounted instance rather than
  relying on Vue's private root-element properties.
- `personalities.ts` and `utils/generate-reports.ts` own typed personality data,
  exact prompt construction, progress and sequential requests/delays. SHA-256
  golden values from the first checkpoint verify every personality name,
  subtitle, system prompt and example string is unchanged.
- `index.ts` and `report-entry.ts` bootstrap build-owned Vue modules. The legacy
  input/animation UI is now `app.js`; remaining print helpers are `report-view.js`.
  No framework rewrite or new page/section layout was introduced.
- Vue, Chart.js, its date adapter/date-fns and the used GSAP plugins are pinned
  npm modules bundled by Vite. Main/report HTML no longer loads runtime scripts
  from unpkg, jsDelivr or cdnjs. The financial chart plugin and Draggable were
  unused in the actual application path and are omitted. The existing main-only
  Pages workflow now selects Node 24, uses npm ci and runs typecheck/unit checks;
  its deployment triggers/destination are unchanged and it was not run.
- Chart and animation runtimes are separate lazy chunks. A missing chart chunk or
  unavailable canvas shows a local notice without discarding the report/data;
  unavailable controls are disabled. Print export only includes a successfully
  rendered chart; unavailable charts produce a clear notice instead of a blank
  image presented as a successful graph. A missing Vue/report dependency produces a
  recoverable report-page error with a home link and keeps sessionStorage intact.
  An unmounted report template is cloaked until ready, including the failure path.
- Chart instances are destroyed on pagehide and rebuilt on persisted pageshow.
  Render generations prevent stale asynchronous chart creation. Tooltip volume
  now follows the visible day window rather than the initial window's closure.
- Optional animation failure and startup reduced motion leave report generation
  available. Tests exercise bundled GSAP/Physics2D transforms and completion,
  not only script presence. CSS motion preferences apply to the existing spinner,
  carousel and transitions. Remote decorative image art remains unverified.

The source count for the two previously untyped application bodies was 2,439
lines (`index.js` plus the inline report script). It is now 1,656 lines in
`app.js` plus `report-view.js`: **783 fewer untyped lines, 32.10% reduction**.
This count excludes unchanged diagnostic pages, fixtures and tooling. Renaming
index.js does not count as a migration: its remaining JavaScript is included.
Strict TypeScript includes the migrated report component, renderer, state,
personality/request modules, bootstrap/runtime modules and previous boundaries.
`allowJs` remains enabled for legacy imports; `checkJs` remains off. No claim of
whole-application type safety is made.

## Contract and directly related fixes

Worker endpoints, identity/branding, personality selection/order, prompt wording,
OHLC/close/high/low values, report meaning, local calendar ranges, and the
`stockReport` key/formats remain unchanged. There are no live provider calls,
credential transfers, new service endpoints or forecasts. Generated OHLC rows in
one browser test are explicitly historical test fixtures, not market evidence.

Ticker text continues to enter DOM text/inert attribute setters after static
markup parsing; malicious ticker tests now also exercise real charts and printed
canvas images. Existing report-body HTML rendering is preserved and remains a
separate trust/sanitization policy question.

Two directly related boundary bugs were corrected: the range slider now uses
Vue's numeric binding so valid user interaction doesn't fail the typed stored
report contract; URLSearchParams results are decoded only once, preserving literal
percent signs/encoded text. Print analysis now reads the mounted component instead
of an absent private Vue root property. Existing canvas layout was given flex
shrink containment so the real responsive chart fits the existing mobile column.
A cramped legend and edge badges at narrow widths remain layout/design follow-up;
no new layout or visual-design approval is claimed.

## Dependencies and security disposition

| Dependency | Disposition |
| --- | --- |
| Vue | 3.5.22 development-only CDN fixture → exact 3.5.44 production module; full compiler build preserves in-document templates. MIT. |
| Chart.js | old 4.4.0 CDN → exact 4.5.1 module, same line/close/high/low chart type. MIT. |
| chartjs-adapter-date-fns | exact 3.0.0 module, time scale exercised in Chromium. MIT. |
| date-fns | exact 4.4.0 peer module, pinned and adapter compatibility exercised. MIT. |
| GSAP | exact 3.13.0, matching the old CDN; Observer, CustomEase, CustomWiggle, Physics2DPlugin and ScrollTrigger bundled. Package-declared Standard “no charge” license: https://gsap.com/standard-license (not represented as MIT). No subscription or credentials provisioned. |
| Vite | 5.4.21 locked → exact 8.3.4 development dependency, compatible with required Node 24. MIT; production build/preview exercised. |
| OpenAI SDK | unused browser SDK removed; Worker requests still use the existing typed fetch contract. |
| Financial/Draggable plugins | removed from main/report load path because no application code uses them. |
| Playwright / TypeScript | retained exact 1.56.1 / 5.9.3 development versions. |

The initial npm audit reported 9 affected packages: 8 high and 1 moderate,
including Vite/esbuild, old Vue/server-renderer and SDK/build transitive packages.
After the changes, full-tree `npm audit --json` reports **zero findings**. This is
the registry advisory result, not proof that all application/security risks have
been eliminated. The lockfile carries exact transitive versions and integrity
hashes; no force audit remediation or provider request was used.

## Validation and reproduction

Use Node 24+ and run:

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm audit
```

Final locked install passed with 45 packages. Strict typecheck, all 11 focused
unit tests, both-entry production build and all 14 browser tests passed; the
final full-tree npm audit reports zero findings. No compiler/test suppression was
introduced. Cloud runs use `npm ci --offline --cache /workspace/.cache/npm` and
`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`. Browser checks run the
production build on loopback. Every external request is fulfilled with a provider
fixture or blocked. Vue/chart/animation libraries are the real built modules,
not mocked CDN scripts. The no-Vue case aborts the local Vue chunk to exercise the
original fallback path. Failure tests likewise abort real chart/animation/report
chunks or remove the canvas context.

The focused suite has 11 tests: the original 5 boundaries plus personality/prompt
hashes, sequential partial failure/progress/delays, report-state compatibility,
URL percent handling and unavailable/corrupt storage. The Chromium suite has
14 tests: all original 8 scenarios plus missing dependencies/canvas, real chart
pixels/windows/time scale/volume/print, chart cleanup/bfcache restoration and real
GSAP physics/reduced-motion behavior. Final exact command results are recorded in
the updated PR description.

Screenshots are captured and reviewed in cloud:

- [Checkpoint report with unavailable CDN chart scripts](evidence/report-before-cdn-unavailable.png)
- [Current offline report with real bundled chart, desktop](evidence/report-offline-desktop.png)
- [Current offline report with real bundled chart, 390px viewport](evidence/report-offline-mobile.png)

These show fixture data only. External Google Fonts are blocked during the checks:
legacy DOM font stacks use their system sans-serif fallback and canvas font
fallback is browser-selected. Geist/Geist Mono are **not loaded or claimed** in
this slice. No palette/control typography conversion occurred, so these are not
LUM light/dark/focus-style approval evidence. Native controls/focus were retained.

## Design references and remaining slices

Only these permitted LUM Brain files were read, without modifying that repo:

- `src/styles/design-tokens.ts`, blob e7e0c2362848c209914a5d9da2bcaa5657b663b8
- `src/styles/fonts.ts`, blob d32cace0ed25de3f8e164b9b2d906ca6e782c0e9
- `docs/css-standards.md`, blob a0a54906dba295f4a3c0d76b0031e366579dec4a

Paper cloud is unestablished; local Paper remained closed. No Paper design,
human design approval or new layout is claimed. Remaining work is separately
queued: migrate legacy input/animation methods and print composition to strict
TypeScript; audit their resource cleanup and general report HTML trust; adopt
licensed local Geist/Geist Mono plus LUM semantic tokens within the existing
layout with light/dark/mobile/focus evidence; resolve narrow-screen legend/badge
layout only through the required versioned Paper record for layout work. Legacy
standalone diagnostic HTML files still contain CDN examples and are outside the
production Vite entry path; retire/migrate them separately. Decorative remote
confetti images and real live providers have not been validated.

Model ID/reasoning effort: unavailable in authoritative session metadata.
No merge, package publication, domain change, credential provisioning or deployment.
