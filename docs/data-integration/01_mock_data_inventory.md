# Mock Data Inventory

This document inventories fake/static data used by the React frontend. No real dataset or model output is currently connected to React.

## Summary

| Source file | Export / local name | Data kind | Primary UI area | Consumers |
| --- | --- | --- | --- | --- |
| `src/data/mockData.js` | `teams` | Fake teams, leagues, countries, jersey colors, badges | Sidebar, dashboard portfolio overview, player club identity | `src/App.jsx`, `src/pages/Home.jsx`, `src/pages/PlayerProfile.jsx`, `src/components/layout/Sidebar.jsx` |
| `src/data/mockData.js` | `players` | Fake player profiles, scores, metrics, report text, market history, future projection | Dashboard prospect cards and full player profile | `src/App.jsx`, `src/pages/Home.jsx`, `src/pages/PlayerProfile.jsx` |
| `src/data/mockData.js` | `rawMetrics` | Local, non-exported grouped statistical metric templates reused by players | Player statistical sections | `players[*].rawMetrics`, rendered by `ScoutMetricConsole` in `src/pages/PlayerProfile.jsx` |
| `src/App.jsx` | `searchableItems` | Derived fake search index from `players` and `teams`, plus two hardcoded AI parameter entries | Topbar search | `src/components/layout/Topbar.jsx` |
| `src/pages/PlayerProfile.jsx` | `metricCategoryConfig` | UI-only category labels, icons, color accents, hints | Player statistical sections | `ScoutMetricConsole` |
| `src/pages/PlayerProfile.jsx` | `featuredMetricPriority` | UI-only preferred metric labels per category | Player statistical sections | `getFeaturedMetrics`, `ScoutMetricConsole` |
| `src/pages/PlayerProfile.jsx` | `Model confidence: 92%` | Hardcoded display text | A-Quality Index panel | `ScoreOrb` |

## `src/data/mockData.js`

### `teams`

Purpose: fake portfolio/team metadata and visual identity.

Example object:

```js
{
  id: "aurora-fc",
  name: "Aurora FC",
  league: "Northern Premier Analytics",
  country: "Norway",
  primaryColor: "#22c55e",
  secondaryColor: "#0f172a",
  badge: "AFC"
}
```

Component usage:

| Component/page | Uses |
| --- | --- |
| `AppShell` in `src/App.jsx` | Imports `teams`; builds searchable team entries; passes teams into `Sidebar`, `Home`, and `PlayerProfile`. |
| `Sidebar` | Groups teams by `team.league`; displays `team.name`, `team.primaryColor`, `team.badge`. |
| `Home` | Counts covered leagues; renders team cards using `team.name`, `team.league`, `team.country`, `team.primaryColor`, `team.secondaryColor`. |
| `PlayerProfile` | Finds team by `player.teamId`; renders `team.name`, `team.league`, jersey colors, and club identity panel. |
| `TeamJersey` | Receives `primaryColor` and `secondaryColor`. |

Classification:

| Field family | Source class |
| --- | --- |
| `id`, `primaryColor`, `secondaryColor`, `badge` | `FRONTEND_CONFIG` unless a future design/data service provides branding. |
| `name`, `league`, `country` | likely `DATASET_DIRECT`, though `country` is not present in the inspected main dataset header. |

### `rawMetrics`

Purpose: local fake stat bundles that imitate player statistical sections. It is not exported directly, but each player references one of its arrays.

Available local profiles:

| Local key | Used by players | Purpose |
| --- | --- | --- |
| `eliteCreator` | Niko Varen | High playmaking profile. |
| `explosiveWinger` | Mateo Silva | High dribbling/attack winger profile. |
| `balancedProfile` | Eliot Grant, Kenji Morita, Lucas Brenner | Reused balanced/general profile; this means several fake players share identical section stats. |

Shape:

