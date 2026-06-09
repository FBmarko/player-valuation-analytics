# Adapter Cleanup and Score Calibration Report

## Summary

The generated-data layer has been upgraded from the 50-player sample files to production-style `.generated.json` files.

The frontend still imports generated data through:

```text
src/data/generatedData.js
```

No mock-data reconnect, CSV import into React, `.pkl` model load, backend/API, or UI redesign was added.

## Files Created

| File | Purpose |
| --- | --- |
| `Model/config/web_export_config.json` | Configures export limits, market value divisor, unknown value, score mode, score range, and future override hooks. |
| `Model/scripts/export_web_ready_generated.py` | New offline generated-data export script. |
| `src/data/generated/players.generated.json` | New active generated player data. |
| `src/data/generated/teams.generated.json` | New active generated team data. |
| `src/data/generated/metadata.generated.json` | New generated export metadata. |
| `docs/data-integration/12_adapter_cleanup_score_calibration_report.md` | This report. |

## Files Changed

| File | Change |
| --- | --- |
| `src/data/generatedData.js` | Updated imports from `.sample.json` to `.generated.json`. |

## Preserved Files

The old sample files remain preserved:

```text
src/data/generated/players.sample.json
src/data/generated/teams.sample.json
src/data/generated/metadata.sample.json
```

`src/data/mockData.js` also remains preserved and inactive.

## Generated JSON Status

New files were created:

```text
src/data/generated/players.generated.json
src/data/generated/teams.generated.json
src/data/generated/metadata.generated.json
```

`src/data/generatedData.js` now imports:

```js
import players from "./generated/players.generated.json";
import teams from "./generated/teams.generated.json";
```

## Export Counts

| Item | Count |
| --- | --- |
| Dataset rows read | 20,744 |
| Dataset columns read | 136 |
| Players exported | 500 |
| Teams exported | 90 |
| Export limit | 500 |
| Sample limit preserved in config | 50 |

Validation checks:

- Required player top-level keys are present.
- Required team top-level keys are present.
- No duplicate generated player IDs were found.
- Every generated `player.teamId` resolves to a generated team.
- `.sample.json` files still exist.

## Score Calibration

Old sample `aiQualityScore` range:

```text
3401-5017
```

New generated `aiQualityScore` range:

```text
3000-5200
```

Configured score mode:

```text
v1_percentile_calibrated
```

Formula:

1. Generate the same six `aiScores` categories on a 0-99 scale:
   - `attack`
   - `playmaking`
   - `dribbling`
   - `defense`
   - `physicality`
   - `discipline`
2. Compute each player raw average category score.
3. Rank selected exported players by raw average score.
4. Convert percentile rank into the configured range:

```text
aiQualityScore = scoreRange.min + percentile * (scoreRange.max - scoreRange.min)
```

5. Round to integer and clamp within:

```text
3000 <= aiQualityScore <= 5200
```

Current generated distribution:

| Threshold | Count |
| --- | --- |
| `>= 4800` | 88 |
| `>= 4200` | 224 |

This keeps the already-polished UI thresholds meaningful while making calibration an adapter/export concern.

Important:

- This remains a transparent `v1 UI score`.
- It is not model confidence.
- No `.pkl` model files were loaded or connected.

## Team and League Display Rules

Canonical grouping continues to use:

| Concept | Column |
| --- | --- |
| Team key | `Team` |
| League key | `League` |

Display names are generated from canonical slug-like keys:

| Input example | Display output example |
| --- | --- |
| `manchester_city` | `Manchester City` |
| `Ingiltere_premier_league` | `Ingiltere Premier League` |
| `fc_bayern_munchen` | `FC Bayern Munchen` |

Config override hooks are available:

```json
"teamDisplayOverrides": {},
"leagueDisplayOverrides": {},
"countryOverrides": {},
"nationalityOverrides": {}
```

Remaining ambiguity:

- The script intentionally does not rely blindly on `Takim_Adi` or `Turnuva_Ligi` because previous auditing found mismatches.
- Some display names still need curated overrides for accents and local spelling.

## Remaining Unknown Fields

These remain unresolved unless future config/data/model output provides them:

- `player.nationality` unless configured in `nationalityOverrides`.
- `team.country` unless configured in `countryOverrides`.
- `rawMetrics.Overview.Appearances`.
- `rawMetrics.Overview.Matches Started`.
- `rawMetrics.Attack & Shooting.Penalty Goals`.
- `rawMetrics.Playmaking & Passing.Total Passes`.
- `rawMetrics.Physicality & Duels.Total Contest`.
- `futureProjection.marketValue` and `futureProjection.aiQualityScore` until model output exists.

Metadata warnings currently include:

- No `nationalityOverrides` configured.
- No `countryOverrides` configured.
- Future projections remain zero placeholders because no model output is connected.

## Build Verification

Command run:

```text
npm.cmd run build
```

Result:

- Build passed.
- Vite emitted a chunk-size warning. The JS bundle is larger because the active generated player export increased from 50 to 500 players.
- Vite emitted the existing Tailwind plugin timing warning.

No build-breaking runtime/data-shape issues were found.

## Recommended Next Step

Add curated config overrides before touching model integration:

- Add team display overrides for accents/spelling.
- Add league display overrides for cleaner league names.
- Add country overrides by team or league if trusted.
- Add nationality overrides only from a trusted source.
- Decide whether unresolved metrics can be safely sourced or should stay unavailable.
- Later, export real future projections from an offline model-output file, not by loading `.pkl` files in React.

