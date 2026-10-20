# Report HTML trust boundary and typed print slice

Based on the published checkpoint `44e149563532a55ea99e0767c5603483996041f2`
on the existing `codex/stock-report-typescript` draft. Fresh remote inspection
confirmed that head and unchanged main before editing; no repository AGENTS.md
was present. This slice stays within stock-predictions-llm. All reproduction,
installation, mocked requests, builds, browser checks and screenshots ran in cloud.

## Concrete checkpoint reproduction

Before modifying application code, an offline Chromium reproduction against the
checkpoint production build produced these results:

| Entry | Checkpoint observation |
| --- | --- |
| Legacy content from sessionStorage | img/onerror executed: window.reportAttack became "stored"; one handler attribute remained in the report DOM. |
| Mock Worker report content | img/onerror executed after successful report navigation: window.reportAttack became "provider"; one handler attribute remained. |
| Legacy report popup | A script in reportContent executed during document.write: window.reportAttack became "popup". |

Only controlled markers and fixture strings were used. Every provider reply was
mocked; no live Worker was called. The prior ticker text fixes held, but they did
not cover report bodies. Reproduction output is retained in cloud scratch at
`/workspace/work/stock-report-trust/baseline-reproduction.json`; regression fixtures
are in tests/browser/report-trust.spec.cjs.

## Trace from untrusted data to rendering

| Source | Validation and storage | Rendering and print/pop-up disposition |
| --- | --- | --- |
| Report Worker content | fetchReportContent checks response status, JSON and a nonempty content string. The original string remains in stockReport, preserving the data contract and report wording. | Both Vue v-html expressions now read sanitized computed properties. Printing and the legacy popup call the same sanitizer utility independently at their insertion boundary. |
| Legacy/multi-personality sessionStorage | parseStoredReport checks string content/maps, numeric metadata and raw chart string arrays. Listed personality IDs must own a validated report string, excluding inherited constructor/toString/__proto__ references. | readReportState keeps the original strings; all report HTML passes through utils/report-html.ts. Malformed state produces the existing recoverable error, not a fabricated report. |
| Legacy URL parameters | URLSearchParams decodes once; existing string/empty checks remain. | Same sanitized report renderer as stored reports. No separate URL-only policy. |
| Tickers | Existing length/uppercase input rules and encoded Worker parameters are retained. | Vue text interpolation, textContent or the existing opaque text-token DOM helper handles chips, chart titles, controls and print headings. Legacy popup tickers use textContent. No ticker is parsed as HTML. |
| Personality values | Generation looks up own registry properties only. Stored own string keys are supported, including unknown analyst IDs. Names/images use own-property checks with the original default avatar. | Analyst labels use Vue text interpolation. Report strings use the common sanitizer; print selects the currently displayed carousel report. IDs cannot select prototype properties or become image URLs. |
| Raw stock/provider/chart JSON | Existing OHLCV validation remains; typed print metrics validate before formatting. | Chart values remain canvas data. Malformed numeric fields cannot become print markup. Existing chart errors use text-safe DOM slots. |
| dayRange and other metadata | Existing finite numeric/date/string checks remain. | Printed dayRange goes through DOM text slots. Print dates still use the existing local en-US formatting. No metadata value is treated as report HTML. |

## One rich-text policy

`utils/report-html.ts` owns the only report HTML sanitization policy, using exact
DOMPurify 3.4.17. The package declares `(MPL-2.0 OR Apache-2.0)`. It is installed,
locked and bundled; no sanitizer CDN is introduced. The branded sanitized-string
type documents the Vue rendering boundary. No unsafe raw fallback exists if the
sanitizer/report module cannot load.

Reports keep passive HTML formatting: div/paragraphs, headings, strong/emphasis,
spans, lists, quotations, pre/code, tables/captions/cells, safe anchors and a small
set of semantic inline tags. Allowed attributes are href/title and table
colspan/rowspan/scope. DOMPurify's URL validation removes executable/data link
schemes. Scripts, style/CSS, images, SVG/MathML, forms, controls, frames, embeds,
metadata, custom data/ARIA attributes, IDs, names, classes and event attributes
are outside this report-prose contract. Unsupported active attributes/elements
are removed while legitimate text/formatting remains. This is a rendering policy,
not a claim that report prose or linked websites are factually trustworthy.

Raw provider/storage text is not overwritten with manufactured safe content.
Regression checks compare the saved original string to the fixture byte-for-byte
and separately assert actual headings, emphasis, list/table data and safe links
in the page and print preview.

