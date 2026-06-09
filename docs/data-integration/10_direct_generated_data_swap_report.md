# Direct Generated Data Swap Report

## Summary

The frontend now imports generated JSON data through a small adapter instead of importing `src/data/mockData.js` directly.

No feature flag, backend/API, CSV import, or `.pkl` model integration was added. The UI components were not redesigned.

## Files Changed

Intentional source/documentation changes:

| File | Change |
| --- | --- |
| `src/data/generatedData.js` | Added small adapter that imports generated JSON and exports named `players` and `teams`. |
| `src/App.jsx` | Replaced active mock-data import with generated-data adapter import. |
| `docs/data-integration/10_direct_generated_data_swap_report.md` | Added this report. |

Preserved file:

| File | Status |
| --- | --- |
| `src/data/mockData.js` | Preserved untouched as backup; no active app source imports it now. |

Verification note:

- `npm.cmd run build` was executed for verification. Vite writes production output to `dist/` during a build. No manual edits were made to `dist/`.

## Import Replacement

Previous active app import in `src/App.jsx`:

```js
import { players, teams } from "./data/mockData";
```

New active app import in `src/App.jsx`:

```js
import { players, teams } from "./data/generatedData";
```

New adapter:

```js
import players from "./generated/players.sample.json";
import teams from "./generated/teams.sample.json";

export { players, teams };
```

Active source search result:

- `src/App.jsx` imports `./data/generatedData`.
- `src/data/generatedData.js` imports `players.sample.json` and `teams.sample.json`.
- No active source file imports `src/data/mockData.js`.
- Remaining `mockData.js` mentions are historical docs/metadata text, not active app imports.

## Dashboard Render Status

Verification performed:

- Production build passed with generated JSON imports.
- Vite dev server returned HTTP 200 for the app root.
- Direct module/shape check confirmed:
  - 50 generated players.
  - 16 generated teams.
  - First generated player is `Erling Haaland`.
  - First route target is `/player/erling-haaland-839956`.
  - All generated player `teamId` values resolve to generated team IDs.

Browser-render tooling note:

- Playwright package was present only through bundled dependencies and initially missed `playwright-core` until the pnpm path was added.
- Playwright browser binaries were not installed.
- System Chrome could be launched, but headless DOM capture returned no DOM in this environment.
- Because of that local browser-tooling limitation, dashboard visual render was not fully screenshot-verified here. Build and dev-server checks did not expose runtime import errors.

## Player Profile Render Status

Verification performed:

- Direct generated data check confirmed `/player/erling-haaland-839956` exists and resolves to a valid player/team pair.
- Production build passed, which validates JSON import and bundling.
- Dev server served the app root successfully.

Browser-render limitation:

- Full headless browser route verification could not be completed for the same local Chrome/Playwright limitations noted above.

## Visible Issues From `"UNKNOWN"` Fields

Expected visible/generated placeholders:

| Area | Issue |
| --- | --- |
| Player profile hero | `Nation` displays `UNKNOWN` for all 50 generated sample players. |
| Team/portfolio cards | `country` displays `UNKNOWN` for generated teams. |
| Player statistical console | `Appearances`, `Matches Started`, `Penalty Goals`, `Total Passes`, and `Total Contest` may display `UNKNOWN`. |

These are known data-source gaps from the previous validation docs, not import-swap regressions.

## Visible Issues From Zero Future Projections

All generated sample players currently have placeholder future projections:

```json
[
  { "season": "2026/27", "aiQualityScore": 0, "marketValue": 0 },
  { "season": "2027/28", "aiQualityScore": 0, "marketValue": 0 },
  { "season": "2028/29", "aiQualityScore": 0, "marketValue": 0 }
]
```

Expected visible issue:

- Forecast rows and projection summary show `AI Index 0` and `EUR 0.0M`.

This is expected because model output is intentionally not connected yet.

## Visible Issues From Low `aiQualityScore` Range

Generated sample range:

| Field | Min | Max |
| --- | --- | --- |
| `aiQualityScore` | 3401 | 5017 |

Expected visible issue:

- Dashboard has no "Elite AI profiles" under the current frontend threshold of `>= 8000`.
- Player score orbs use the lower "Development Profile" tier for generated sample players.
- Top prospect ranking still works, but generated v1 scores are much lower than the original fake mock values.

This is a scoring-calibration issue, not an import-swap runtime issue.

## Runtime / Build Errors Encountered

| Check | Result | Fix / note |
| --- | --- | --- |
| `npm run build` | Failed in PowerShell because `npm.ps1` is blocked by execution policy. | Re-ran as `npm.cmd run build`. |
| `npm.cmd run build` | Passed. | Vite emitted chunk-size and Tailwind plugin timing warnings only. |
| Dev server HTTP check | Passed. | Vite root returned HTTP 200 and contained the React root. |
| Direct JSON/module shape check | Passed. | 50 players, 16 teams, no duplicate player IDs, no unresolved team joins. |
| Playwright browser check | Blocked. | Bundled Playwright browser executable was missing. |
| System Chrome headless DOM check | Blocked. | Chrome produced no DOM output in this environment. |

No code changes were needed to fix data-shape/runtime issues after the import swap.

## Mock Data Preservation

`src/data/mockData.js` is still present and was not edited or deleted.

It is no longer imported by active app source code.

## Next Step Readiness

The direct generated-data import swap is complete from a source-code perspective.

Before treating this as product-ready, address:

- `UNKNOWN` visible fields.
- Zero-value future projections.
- `aiQualityScore` calibration.
- Team/league display-name curation.
- A reliable browser QA path for this local environment.

