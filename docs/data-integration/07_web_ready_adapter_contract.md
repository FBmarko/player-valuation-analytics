# Web-Ready Adapter Contract

This contract defines the generated sample JSON files produced by:

```text
Model/scripts/export_web_ready_sample.py
```

Generated outputs:

```text
src/data/generated/players.sample.json
src/data/generated/teams.sample.json
src/data/generated/metadata.sample.json
```

These files are not connected to the React frontend yet. Existing frontend imports still use `src/data/mockData.js`.

## Contract Goals

- Mirror the current `players` and `teams` mock export shapes.
- Keep large CSV and model files outside React.
- Fill unresolved fields with `"UNKNOWN"`.
- Use generated placeholders for future/model-only sections.
- Keep JSON lightweight enough for a safe sample import test later.

## `players.sample.json`

Top-level type:

```ts
Player[]
```

Required player structure:

```json
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
```

## Player Field Sources

| JSON field | Source / generation rule |
| --- | --- |
| `id` | `slug(İsim) + "-" + clean(Oyuncu_ID)` |
| `name` | `İsim` |
| `age` | Derived from `TM_Date_Of_Birth` using reference date `2026-06-08`; `"UNKNOWN"` if not parseable |
| `position` | `TM_Sub_Position`, fallback `TM_Position` |
| `nationality` | `"UNKNOWN"` |
| `foot` | `TM_Foot` normalized to `Right`, `Left`, `Both`, or `"UNKNOWN"` |
| `teamId` | slug from canonical `Team` |
| `aiQualityScore` | v1 UI scoring formula, 0-10000 approximate scale |
| `aiScores` | v1 UI category formulas, 0-99 scale |
| `summary` | deterministic template from player, team, position, and top score |
| `aiReport` | deterministic template from score ranking |
| `rawMetrics` | label/value groups matching current mock shape |
| `marketValueHistory` | `PD_23_Yaz`, `PD_23_Kis`, `PD_24_Yaz`, `PD_24_Kis`, `PD_25_Yaz`, `PD_Guncel`; values divided by 1,000,000 |
| `futureProjection` | placeholder seasons with `0` values; no model connected |

## `teams.sample.json`

Top-level type:

```ts
Team[]
```

Required team structure:

```json
{
  "id": "stable-team-id",
  "name": "Team Name",
  "league": "League Name",
  "country": "UNKNOWN",
  "primaryColor": "#334155",
  "secondaryColor": "#0f172a",
  "badge": "TM"
}
```

## Team Field Sources

| JSON field | Source / generation rule |
| --- | --- |
| `id` | slug from canonical `Team` |
| `name` | display name derived from `Team`; `Takim_Adi` used only when compatible with `Team` |
| `league` | display name derived from `League` |
| `country` | `"UNKNOWN"` |
| `primaryColor` | default frontend config placeholder `#334155` |
| `secondaryColor` | default frontend config placeholder `#0f172a` |
| `badge` | generated initials from team display name |

## `metadata.sample.json`

Required metadata structure:

```json
{
  "generatedAt": "2026-06-08T00:00:00+00:00",
  "sourceDataset": "Model/data/processed/engineered_master_dataset_high_r2.csv",
  "sampleStrategy": "Top 50 unique players by PD_Guncel, then player name and Oyuncu_ID.",
  "rowCountRead": 20744,
  "columnCountRead": 136,
  "playersExported": 50,
  "teamsExported": 16,
  "canonicalColumns": {
    "playerId": "Oyuncu_ID",
    "playerName": "İsim",
    "teamKey": "Team",
    "teamName": "Team-derived display name; Takim_Adi used only when compatible with Team",
    "leagueKey": "League",
    "leagueName": "League-derived display name; Turnuva_Ligi kept as observed competition label only",
    "position": "TM_Sub_Position",
    "positionFallback": "TM_Position",
    "currentMarketValue": "PD_Guncel"
  },
  "marketValueUnit": "Dataset values appear to be raw EUR numeric amounts; JSON values are divided by 1,000,000 for EUR millions.",
  "scoreFormula": "v1 UI scoring formulas ...",
  "unknownFields": ["player.nationality"],
  "modelStatus": "No .pkl model files were loaded or connected.",
  "frontendStatus": "Generated JSON only; frontend imports still use src/data/mockData.js."
}
```

## Compatibility With Current Mock Data

The generated JSON intentionally matches the current mock data shape:

| Mock export field | Generated JSON status |
| --- | --- |
| `players[*].id` | Present |
| `players[*].name` | Present |
| `players[*].age` | Present, or `"UNKNOWN"` |
| `players[*].position` | Present |
| `players[*].nationality` | Present as `"UNKNOWN"` |
| `players[*].foot` | Present |
| `players[*].teamId` | Present and resolves to `teams[*].id` |
| `players[*].aiQualityScore` | Present |
| `players[*].aiScores` | Present with same six keys |
| `players[*].summary` | Present |
| `players[*].aiReport` | Present |
| `players[*].rawMetrics` | Present with same category labels |
| `players[*].marketValueHistory` | Present |
| `players[*].futureProjection` | Present |
| `teams[*].id` | Present |
| `teams[*].name` | Present |
| `teams[*].league` | Present |
| `teams[*].country` | Present as `"UNKNOWN"` |
| `teams[*].primaryColor` | Present |
| `teams[*].secondaryColor` | Present |
| `teams[*].badge` | Present |

## Known Non-Final Contract Parts

- `futureProjection` values are placeholders.
- `summary` and `aiReport` are deterministic sample templates, not final scout reports.
- `aiScores` and `aiQualityScore` are v1 UI scores, not final model science.
- `country`, `nationality`, appearances, starts, penalty goals, total passes, and total contest remain unresolved.
- Team and league display names derived from slug columns may need a curated display-name map before production.

