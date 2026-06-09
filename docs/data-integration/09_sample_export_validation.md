# Sample Export Validation

Script executed:

```text
Model/scripts/export_web_ready_sample.py
```

Generated files:

```text
src/data/generated/players.sample.json
src/data/generated/teams.sample.json
src/data/generated/metadata.sample.json
```

## Export Counts

| Item | Count |
| --- | --- |
| Dataset rows read | 20,744 |
| Dataset columns read | 136 |
| Sample players exported | 50 |
| Sample teams exported | 16 |
| Duplicate generated player IDs | 0 |
| Player `teamId` values without matching team | 0 |

## Shape Validation

The generated JSON matches the current mock-data surface:

| Shape area | Status |
| --- | --- |
| `players` top-level array | PASS |
| `teams` top-level array | PASS |
| Required player top-level keys | PASS |
| Required team top-level keys | PASS |
| `players[*].aiScores` six category keys | PASS |
| `players[*].aiReport` object | PASS |
| `players[*].rawMetrics` category/metric arrays | PASS |
| `players[*].marketValueHistory` array | PASS |
| `players[*].futureProjection` array | PASS |
| `players[*].teamId` resolves to `teams[*].id` | PASS |

## Fields Filled From Dataset

| JSON field | Dataset source |
| --- | --- |
| `players[*].name` | `İsim` |
| `players[*].id` | `İsim`, `Oyuncu_ID` |
| `players[*].age` | `TM_Date_Of_Birth` |
| `players[*].position` | `TM_Sub_Position`, fallback `TM_Position` |
| `players[*].foot` | `TM_Foot` |
| `players[*].teamId` | `Team` |
| `teams[*].id` | `Team` |
| `teams[*].name` | `Team`-derived display, `Takim_Adi` only when compatible |
| `teams[*].league` | `League`-derived display |
| `rawMetrics` direct metric values | stat columns such as `goals`, `assists`, `minutesPlayed`, `expectedGoals`, `expectedAssists`, etc. |
| `marketValueHistory` | `PD_23_Yaz`, `PD_23_Kis`, `PD_24_Yaz`, `PD_24_Kis`, `PD_25_Yaz`, `PD_Guncel` |

## Fields Generated

| JSON field | Generation rule |
| --- | --- |
| `players[*].id` | player-name slug plus cleaned `Oyuncu_ID` |
| `teams[*].badge` | initials from team display name |
| `teams[*].primaryColor` | default placeholder `#334155` |
| `teams[*].secondaryColor` | default placeholder `#0f172a` |
| `players[*].aiScores` | v1 UI scoring formulas |
| `players[*].aiQualityScore` | scaled average of v1 category scores |
| `players[*].summary` | deterministic template |
| `players[*].aiReport` | deterministic template |
| `players[*].futureProjection` | placeholder seasons with zero values |
| `metadata.sample.json` | export metadata |

## Fields Set To `"UNKNOWN"`

| JSON field / metric | Reason |
| --- | --- |
| `players[*].nationality` | No source column found. |
| `teams[*].country` | No source column found. |
| `rawMetrics -> Overview -> Appearances` | `countRating` exists but is not confirmed as appearances. |
| `rawMetrics -> Overview -> Matches Started` | No source column found. |
| `rawMetrics -> Attack & Shooting -> Penalty Goals` | No exact source column found. |
| `rawMetrics -> Playmaking & Passing -> Total Passes` | Dataset has `accuratePasses`, not confirmed total passes. |
| `rawMetrics -> Physicality & Duels -> Total Contest` | No exact source column found. |

## Warnings

| Warning | Detail |
| --- | --- |
| Market value units | `PD_*` values appear to be raw EUR amounts and are divided by 1,000,000 in JSON. Confirm before production. |
| Team/league ambiguity | `Team`/`League` can disagree with `Takim_Adi`/`Turnuva_Ligi`; the adapter uses `Team` and `League` for canonical grouping. |
| Duplicate player rows | The CSV can contain multiple rows per player; the export keeps 50 unique `Oyuncu_ID` values. |
| v1 scores are uncalibrated | Category scores are transparent UI scores, not final model/scouting outputs. |
| Future projection placeholders | `futureProjection` values are zeros because `.pkl` files were not loaded or connected. |
| Display names may need curation | Slug-derived league/team display names are acceptable for sample JSON but should be curated before production. |

## Frontend Import Swap Readiness

The generated JSON shape is safe enough for a controlled import-swap experiment in the next task, because required top-level fields exist and team joins validate.

However, it is not production-ready. Before a real swap, decide how to handle:

- JSON imports versus JS exports.
- `UNKNOWN` values in visible UI sections.
- Placeholder future projections.
- Lower/calibrated `aiQualityScore` range versus the fake mock values.
- Team and league display-name curation.

