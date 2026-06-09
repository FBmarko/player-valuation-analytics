# AI Agent Task 3 — Adapter Cleanup and Score Calibration

## Context

The frontend now directly uses generated JSON data through:

```text
src/data/generatedData.js
```

Current active generated files:

```text
src/data/generated/players.sample.json
src/data/generated/teams.sample.json
src/data/generated/metadata.sample.json
```

The previous UI polish task fixed visible issues from generated data:

* `UNKNOWN` values are displayed more gracefully.
* Zero future projections are shown as pending instead of real forecasts.
* Generated-score thresholds were adjusted in the UI.
* Build passes.

Relevant documentation:

```text
docs/data-integration/06_dataset_sample_audit.md
docs/data-integration/07_web_ready_adapter_contract.md
docs/data-integration/08_score_formula_v1.md
docs/data-integration/09_sample_export_validation.md
docs/data-integration/10_direct_generated_data_swap_report.md
docs/data-integration/11_generated_data_ui_polish_report.md
```

Main dataset:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

Existing script:

```text
Model/scripts/export_web_ready_sample.py
```

Do not connect model files yet.

Do not load:

```text
Model/models/*.pkl
```

---

## Main Goal

Upgrade the offline generated-data adapter so the app can consume a cleaner, more stable generated data layer.

Create production-style generated JSON files while preserving the old sample files.

New generated outputs should be:

```text
src/data/generated/players.generated.json
src/data/generated/teams.generated.json
src/data/generated/metadata.generated.json
```

The app should then use these new `.generated.json` files through `src/data/generatedData.js`.

---

## Important Rules

* Do not reconnect `src/data/mockData.js`.
* Do not delete `src/data/mockData.js`.
* Do not delete existing `.sample.json` files.
* Do not import CSV files into React.
* Do not load `.pkl` model files.
* Do not add backend/API.
* Do not redesign the UI.
* Do not perform large React refactors.
* Keep React changes minimal.
* Prefer solving data quality issues in the adapter/export layer.
* If something is uncertain, document it instead of guessing.

---

## Task 1 — Create Export Config

Create:

```text
Model/config/web_export_config.json
```

This config should contain:

```json
{
  "exportLimit": 500,
  "sampleLimit": 50,
  "marketValueDivisor": 1000000,
  "unknownValue": "UNKNOWN",
  "scoreMode": "v1_percentile_calibrated",
  "scoreRange": {
    "min": 3000,
    "max": 5200
  },
  "teamDisplayOverrides": {},
  "leagueDisplayOverrides": {},
  "countryOverrides": {},
  "nationalityOverrides": {}
}
```

Purpose:

* Keep export parameters outside Python code.
* Allow later manual team/league/country/nationality curation without changing script logic.
* Keep score calibration transparent.

---

## Task 2 — Create Cleaner Generated Export Script

Create a new script instead of overwriting the old sample script:

```text
Model/scripts/export_web_ready_generated.py
```

The script should:

1. Read:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

2. Read config:

```text
Model/config/web_export_config.json
```

3. Export top eligible unique players.

Default export strategy:

* Deduplicate by `Oyuncu_ID`.
* Prefer rows with valid `PD_Guncel`.
* Sort primarily by `PD_Guncel` descending.
* Export up to `exportLimit` players.
* Keep sample export compatibility by also allowing `sampleLimit`.

4. Generate:

```text
src/data/generated/players.generated.json
src/data/generated/teams.generated.json
src/data/generated/metadata.generated.json
```

5. Preserve the same frontend data shape already validated:

* `players[*].id`
* `players[*].name`
* `players[*].age`
* `players[*].position`
* `players[*].nationality`
* `players[*].foot`
* `players[*].teamId`
* `players[*].aiQualityScore`
* `players[*].aiScores`
* `players[*].summary`
* `players[*].aiReport`
* `players[*].rawMetrics`
* `players[*].marketValueHistory`
* `players[*].futureProjection`

and:

* `teams[*].id`
* `teams[*].name`
* `teams[*].league`
* `teams[*].country`
* `teams[*].primaryColor`
* `teams[*].secondaryColor`
* `teams[*].badge`

