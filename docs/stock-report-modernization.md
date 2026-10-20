# Stock report boundary — slice 1

Historical checkpoint at `1f367fe`. For the continued runtime/type migration and
current dependency/validation limits, see [runtime modernization](runtime-modernization.md).

## Restoration and scope

The fresh task restored a clean target checkout at assessment baseline
`046e7fc4c0805a67703cf482f2500bac016a0727`. Existing setup results and dependencies
were present. There are no AGENTS.md files in the workspace. A fresh upstream
`git ls-remote --symref origin HEAD` and `git fetch origin main` confirmed the
same commit on default branch `main`. Work branch: `codex/stock-report-typescript`.
The other two environment checkouts remain untouched and clean.

## Characterized behavior

Source inspection of the baseline established these compatibility requirements;
focused fixtures now exercise the migrated boundary:

- Input accepts strings longer than two characters and uppercases them. No new
  ticker whitelist, trimming, three-item cap, or investment rules are introduced.
- Dates use local calendar arithmetic, not UTC slicing or elapsed 24-hour units.
  The Vue path fetches 42 calendar days ago through yesterday regardless of the
  chosen display range. The fallback uses the original module-time three-day
  start and yesterday end. Tests cover leap/non-leap February, month/year rollover,
  Vancouver DST transitions and non-mutating date arithmetic.
- Polygon response strings remain unchanged in rawStockData and AI prompt input;
  reports still receive the existing message arrays, prompts and examples.
- `stockReport` remains the sessionStorage key. Multi-personality reports retain
  tickers, reports, personalityIds, timestamp, dayRange and rawStockData. Legacy
  content/personality reports and encoded URL fallback remain supported. Navigation
  still uses report.html?id=<timestamp> when storage succeeds. The baseline's Vue
  quota fallback referenced undefined `output`; this directly related error path
  now uses the first selected report as the existing single-report URL format
  requires.
- Empty/malformed/error provider replies now fail before a success is stored.
  HTTP errors use status codes without reflecting provider bodies into the UI.

## Implementation limits

Strict TypeScript covers the date helpers, provider contracts, stored report
validation and ticker DOM helpers. index.ts is the explicit Vite entry; index.js
and the report UI remain JavaScript. allowJs permits the legacy import, with
checkJs left off. This does not claim full application type safety.

Worker URLs are unchanged and remain configured external contracts. All tests
use offline JSON fixtures; no Worker was called. No credentials are copied or
bundled. Vue is a pinned development-only browser fixture; production still
uses its existing CDN script.

Ticker text never enters the HTML parser in the migrated sinks. The fallback
uses textContent directly. Existing chart/print markup uses opaque tokens during
HTML parsing, then DOM textContent/setAttribute setters restore the literal
values in detached DOM before insertion. The legacy popup also sets ticker text
through textContent. Print preview serializes the resulting DOM, preserving
escaped text. Provider report HTML rendering remains the existing semantics;
a general report HTML sanitization policy is a separate security decision.

## Reproduce

Use Node 24 or newer (native TypeScript stripping is used by the focused tests):

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

With system Chromium, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`
instead of installing a browser. Browser tests run the production build on
loopback only and intercept every non-loopback request. They check Vue and
no-Vue fallback paths, raw storage, report navigation, encoded legacy URL and
quota fallback, multiple personalities, malformed/error provider handling,
chart-error text, print controls, print preview and legacy popup safety. Attack
fixtures include attribute-breaking quotes, ampersands, img/onerror, svg/onload,
and numeric-entity handler code that survives ticker uppercasing.

External animation and chart CDN behavior is **unverified**: these scripts are
stubbed in the browser checks. DOM chart scaffolding/print output is exercised;
Chart.js rendering, chart interactions, animations and visual fidelity are not
claimed. No deployment, public preview or merge is part of this slice.

## Queued slices

1. **Remaining JS → TypeScript migration.** Start with report loading/navigation
   and personality data, then chart data/control modules, then animation/UI
   modules. Characterize each boundary before conversion. Keep provider behavior,
   sessionStorage formats and investment prompts stable; introduce checkJs only
   in modules ready for it. Include a separate review of report HTML trust and
   sanitization rather than silently changing report formatting here.
2. **LUM Brain design pass.** Separate design task, no layout changes in this PR.
   Use versioned Paper designs: `LUM Brain / stock-report / v1` for current-state
   frames; `v2` for proposed layouts, states and responsive variants; subsequent
   numbered versions for review revisions. Record real Paper design links and
   approved version identifiers before implementation. Cover input, loading,
   report/personality carousel, charts, errors, empty states and print layouts.
   Do not invent Paper artifacts or treat Figma as a substitute. Implement the
   approved layout in a later, independently reviewable slice.

These are repository backlog entries; no external issues or Paper designs have
been created in this task.
