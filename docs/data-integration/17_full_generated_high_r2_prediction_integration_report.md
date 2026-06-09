# Full Generated High-R2 Prediction Integration Report

## Summary

The active generated web data now includes all eligible unique players from the high-R2 dataset and each generated player has a `marketEstimate` object from the offline high-R2 benchmark model.

The `.pkl` model was loaded only in Python/offline model code. No `.pkl` file or CSV file is imported into React. No backend/API was added. `src/data/mockData.js` was not reconnected.

## Files Changed

| File | Change |
| --- | --- |
| `Model/config/web_export_config.json` | Raised `exportLimit` from `500` to `10000` so all eligible unique players can be exported. |
| `Model/scripts/export_high_r2_benchmark_predictions.py` | Added offline prediction exporter that loads `elite_stacking_model_high_r2.pkl`, generates benchmark estimates, writes prediction JSON, enriches players, and updates metadata. |
| `src/data/generated/players.generated.json` | Regenerated to 7,105 players and enriched with `marketEstimate`. |
| `src/data/generated/teams.generated.json` | Regenerated to 308 teams. |
| `src/data/generated/metadata.generated.json` | Regenerated/updated with full export and high-R2 benchmark prediction metadata. |
| `src/data/generated/predictions.high_r2_benchmark.generated.json` | Added offline prediction output and summary statistics. |
| `src/pages/PlayerProfile.jsx` | Added a compact `AI Market Estimate` display to the existing player hero metrics area. |
| `docs/data-integration/17_full_generated_high_r2_prediction_integration_report.md` | Added this report. |

## Generated Data Counts

| Item | Previous | Current |
| --- | ---: | ---: |
| Players | 500 | 7,105 |
| Teams | 90 | 308 |
| Players with `marketEstimate` | 0 | 7,105 |
| Duplicate player ids | 0 | 0 |

The high-R2 dataset contains:

| Item | Count |
| --- | ---: |
| Dataset rows | 20,744 |
| Eligible rows | 20,744 |
| Eligible unique `Oyuncu_ID` values | 7,105 |

All eligible unique players were exported. The export metadata warning says only 7,105 eligible unique players were available for the configured `exportLimit` of 10,000, which is expected.

## Prediction Generation

Offline script run:

```text
Model/scripts/export_high_r2_benchmark_predictions.py
```

Model used:

```text
Model/models/elite_stacking_model_high_r2.pkl
```

Prediction output:

```text
src/data/generated/predictions.high_r2_benchmark.generated.json
```

Join key:

```text
Oyuncu_ID
```

Coverage:

| Item | Count |
| --- | ---: |
| Players requested | 7,105 |
| Players predicted | 7,105 |
| Players missing prediction | 0 |

Prediction output scale:

- Model output: raw EUR.
- Frontend display field: EUR millions via `predictedMarketValueMillions`.
- Player field added: `players[*].marketEstimate`.

## Prediction Summary

| Metric | Min | Max | Mean |
| --- | ---: | ---: | ---: |
| Predicted market value EUR | 27,366 | 197,377,743 | 5,923,690.71 |
| Actual market value EUR | 25,000 | 200,000,000 | 6,069,756.51 |

Average absolute valuation gap:

| Scale | Value |
| --- | ---: |
| EUR | 431,684.27 |
| EUR millions | 0.43 |

## Largest Positive Valuation Gaps

| Player | Team | Actual EUR | Estimate EUR | Gap EUR | Gap % |
| --- | --- | ---: | ---: | ---: | ---: |
| Manuel Ugarte | `manchester-united` | 30,000,000 | 46,870,395 | 16,870,395 | 56.2 |
| Jorthy Mokio | `afc-ajax` | 8,000,000 | 21,601,877 | 13,601,877 | 170.0 |
| Jesper Lindstrøm | `vfl-wolfsburg` | 5,000,000 | 17,590,649 | 12,590,649 | 251.8 |
| Mika Biereth | `as-monaco` | 18,000,000 | 30,319,550 | 12,319,550 | 68.4 |
| Conrad Jaden Egan-Riley | `olympique-de-marseille` | 10,000,000 | 20,591,705 | 10,591,705 | 105.9 |
| Filip Jørgensen | `chelsea` | 15,000,000 | 24,613,152 | 9,613,152 | 64.1 |
| Maroan Sannadi | `athletic-club` | 5,000,000 | 14,535,170 | 9,535,170 | 190.7 |
| Nuno Tavares | `lazio` | 13,000,000 | 21,951,214 | 8,951,214 | 68.9 |
| Kosta Nedeljković | `rb-leipzig` | 6,000,000 | 14,339,762 | 8,339,762 | 139.0 |
| Joel Roca | `girona-fc` | 5,000,000 | 13,218,929 | 8,218,929 | 164.4 |

## Largest Negative Valuation Gaps

