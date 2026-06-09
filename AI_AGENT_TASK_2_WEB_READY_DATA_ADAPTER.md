# AI Agent Task 2 — Web-Ready Data Adapter Planning and Sample Export

## Context

The frontend currently uses fake data from:

* `src/data/mockData.js`

Previous analysis documents were created under:

* `docs/data-integration/01_mock_data_inventory.md`
* `docs/data-integration/02_frontend_data_shapes.md`
* `docs/data-integration/03_ui_data_requirement_map.md`
* `docs/data-integration/04_dataset_column_mapping.md`
* `docs/data-integration/05_next_step_recommendation.md`

The main real dataset is:

* `Model/data/processed/engineered_master_dataset_high_r2.csv`

The frontend expects small nested `players` and `teams` objects, not raw CSV rows.

Do not modify the UI yet.

---

## Main Goal

Create a safe first bridge between the real CSV dataset and the existing frontend data shape.

The goal is to produce generated sample JSON files that mirror the current mock data structure.

Do not replace the frontend imports yet.

Do not connect the `.pkl` model yet.

Do not load model files into React.

---

## Must Not Do

* Do not modify UI components.
* Do not refactor React pages.
* Do not replace `src/data/mockData.js` yet.
* Do not import CSV files into React.
* Do not import `.pkl` files into React.
* Do not touch `node_modules`.
* Do not touch `dist`.
* Do not delete or rename files.
* Do not train a model.
* Do not guess missing data; use `"UNKNOWN"`.

---

## Files to Read

Read these documents first:

* `docs/data-integration/01_mock_data_inventory.md`
* `docs/data-integration/02_frontend_data_shapes.md`
* `docs/data-integration/03_ui_data_requirement_map.md`
* `docs/data-integration/04_dataset_column_mapping.md`
* `docs/data-integration/05_next_step_recommendation.md`

Then inspect the main CSV:

* `Model/data/processed/engineered_master_dataset_high_r2.csv`

Only inspect enough rows to understand values and units. Do not do heavy processing unless needed.

---

## Task 1 — Confirm Dataset Value Samples

Create:

* `docs/data-integration/06_dataset_sample_audit.md`

In this file, report:

1. Dataset shape.
2. First 10 rows preview summary.
3. Example values for:

   * `İsim`
   * `Oyuncu_ID`
   * `Team`
   * `Takim_Adi`
   * `League`
   * `Turnuva_Ligi`
   * `TM_Foot`
   * `TM_Position`
   * `TM_Sub_Position`
   * `PD_Guncel`
   * `PD_23_Yaz`
   * `PD_23_Kis`
   * `PD_24_Yaz`
   * `PD_24_Kis`
   * `PD_25_Yaz`
4. Decide which columns should be canonical:

   * player id
   * player name
   * team name
   * league name
   * position
   * current market value
5. Check whether `PD_Guncel` appears to be in EUR, millions, or raw numeric units.
6. Mark uncertain conclusions clearly.

---

## Task 2 — Design Adapter Contract

Create:

* `docs/data-integration/07_web_ready_adapter_contract.md`

Define the exact generated JSON structure:

* `src/data/generated/players.sample.json`
* `src/data/generated/teams.sample.json`
* `src/data/generated/metadata.sample.json`

The generated `players.sample.json` must mirror the current `players` export shape:

```js
[
  {
    "id": "stable-player-id",
    "name": "Player Name",
    "age": 21,
    "position": "Attacking Midfield",
    "nationality": "UNKNOWN",
    "foot": "Right",
    "teamId": "stable-team-id",
    "aiQualityScore": 8750,
    "aiScores": {
      "attack": 86,
      "playmaking": 96,
      "dribbling": 91,
      "defense": 61,
      "physicality": 72,
      "discipline": 88
    },
    "summary": "...",
    "aiReport": {
      "strengths": ["..."],
      "weaknesses": ["..."],
      "developmentAreas": ["..."],
      "aiComment": "..."
    },
    "rawMetrics": [
      {
        "category": "Overview",
        "metrics": [
          { "label": "Minutes Played", "value": 2746 }
        ]
      }
    ],
    "marketValueHistory": [
      { "month": "PD_23_Yaz", "value": 10.0 },
      { "month": "PD_23_Kis", "value": 12.0 },
      { "month": "PD_24_Yaz", "value": 15.0 },
      { "month": "PD_24_Kis", "value": 18.0 },
      { "month": "PD_25_Yaz", "value": 20.0 },
      { "month": "PD_Guncel", "value": 22.0 }
    ],
    "futureProjection": [
      { "season": "2026/27", "aiQualityScore": 0, "marketValue": 0 },
      { "season": "2027/28", "aiQualityScore": 0, "marketValue": 0 },
      { "season": "2028/29", "aiQualityScore": 0, "marketValue": 0 }
    ]
  }
]
```

