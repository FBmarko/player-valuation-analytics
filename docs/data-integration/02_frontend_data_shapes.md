# Frontend Data Shapes

This document describes the data structures currently expected by the UI. Required/optional status is based on current rendering behavior, not an ideal future schema. If a component directly dereferences or formats a field, it is marked required.

## Team Object

Current source: `teams` export in `src/data/mockData.js`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `id` | `"aurora-fc"` | string | Required | Team lookup, search, routing fallback | `AppShell`, `Home`, `PlayerProfile`, `Sidebar` |
| `name` | `"Aurora FC"` | string | Required | Sidebar, portfolio overview, club identity | `Sidebar`, `Home`, `PlayerProfile`, `Topbar` search via `AppShell` |
| `league` | `"Northern Premier Analytics"` | string | Required | Sidebar league grouping, dashboard league count, profile hero | `Sidebar`, `Home`, `PlayerProfile` |
| `country` | `"Norway"` | string | Required in current Home card | Portfolio overview | `Home` |
| `primaryColor` | `"#22c55e"` | string | Required | Jersey, swatches, sidebar dot | `TeamJersey`, `Sidebar`, `Home`, `PlayerProfile` |
| `secondaryColor` | `"#0f172a"` | string | Required | Jersey, swatches, hero gradient | `TeamJersey`, `Home`, `PlayerProfile` |
| `badge` | `"AFC"` | string | Required in current Sidebar | Sidebar team row | `Sidebar` |

## Player Object

Current source: `players` export in `src/data/mockData.js`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `id` | `"niko-varen"` | string | Required | Routing, search, prospect links | `AppShell`, `Home`, `PlayerProfile` |
| `name` | `"Niko Varen"` | string | Required | Search, prospect card, profile hero | `AppShell`, `Home`, `PlayerProfile` |
| `age` | `21` | number | Not currently rendered | Future detail/filtering | Imported data only |
| `position` | `"Advanced Playmaker"` | string | Required | Prospect card, profile hero | `Home`, `PlayerProfile` |
| `nationality` | `"Finland"` | string | Required | Profile mini metric | `ProfileHero` |
| `foot` | `"Left"` | string | Required | Profile mini metric | `ProfileHero` |
| `teamId` | `"aurora-fc"` | string | Required | Team join | `AppShell`, `Home`, `PlayerProfile` |
| `aiQualityScore` | `8750` | number | Required | KPI cards, ranking, avatar, score orb, forecast comparison | `Home`, `PlayerProfile`, `GlowingAvatar` |
| `aiScores` | `{ attack: 86, ... }` | object<string, number> | Required | AI category scores, radar, best/development signals | `AIDashboard`, `StatBar`, `AbilityRadarChart` |
| `summary` | `"Elite chance creator ..."` | string | Required | Prospect card, profile hero | `Home`, `ProfileHero` |
| `aiReport` | `{ strengths: [...], ... }` | object | Required | Scout report | `AIScoutReport`, `ReportList` |
| `rawMetrics` | `[{ category, metrics }]` | array | Required | Player statistical sections | `ScoutMetricConsole` |
| `marketValueHistory` | `[{ month: "Jan", value: 18.4 }]` | array | Required | Prospect value, portfolio market value, profile value | `Home`, `ProfileHero` |
| `futureProjection` | `[{ season: "2026/27", ... }]` | array | Required | Forecast model / next seasons | `FutureProjection` |

## Prospect Card Object

There is no separate prospect-card export. `Home` derives prospect cards by sorting `players` by `aiQualityScore` and taking the top three.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `player.id` | `"niko-varen"` | string | Required | Card link | `ProspectCard` |
| `player.name` | `"Niko Varen"` | string | Required | Card title | `ProspectCard` |
| `player.position` | `"Advanced Playmaker"` | string | Required | Card subtitle | `ProspectCard` |
| `player.summary` | `"Elite chance creator ..."` | string | Required | Card body | `ProspectCard` |
| `player.aiQualityScore` | `8750` | number | Required | Card A-Quality | `ProspectCard`, `Home` sorting |
| `player.marketValueHistory[-1].value` | `43.8` | number | Required | Card value | `ProspectCard` |
| `team.name` | `"Aurora FC"` | string | Required | Card footer | `ProspectCard` |
| `team.primaryColor` | `"#22c55e"` | string | Required | Jersey | `TeamJersey` |
| `team.secondaryColor` | `"#0f172a"` | string | Required | Jersey | `TeamJersey` |
| `rank` | `1` | number | Required | `Prospect #1` label | `ProspectCard` |