| Player | Team | Actual EUR | Estimate EUR | Gap EUR | Gap % |
| --- | --- | ---: | ---: | ---: | ---: |
| Lamine Yamal | `fc-barcelona` | 200,000,000 | 73,367,600 | -126,632,400 | -63.3 |
| Lennart Karl | `fc-bayern-munchen` | 60,000,000 | 3,357,168 | -56,642,832 | -94.4 |
| Michael Olise | `fc-bayern-munchen` | 140,000,000 | 85,197,766 | -54,802,234 | -39.1 |
| Christian Kofane | `bayer-04-leverkusen` | 40,000,000 | 4,309,069 | -35,690,931 | -89.2 |
| Joaquin Panichelli | `rc-strasbourg` | 35,000,000 | 8,027,080 | -26,972,920 | -77.1 |
| Vitinha | `paris-saintgermain` | 110,000,000 | 83,092,946 | -26,907,054 | -24.5 |
| Nathan De Cat | `rsc-anderlecht` | 25,000,000 | 2,089,937 | -22,910,063 | -91.6 |
| Nico Paz | `como` | 65,000,000 | 43,949,280 | -21,050,720 | -32.4 |
| Honest Ahanor | `atalanta` | 25,000,000 | 4,729,651 | -20,270,349 | -81.1 |
| Robin Risser | `rc-lens` | 25,000,000 | 5,358,457 | -19,641,543 | -78.6 |

## Player Field Added

Each active generated player now has:

```json
{
  "displayLabel": "AI Market Estimate",
  "predictedMarketValueEur": 197377743,
  "predictedMarketValueMillions": 197.38,
  "valuationGapEur": -2622257,
  "valuationGapMillions": -2.62,
  "valuationGapPercent": -1.3,
  "valuationLabel": "fair_value_range",
  "modelVersion": "high_r2_benchmark",
  "riskNote": "Market-aware benchmark estimate"
}
```

Existing fields were preserved:

- `marketValueHistory`
- `aiQualityScore`
- `aiScores`
- `rawMetrics`
- `futureProjection`

## Metadata Updates

`src/data/generated/metadata.generated.json` now includes:

```text
highR2BenchmarkPrediction.modelPath
highR2BenchmarkPrediction.predictionFile
highR2BenchmarkPrediction.coverage
highR2BenchmarkPrediction.predictionOutputScale
highR2BenchmarkPrediction.frontendValueScale
highR2BenchmarkPrediction.warning
highR2BenchmarkPrediction.modelLoadLocation
```

The metadata confirms:

```text
Offline Python script only; no .pkl file is loaded in React.
```

## UI Change

Changed UI file:

```text
src/pages/PlayerProfile.jsx
```

Minimal display added:

- Label: `AI Market Estimate`
- Predicted value: `EUR XM`
- Valuation gap: signed `YM` and percentage
- Note: `Market-aware benchmark estimate`

The existing future projection panel was not changed.

## Future Projection Status

Future projections were not faked.

Check result:

| Item | Count |
| --- | ---: |
| Non-zero future projection entries | 0 |

The profile forecast still shows the pending state until real future-model output exists.

## Build Result

Command run:

```text
npm.cmd run build
```

Result:

- Build passed.
- Vite emitted a chunk-size warning.
- Tailwind plugin timing warning was emitted.

Generated bundle size after expanding to all players:

```text
dist/assets/index-D0oge2Oz.js: 27,674.69 kB
gzip: 2,148.18 kB
```

## Dependency And Model-Load Notes

The first prediction attempt failed because Python ML dependencies were missing:

```text
joblib
sklearn
xgboost
catboost
lightgbm
```

Approved install command was run for the bundled Python runtime:

```text
python -m pip install joblib scikit-learn xgboost catboost lightgbm
```

Prediction generation then succeeded.

Warnings encountered:

- The model was trained/pickled with scikit-learn `1.8.0`.
- The installed runtime has scikit-learn `1.9.0`.
- scikit-learn emitted `InconsistentVersionWarning` during unpickle.
- LightGBM emitted a feature-name warning.
- joblib emitted a physical-core detection warning and used logical cores.

These warnings did not block prediction generation, but they should be treated as a model reproducibility limitation.

## Confirmations

- `src/data/generatedData.js` still imports generated JSON.
- `src/data/mockData.js` was not reconnected.
- No CSV file is imported into React.
- No `.pkl` file is imported into React.
- No backend/API was added.
- The high-R2 model is labeled as a market-aware benchmark estimate.
- Future projections remain pending.
- Old benchmark model files remain preserved.

## Remaining Limitations

- The high-R2 model uses historical market-value-derived features, so this should be presented as a market-aware benchmark estimate, not a clean future forecast.
- The JavaScript bundle is now very large because all 7,105 generated players are embedded directly in frontend JSON.
- `player.nationality` and `team.country` still depend on unresolved override/enrichment work.
- The current prediction integration is batch/offline only.
- Model reproducibility should be improved by pinning the original training dependency versions, especially scikit-learn.
