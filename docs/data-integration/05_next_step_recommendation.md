# Next Step Recommendation

## Recommended Integration Approach

Use a web-ready static JSON layer first, then move to a backend API only after the shape is stable.

Reasoning:

- The current React UI already expects small, nested objects (`players`, `teams`) rather than raw tabular rows.
- The main CSV is large and should not be imported into React.
- The `.pkl` model files should not be loaded in React.
- A static JSON export lets the frontend keep its current contract while the model/data side builds a clean adapter.

Recommended first integration target:

```text
Model CSV / model outputs
  -> offline Python adapter script
  -> public or src-safe JSON files
  -> existing React props shape
```

Do not connect this yet; this is the safest next implementation step after documentation review.

## Recommended Web-Ready Data Files

Create generated, lightweight files such as:

```text
src/data/generated/players.json
src/data/generated/teams.json
src/data/generated/metadata.json
```

Alternative if using a backend later:

```text
GET /api/players
GET /api/players/:id
GET /api/teams
GET /api/dashboard-summary
```

Suggested `players.json` shape should mirror the current `players` export:

```js
[
  {
    id: "stable-player-id",
    name: "Player Name",
    age: 21,
    position: "Attacking Midfield",
    nationality: "UNKNOWN",
    foot: "Right",
    teamId: "stable-team-id",
    aiQualityScore: 8750,
    aiScores: {
      attack: 86,
      playmaking: 96,
      dribbling: 91,
      defense: 61,
      physicality: 72,
      discipline: 88
    },
    summary: "...",
    aiReport: {
      strengths: ["..."],
      weaknesses: ["..."],
      developmentAreas: ["..."],
      aiComment: "..."
    },
    rawMetrics: [
      {
        category: "Overview",
        metrics: [{ label: "Goals", value: 11 }]
      }
    ],
    marketValueHistory: [{ month: "PD_25_Yaz", value: 43.8 }],
    futureProjection: [{ season: "2026/27", aiQualityScore: 8920, marketValue: 52.5 }]
  }
]
```

Suggested `teams.json` shape should mirror the current `teams` export:

```js
[
  {
    id: "stable-team-id",
    name: "Team Name",
    league: "League Name",
    country: "UNKNOWN",
    primaryColor: "#334155",
    secondaryColor: "#0f172a",
    badge: "TM"
  }
]
```

## Static JSON First vs Backend API

Recommendation: static JSON first.

Why:

- It avoids introducing API state, server deployment, auth, and caching before the data contract is proven.
- It can be generated from Python without changing UI components.
- It keeps model loading outside the browser.
- It makes review easy because generated JSON can be diffed and validated.

When to switch to a backend API:

- Predictions need to be recalculated on demand.
- Users need filtering over very large datasets.
- The app needs live refresh, permissions, or private model execution.
- Model artifacts need to stay server-only, which they should for production.

## Proposed Adapter Responsibilities

The adapter should:

- Read the processed dataset outside React.
- Optionally read model prediction outputs outside React.
- Produce stable `player.id` and `team.id` values.
- Choose canonical columns for `Team` vs `Takim_Adi` and `League` vs `Turnuva_Ligi`.
- Format raw metrics into the current `[{ category, metrics }]` structure.
- Normalize derived category scores to 0-99.
- Normalize `aiQualityScore` to the current 0-10000-ish UI range, or document a new range before UI changes.
- Generate template text for `summary` and `aiReport`.
- Fill unresolved fields with `"UNKNOWN"` rather than guessing.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Raw CSV columns do not exactly match UI labels | Some displayed stats may be misleading | Keep a reviewed mapping table and mark weak matches as `UNKNOWN`. |
| `PD_Guncel` units are not confirmed | Value display could show wrong scale | Confirm units before formatting as `EUR XM`. |
| Model target is not confirmed | Predicted value and quality index could be conflated | Inspect model training scripts in a later task before using predictions. |
| Multiple team/league columns exist | Duplicates or wrong joins | Choose canonical columns after sampling source values in a controlled data task. |
| Missing nationality/team country | Profile or dashboard fields remain incomplete | Use `UNKNOWN` or add a trusted enrichment/config file. |
| Derived score formulas are subjective | AI cards/radar may look authoritative without validation | Version scoring formulas and keep them transparent. |
| Current UI assumes all nested fields exist | Bad generated JSON could crash pages | Add schema validation before swapping data source. |

## Suggested Next Task

Build an offline data adapter design document or prototype script that reads only a small sample of `engineered_master_dataset_high_r2.csv` and emits draft `players.json` / `teams.json` matching the documented frontend shape.

Before implementing real integration, confirm:

- Canonical player/team/league columns.
- Market value units.
- Model prediction target and expected output columns.
- Score formulas for `aiQualityScore` and `aiScores`.
- How to handle missing `nationality`, `country`, `matchesStarted`, `penaltyGoals`, `totalPasses`, and `totalContest`.