## Dashboard Summary Object

There is no stored dashboard summary object. `Home` derives it at render time.

| Derived field | Example | Type | Required inputs | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `trackedProspects` | `5` | number | `players.length` | KPI cards | `OverviewTile` |
| `coveredLeagues` | `3` | number | unique `teams[*].league` | KPI cards | `OverviewTile` |
| `eliteAIProfiles` | `2` | number | `players[*].aiQualityScore >= 8000` | KPI cards | `OverviewTile` |
| `portfolioMarketValue` | `"EUR 124.4M"` | string | sum of latest `marketValueHistory[*].value` | KPI cards | `OverviewTile` |

## Player Detail Object

`PlayerProfile` expects the same `Player Object` plus a resolved `Team Object`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `player` | player object | object | Required | Entire detail page | `PlayerProfile` |
| `team` | team object | object | Required | Header, hero, club identity | `PlayerProfile`, `ProfileHero` |

If `player` is not found by route id, the page redirects to `/`. If `team` is not found, current code would dereference `undefined`.

## Metric Group Object

Current source: `players[*].rawMetrics`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `category` | `"Attack & Shooting"` | string | Required | Section heading and config lookup | `ScoutMetricConsole`, `metricCategoryConfig` |
| `metrics` | `[{ label: "Goals", value: 11 }]` | array | Required | Metric cards/rows | `ScoutMetricConsole` |

## Metric Object

Current source: `players[*].rawMetrics[*].metrics`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `label` | `"Expected Goals (xG)"` | string | Required | Metric label and featured lookup | `ScoutMetricConsole`, `getFeaturedMetrics` |
| `value` | `9.8`, `"86.7%"`, `"2,746"` | number or formatted string | Required | Metric value | `ScoutMetricConsole` |

## Overview Stats Object

Current shape is a `Metric Group Object` where `category` is `"Overview"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Appearances` | `34` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Matches Started` | `31` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Minutes Played` | `"2,746"` | string or number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Goals` | `11` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Assists` | `16` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |

## Attack & Shooting Stats Object

Current shape is a `Metric Group Object` where `category` is `"Attack & Shooting"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Expected Goals (xG)` | `9.8` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Total Shots` | `78` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Shots on Target` | `36` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Goal Conversion %` | `"14.1%"` | string or number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Big Chances Missed` | `7` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Penalty Goals` | `2` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Offsides` | `9` | number | Required for current mock parity | `ScoutMetricConsole` |

## Playmaking & Passing Stats Object

Current shape is a `Metric Group Object` where `category` is `"Playmaking & Passing"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Expected Assists (xA)` | `12.9` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Big Chances Created` | `21` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Key Passes` | `88` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Pass to Assist` | `16` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Total Passes` | `"1,684"` | string or number | Required for current mock parity | `ScoutMetricConsole` |
| `Accurate Passes %` | `"86.7%"` | string or number | Required for current mock parity | `ScoutMetricConsole` |
| `Accurate Opposition Half Passes` | `712` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Accurate Final Third Passes` | `286` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Accurate Long Balls %` | `"63.4%"` | string or number | Required for current mock parity | `ScoutMetricConsole` |
| `Accurate Crosses %` | `"38.9%"` | string or number | Required for current mock parity | `ScoutMetricConsole` |

## Dribbling & Control Stats Object

Current shape is a `Metric Group Object` where `category` is `"Dribbling & Control"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Successful Dribbles` | `96` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Successful Dribbles %` | `"58.5%"` | string or number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Dribbled Past` | `31` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Touches` | `"2,214"` | string or number | Required for current mock parity | `ScoutMetricConsole` |
| `Possession Lost` | `312` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Dispossessed` | `48` | number | Required for current mock parity | `ScoutMetricConsole` |

## Defense & Retention Stats Object

