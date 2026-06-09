# Generated Data UI Polish Report

## Summary

The app still uses generated JSON through:

```text
src/data/generatedData.js
```

This pass fixes visible data-quality issues caused by the generated JSON swap without reconnecting mock data, importing CSV into React, loading `.pkl` model files, adding a backend, or redesigning the UI.

## Files Changed

| File | Change |
| --- | --- |
| `src/pages/Home.jsx` | Added generated-score elite threshold and graceful team-country fallback. |
| `src/pages/PlayerProfile.jsx` | Added graceful unavailable-value display, pending forecast state, generated-score tier thresholds, and less misleading v1 score language. |
| `src/components/GlowingAvatar.jsx` | Adjusted score glow thresholds to match generated v1 score range. |
| `docs/data-integration/11_generated_data_ui_polish_report.md` | Added this report. |

No generated JSON files were edited.

## UNKNOWN Handling

Visible `"UNKNOWN"` values are now softened at render time.

| UI area | Previous display | New display |
| --- | --- | --- |
| Player profile `Nation` | `UNKNOWN` | `Unconfirmed` |
| Player profile `Foot` fallback | `UNKNOWN` if ever missing | `Not available` |
| Team country in dashboard portfolio cards | `UNKNOWN` | `Country unconfirmed` |
| Scout metric cards/rows | `UNKNOWN` | `Not available` with muted text styling |

No nationality or country values were invented.

## Zero Future Projection Handling

Generated sample `futureProjection` values are all zero because model output is not connected yet.

The profile forecast panel now detects this condition:

```js
projection.every((season) => season.aiQualityScore === 0 && season.marketValue === 0)
```

When no projection data exists, the UI no longer renders misleading rows like:

```text
AI Index 0
EUR 0.0M
```

Instead, it shows a placeholder state:

```text
Forecast pending
Model projection not connected yet
Future AI index and market value forecasts will appear once model output is exported.
```

## AI Quality Score Threshold Adjustment

The generated sample score range is:

| Metric | Value |
| --- | --- |
| Minimum `aiQualityScore` | 3401 |
| Maximum `aiQualityScore` | 5017 |
| Players at or above 4800 | 6 |
| Players at or above 4200 | 33 |

The app now keeps raw generated `aiQualityScore` values but uses generated-data-aware thresholds:

| Tier / use | Previous threshold | New threshold |
| --- | --- | --- |
| Dashboard `Elite AI profiles` | `>= 8000` | `>= 4800` |
| Player profile `Elite Buy Signal` | `>= 8200` | `>= 4800` |
| Player profile `High Upside Watch` | `>= 7000` | `>= 4200` |
| Avatar emerald glow | `>= 8000` | `>= 4800` |
| Avatar amber glow | `>= 6500` | `>= 4200` |

This keeps the dashboard meaningful without modifying the generated JSON or pretending the v1 scores are model predictions.

The profile score badge now says:

```text
Source: v1 UI score
```

instead of showing a fake model confidence value.

## Dashboard Status

Dashboard remains connected to generated data.

Verification:

- `src/App.jsx` still imports from `./data/generatedData`.
- 50 generated players are available.
- 16 generated teams are available.
- Top prospects still sort by `aiQualityScore`.
- `Elite AI profiles` is no longer visually empty; 6 generated players meet the adjusted `>= 4800` threshold.
- Team country placeholders now read `Country unconfirmed` instead of `UNKNOWN`.

## Player Profile Status

Player profile remains connected to generated data.

Visible improvements:

- `Nation` now shows `Unconfirmed`.
- Missing statistical metrics now show `Not available`.
- Zero model forecasts are replaced by a clear pending state.
- Score tier labels and avatar glow now produce meaningful output for the generated score range.
- AI category scores and radar remain unchanged and continue to use the generated `aiScores` values.

## Build Verification

Command run:

```text
npm.cmd run build
```

Result:

- Build passed.
- Vite emitted the existing chunk-size warning.
- Vite emitted the existing Tailwind plugin timing warning.

Note:

- Running a Vite build writes output to `dist/`. No manual edits were made to `dist/`.

## Remaining Unresolved Data Issues

The following are still real data gaps and should be solved upstream in the adapter/data layer, not guessed in React:

- Player nationality.
- Team country.
- Appearances.
- Matches started.
- Penalty goals.
- Total passes.
- Total contest.
- Real future market value projections.
- Real future AI index projections.
- Final calibrated `aiQualityScore` formula.
- Team/league display-name curation.

## Recommended Next Step

Update the offline export process to produce cleaner web-ready data:

- Add trusted enrichment/config for nationality and country if available.
- Decide whether appearances can safely use a real dataset column.
- Add a non-model placeholder policy directly to generated metadata for future projections.
- Calibrate `aiQualityScore` in the adapter rather than relying on UI thresholds long term.
- Export real future projection fields only after model output is available outside React.