---

## Task 3 — Improve Team and League Display Names

Current canonical grouping uses:

```text
Team
League
```

Continue using them as canonical keys.

However, improve display names:

* Convert slug-like values such as `manchester_city` to `Manchester City`.
* Convert `Ingiltere_premier_league` to `Ingiltere Premier League` or a nicer display if obvious.
* Apply `teamDisplayOverrides` and `leagueDisplayOverrides` from config when present.
* Do not rely blindly on `Takim_Adi` or `Turnuva_Ligi`, because previous audit found mismatches.

Document any remaining ambiguity.

---

## Task 4 — Move Score Calibration Into Adapter

Current UI thresholds were adjusted because generated `aiQualityScore` range was low.

In this task, generate more stable adapter-side v1 scores.

Use the same six category scores:

```text
attack
playmaking
dribbling
defense
physicality
discipline
```

Category scores should remain:

```text
0-99
```

For `aiQualityScore`, use percentile-calibrated v1 UI score.

Recommended approach:

1. Compute raw category scores.
2. Compute raw average category score.
3. Rank players by raw average category score using percentile.
4. Convert percentile to configured range:

```text
aiQualityScore = scoreRange.min + percentile * (scoreRange.max - scoreRange.min)
```

5. Round to integer.
6. Clamp within configured range.

Example:

```text
scoreRange.min = 3000
scoreRange.max = 5200
```

This keeps generated scores aligned with the current UI polish thresholds without pretending they are real model predictions.

Important:

* Document clearly that this is still `v1 UI score`.
* Do not call this real model confidence.
* Do not connect `.pkl` model files yet.

---

## Task 5 — Improve Metadata

`metadata.generated.json` should include:

```json
{
  "generatedAt": "...",
  "sourceDataset": "Model/data/processed/engineered_master_dataset_high_r2.csv",
  "rowCountRead": 20744,
  "columnCountRead": 136,
  "playersExported": 500,
  "teamsExported": 0,
  "exportLimit": 500,
  "canonicalColumns": {
    "playerId": "Oyuncu_ID",
    "playerName": "İsim",
    "teamKey": "Team",
    "leagueKey": "League",
    "position": "TM_Sub_Position",
    "positionFallback": "TM_Position",
    "currentMarketValue": "PD_Guncel"
  },
  "marketValueUnit": "raw EUR divided by 1,000,000 for frontend EUR millions",
  "scoreMode": "v1_percentile_calibrated",
  "scoreRange": {
    "min": 3000,
    "max": 5200
  },
  "unknownFields": [],
  "warnings": [],
  "modelStatus": "No .pkl model files were loaded or connected.",
  "frontendStatus": "Frontend imports generated JSON via src/data/generatedData.js"
}
```

Include real counts and warnings.

---

## Task 6 — Update Frontend Generated Data Adapter

Update:

```text
src/data/generatedData.js
```

So it imports:

```text
src/data/generated/players.generated.json
src/data/generated/teams.generated.json
```

instead of the `.sample.json` files.

Do not reconnect `mockData.js`.

Do not change app design.

---

## Task 7 — Documentation Report

Create:

```text
docs/data-integration/12_adapter_cleanup_score_calibration_report.md
```

Include:

1. Which files were created.
2. Which files were changed.
3. Whether `.sample.json` files are preserved.
4. Whether `.generated.json` files were created.
5. Export count:

   * players exported
   * teams exported
6. Score calibration:

   * old range if known
   * new range
   * formula used
7. Team/league display-name rules.
8. Unknown fields still remaining.
9. Whether build passed.
10. Recommended next step.

---

## Task 8 — Build Verification

Run:

```text
npm.cmd run build
```

If PowerShell blocks `npm`, use:

```text
npm.cmd run build
```

Document result in the report.

---

## Expected Final State

After this task:

* App still uses generated data.
* App now uses `.generated.json`, not `.sample.json`.
* `.sample.json` files remain preserved.
* `mockData.js` remains preserved but inactive.
* Score calibration is handled in the export layer.
* Metadata explains the score mode.
* Build passes.
* No model/backend integration is added.