Current shape is a `Metric Group Object` where `category` is `"Defense & Retention"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Tackles` | `46` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Tackles Won %` | `"61.2%"` | string or number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Interceptions` | `29` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Clearances` | `18` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Outfielder Blocks` | `11` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Ball Recovery` | `184` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Possession Won Att Third` | `28` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Error Lead to Shot` | `1` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Error Lead to Goal` | `1` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Own Goals` | `0` | number | Required for current mock parity | `ScoutMetricConsole` |

## Physicality & Duels Stats Object

Current shape is a `Metric Group Object` where `category` is `"Physicality & Duels"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Total Contest` | `248` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Ground Duels Won` | `156` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Ground Duels Won %` | `"54.1%"` | string or number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Aerial Duels Won` | `23` | number | Required for current mock parity | `ScoutMetricConsole` |
| `Aerial Duels Won %` | `"39.7%"` | string or number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Was Fouled` | `64` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |

Note: `Total Contest` has no exact dataset-column match in the inspected header. It may be derived or `UNKNOWN`.

## Discipline Stats Object

Current shape is a `Metric Group Object` where `category` is `"Discipline"`.

| Metric label | Example | Value type | Required | Component usage |
| --- | --- | --- | --- | --- |
| `Fouls` | `31` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Yellow Cards` | `4` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |
| `Red Cards` | `0` | number | Required for current mock parity | `ScoutMetricConsole`, featured priority |

## AI Category Scores Object

Current source: `players[*].aiScores`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `attack` | `86` | number, 0-99 assumed | Required | AI category scores, radar, insights | `AIDashboard`, `StatBar`, `AbilityRadarChart` |
| `playmaking` | `96` | number, 0-99 assumed | Required | AI category scores, radar, insights | `AIDashboard`, `StatBar`, `AbilityRadarChart` |
| `dribbling` | `91` | number, 0-99 assumed | Required | AI category scores, radar, insights | `AIDashboard`, `StatBar`, `AbilityRadarChart` |
| `defense` | `61` | number, 0-99 assumed | Required | AI category scores, radar, insights | `AIDashboard`, `StatBar`, `AbilityRadarChart` |
| `physicality` | `72` | number, 0-99 assumed | Required | AI category scores, radar, insights | `AIDashboard`, `StatBar`, `AbilityRadarChart` |
| `discipline` | `88` | number, 0-99 assumed | Required | AI category scores, radar, insights | `AIDashboard`, `StatBar`, `AbilityRadarChart` |

Derived values inside UI:

| Derived value | Example | Inputs | Component usage |
| --- | --- | --- | --- |
| `topSignal` | `{ label: "Playmaking", value: 96 }` | highest `aiScores` entry | `InsightCard` |
| `developmentSignal` | `{ label: "Defense", value: 61 }` | lowest `aiScores` entry | `InsightCard` |
| `averageScore` | `82` | average of `aiScores` values | `InsightCard` |

## Radar Chart Object

There is no separate radar object. `AbilityRadarChart` transforms `aiScores`.

Internal chart data:

```js
[
  { attribute: "Attack", value: 86 },
  { attribute: "Playmaking", value: 96 }
]
```

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `attribute` | `"Attack"` | string | Derived | Ability radar | `AbilityRadarChart` |
| `value` | `86` | number | Derived from `aiScores` | Ability radar | `AbilityRadarChart` |

## Scout Report Object

Current source: `players[*].aiReport`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `strengths` | `["Sees pressure before receiving ..."]` | string[] | Required | Strong Sides | `AIScoutReport`, `ReportList` |
| `weaknesses` | `["Defensive duel impact ..."]` | string[] | Required | Weak Sides | `AIScoutReport`, `ReportList` |
| `developmentAreas` | `["Improve counter-press timing ..."]` | string[] | Required | Development Focus | `AIScoutReport`, `ReportList` |
| `aiComment` | `"The model reads Varen ..."` | string | Required | AI Comment | `AIScoutReport` |

## Forecast Object

Current source: `players[*].futureProjection`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `season` | `"2026/27"` | string | Required | Forecast row, projection summary | `FutureProjection` |
| `aiQualityScore` | `8920` | number | Required | Forecast AI Index | `FutureProjection` |
| `marketValue` | `52.5` | number, EUR millions assumed | Required | Forecast value | `FutureProjection` |

`FutureProjection` also uses the final array item to generate summary text.

## Market Value History Object

Current source: `players[*].marketValueHistory`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `month` | `"Jan"` | string | Required if a future chart is added; currently not rendered | Value history | Current UI only uses latest item value |
| `value` | `18.4` | number, EUR millions assumed | Required | Prospect card, portfolio value, profile mini metric | `Home`, `ProfileHero` |

## Searchable Item Object

Current source: derived in `src/App.jsx`.

| Field | Example | Type | Required | UI section | Component usage |
| --- | --- | --- | --- | --- | --- |
| `id` | `"niko-varen"` | string | Required | Topbar search | `Topbar`, `handleSearchSelect` |
| `type` | `"player"` | string | Required | Suggestion subtitle and route handling | `Topbar`, `handleSearchSelect` |
| `label` | `"Niko Varen"` | string | Required | Search matching and display | `Topbar` |