```js
[
  {
    category: "Overview",
    metrics: [
      { label: "Appearances", value: 34 },
      { label: "Minutes Played", value: "2,746" }
    ]
  }
]
```

Component usage:

| Component/page | Uses |
| --- | --- |
| `ScoutMetricConsole` in `src/pages/PlayerProfile.jsx` | Iterates `groups`; expects each group to have `category` and `metrics`; expects each metric to have `label` and `value`. |
| `getFeaturedMetrics` | Uses metric `label` strings to choose featured cards. |

Categories found:

| Category | Purpose |
| --- | --- |
| `Overview` | Availability and headline output. |
| `Attack & Shooting` | Shot quality and box threat. |
| `Playmaking & Passing` | Chance creation and ball progression. |
| `Dribbling & Control` | Carry value and pressure handling. |
| `Defense & Retention` | Ball winning and error control. |
| `Physicality & Duels` | Contest strength and contact profile. |
| `Discipline` | Fouls and card profile. |

### `players`

Purpose: fake full player records driving dashboard, prospect cards, detail pages, AI score panels, radar chart, scout report, and forecast.

Example object family:

```js
{
  id: "niko-varen",
  name: "Niko Varen",
  age: 21,
  position: "Advanced Playmaker",
  nationality: "Finland",
  foot: "Left",
  teamId: "aurora-fc",
  aiQualityScore: 8750,
  aiScores: {
    attack: 86,
    playmaking: 96,
    dribbling: 91,
    defense: 61,
    physicality: 72,
    discipline: 88
  },
  summary: "Elite chance creator ...",
  aiReport: {
    strengths: ["..."],
    weaknesses: ["..."],
    developmentAreas: ["..."],
    aiComment: "..."
  },
  rawMetrics: rawMetrics.eliteCreator,
  marketValueHistory: [{ month: "Jan", value: 18.4 }],
  futureProjection: [{ season: "2026/27", aiQualityScore: 8920, marketValue: 52.5 }]
}
```

Component usage:

| Component/page | Uses |
| --- | --- |
| `AppShell` | Search index, team/player route selection, prop passing. |
| `Home` | Dashboard KPIs, top prospect ranking, prospect cards. |
| `PlayerProfile` | Full player detail page. |
| `AbilityRadarChart` | Receives `player.aiScores`. |
| `StatBar` | Receives each `aiScores` key/value. |
| `GlowingAvatar` | Receives `player.aiQualityScore`. |

## Fake Data Written Directly Inside Components

| File | Local/static value | UI section | Notes |
| --- | --- | --- | --- |
| `src/App.jsx` | `{ id: "ai-quality-index", type: "AI parameter", label: "A-Quality Index Score" }` | Topbar search | Search-only hardcoded item. No route action. |
| `src/App.jsx` | `{ id: "market-value", type: "AI parameter", label: "Market Value Momentum" }` | Topbar search | Search-only hardcoded item. No route action. |
| `src/pages/PlayerProfile.jsx` | `Model confidence: 92%` | A-Quality Index | Hardcoded confidence value; not in `players`. Future source is `MISSING_OR_UNKNOWN` unless model pipeline exposes confidence/calibration. |
| `src/pages/PlayerProfile.jsx` | Score tier thresholds `8200`, `7000` | A-Quality Index | UI classification logic over `player.aiQualityScore`; can remain frontend config or be moved to derived metadata later. |
| `src/pages/PlayerProfile.jsx` | Stat category hints/icons/colors | Player statistical console | Frontend presentation config. |
| `src/components/StatBar.jsx` | Score tone thresholds `>80`, `>=60`, max `99` | AI category scores | Frontend presentation config. |
| `src/components/charts/AbilityRadarChart.jsx` | Radar axis domain `[0, 99]` | Ability radar | Assumes AI category scores are 0-99. |

## No Real Data Imports Found

No frontend imports of CSV or `.pkl` files were found in `src/`. The only data import into the app shell is:

```js
import { players, teams } from "./data/mockData";
```