## Typed print and popup migration

The remaining report-view.js is migrated to strict report-view.ts, with typed
print inputs, DOM/event checks and a validated public Vue read/control interface.
`utils/print-metrics.ts` preserves provider order, close/high/low formatting,
percentage formula and rounding. It intentionally retains original zero-
denominator behavior rather than inventing a finite replacement. Date and prompt
semantics remain covered by the original tests; no price/order/prompt change was
introduced.

Print analysis now retains allowed formatting instead of regex-stripping tags.
The existing 1,200-character print limit is applied to sanitized DOM text with a
Range deletion, preserving balanced elements and appending the existing ellipsis.
The full page and legacy popup are not truncated. Print analysis follows the
currently selected analyst instead of always using the initial first report.

`utils/report-popup.ts` constructs the original popup frames with DOM methods,
static titles/styles and native Print/Close listeners. No application report
path uses document.write. Print preview imports/clones the already sanitized
print DOM, avoiding the old serialize/reparse step. Both popup types detach their
opener; blocked popups report failure without a false success. The existing popup
names, window features, controls and CSS are retained.

Chart export now stops interpolation and renders the final current chart state
before copying its canvas. This prevents a mid-animation point from disagreeing
with the report's unchanged numerical values. The existing 800×670 export size
and PNG contract remain. Missing/failed charts still print the explicit notice,
not an invented graph.

Untyped production application bodies decrease from 1,656 lines at the checkpoint
to 1,263 in app.js: **393 further untyped lines removed (23.73%)**. This accounts
for the print controller and legacy popup code actually migrated; moving static
styles alone is not claimed as type safety. Remaining legacy input/animation
methods are still JavaScript. No compiler suppressions or new any casts were
added; whole-application type safety is not claimed.

## Validation

The suite retains all 11 prior unit and 14 prior browser scenarios. It adds three
unit cases for print arithmetic/malformed numbers and own-property personality
references, and seven browser security/print cases:

1. Provider HTML formatting and malicious payloads through generation, stored
   raw content, report page, real chart export and print preview.
2. A stored legacy payload corpus covering handlers, SVG/MathML mutation shapes,
   CSS/imports, frames/srcdoc, scripts, forms, DOM clobbering and unsafe URL schemes.
3. URL reports and legacy popup content through the same policy, including safe
   title/ticker rendering and detached openers.
4. Unknown own personality keys and printing the currently selected analyst.
5. Native print dispatch and 1,200-character truncation across formatted elements.
6. Malformed chart/metadata and inherited personality references: safe rejection
   or absent metrics, preserving the legitimate report when applicable.
7. Blocked report/print popups: explicit failure and no payload execution.

Browser fixtures intercept the entire context, including popups. Assertions check
for handler execution markers, active DOM elements/attributes and payload resource
requests; they also verify legitimate report data and formatting. The regression
corpus is evidence for these cases, not a proof against every future browser or
sanitizer defect. DOMPurify should remain patched and audited.

Use Node 24+:

```sh
npm ci
npm run typecheck
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
npm audit
```

Final cloud results:

| Command | Result |
| --- | --- |
| npm ci --offline --cache /workspace/.cache/npm | PASS, 47 packages |
| npm run typecheck | PASS, strict migrated modules |
| npm test | PASS, 14 tests including all previous 11 |
| npm run build | PASS, Vite 8.3.4, 354 modules, both page entries |
| CHROMIUM_PATH=/usr/bin/chromium npm run test:browser | PASS, 21 tests including all previous 14; full run 36.6 seconds |
| npm audit --json | PASS, zero full-tree advisory findings |

The published/tested head is recorded on draft PR #1.
[Sanitized report preview screenshot](evidence/report-sanitized-preview.png) is
captured and reviewed in cloud with controlled historical/formatting fixtures;
it is not live market evidence or a design approval.

No layout, LUM palette or typography pass is included. Legacy font fallback and
external decorative-image limits remain documented in runtime-modernization.md.
Paper stayed closed and no design approval is claimed. Remaining work: typed
legacy input/animation methods and their lifecycle, broader corpus/fuzz coverage
and dependency maintenance, diagnostic-page retirement, then licensed LUM
foundation styling with mobile/light/dark/focus evidence and versioned Paper
records for layout changes. No live provider, credential transfer, merge,
package publication, domain change or production deployment occurred.

Model ID/reasoning effort: unavailable in authoritative session metadata.