The generated `teams.sample.json` must mirror the current `teams` export shape:

```js
[
  {
    "id": "stable-team-id",
    "name": "Team Name",
    "league": "League Name",
    "country": "UNKNOWN",
    "primaryColor": "#334155",
    "secondaryColor": "#0f172a",
    "badge": "TM"
  }
]
```

---

## Task 3 — Define v1 Derived Score Rules

Create:

* `docs/data-integration/08_score_formula_v1.md`

Define transparent v1 formulas for:

* `aiScores.attack`
* `aiScores.playmaking`
* `aiScores.dribbling`
* `aiScores.defense`
* `aiScores.physicality`
* `aiScores.discipline`
* `aiQualityScore`

Important:

* Category scores must be normalized to 0-99.
* `aiQualityScore` must be normalized to approximately 0-10000.
* Use simple percentile or min-max normalization.
* Do not claim these are final football science formulas.
* Mark them as `v1 UI scoring formulas`.
* Use available dataset columns listed in `04_dataset_column_mapping.md`.

Recommended inputs:

Attack:

* `goals`
* `expectedGoals`
* `totalShots`
* `shotsOnTarget`
* `Shot_Conversion_Rate`
* `Goal_Involvement_Per90`

Playmaking:

* `Playmaking_Index`
* `expectedAssists`
* `bigChancesCreated`
* `keyPasses`
* `Deep_Impact_Index`

Dribbling:

* `successfulDribbles`
* `successfulDribblesPercentage`
* `touches`
* `possessionLost`
* `dispossessed`

Defense:

* `Defensive_Action_Volume_Per90`
* `tackles`
* `interceptions`
* `ballRecovery`
* `clearances`
* `outfielderBlocks`

Physicality:

* `Duel_Dominance_Ratio`
* `Aerial_Supremacy_Ratio`
* `groundDuelsWonPercentage`
* `aerialDuelsWonPercentage`
* `TM_Height_cm`

Discipline:

* inverse of:

  * `fouls`
  * `yellowCards`
  * `redCards`
  * `directRedCards`
  * `Error_Liability_Per90`

---

## Task 4 — Create Sample Export Script

Create an offline script:

* `Model/scripts/export_web_ready_sample.py`

This script should:

1. Read `Model/data/processed/engineered_master_dataset_high_r2.csv`.
2. Select a small sample, for example 50 players.
3. Generate stable slugs for `player.id` and `team.id`.
4. Create:

   * `src/data/generated/players.sample.json`
   * `src/data/generated/teams.sample.json`
   * `src/data/generated/metadata.sample.json`
5. Match the frontend data shape documented earlier.
6. Fill missing values with `"UNKNOWN"` where appropriate.
7. Do not modify frontend imports.
8. Do not replace mock data yet.

The generated JSON should be valid and lightweight.

---

## Task 5 — Validation

Create:

* `docs/data-integration/09_sample_export_validation.md`

Document:

1. How many sample players were exported.
2. How many teams were exported.
3. Which fields were filled from dataset.
4. Which fields were generated.
5. Which fields are `"UNKNOWN"`.
6. Any warnings about units, missing values, or ambiguous columns.

---

## Expected Final Summary

After completing the task, summarize:

1. Which canonical columns were selected.
2. Where sample JSON files were generated.
3. Whether the JSON shape matches the current frontend mock structure.
4. Which fields are still unresolved.
5. Whether it is safe to attempt a frontend import swap in the next task.
