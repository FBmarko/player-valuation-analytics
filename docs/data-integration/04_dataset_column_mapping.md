# Dataset Column Mapping

Inspected file:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

Only the header / column names were inspected. The file has 136 columns.

## Dataset Columns Found

```text
İsim
Oyuncu_ID
Sezon
Turnuva_Ligi
rating
countRating
goals
bigChancesCreated
bigChancesMissed
assists
expectedAssists
accuratePasses
accuratePassesPercentage
accurateOwnHalfPasses
accurateOppositionHalfPasses
accurateFinalThirdPasses
keyPasses
successfulDribbles
successfulDribblesPercentage
tackles
interceptions
yellowCards
directRedCards
redCards
accurateCrosses
accurateCrossesPercentage
totalShots
shotsOnTarget
groundDuelsWon
groundDuelsWonPercentage
aerialDuelsWon
aerialDuelsWonPercentage
minutesPlayed
goalConversionPercentage
penaltiesTaken
penaltyWon
penaltyConceded
shotFromSetPiece
freeKickGoal
accurateLongBalls
accurateLongBallsPercentage
clearances
errorLeadToGoal
errorLeadToShot
dispossessed
possessionLost
possessionWonAttThird
accurateChippedPasses
touches
wasFouled
fouls
hitWoodwork
ownGoals
dribbledPast
offsides
blockedShots
passToAssist
saves
cleanSheet
penaltySave
punches
runsOut
successfulRunsOut
highClaims
crossesNotClaimed
setPieceConversion
goalsConceded
tacklesWonPercentage
yellowRedCards
totwAppearances
expectedGoals
ballRecovery
outfielderBlocks
goalsPrevented
League
Team
TM_Foot
TM_Height_cm
TM_Position
TM_Sub_Position
TM_Date_Of_Birth
PD_Guncel
Takim_Adi
PD_23_Yaz
PD_23_Kis
PD_24_Yaz
PD_24_Kis
PD_25_Yaz
Lig_Ort_Pd
Lig_Oyuncu_Sayisi
Lig_Guc_0_100
Kulup_Ort_Pd
Kulup_Oyuncu_Sayisi
Kulup_Guc_0_100
Mins_90
goals_Per90
assists_Per90
expectedGoals_Per90
bigChancesCreated_Per90
keyPasses_Per90
accuratePasses_Per90
accurateLongBalls_Per90
successfulDribbles_Per90
interceptions_Per90
ballRecovery_Per90
clearances_Per90
outfielderBlocks_Per90
goalsPrevented_Per90
saves_Per90
errorLeadToGoal_Per90
errorLeadToShot_Per90
penaltyConceded_Per90
accurateCrosses_Per90
xG_Overperformance
Shot_Conversion_Rate
Goal_Involvement_Per90
xA_Overperformance
Assist_Dominance_Per90
Duel_Dominance_Ratio
Aerial_Supremacy_Ratio
Passing_Reliability
Defensive_Action_Volume_Per90
Error_Liability_Per90
Playmaking_Index
Deep_Impact_Index
Shot_Stopping_Efficiency
TM_Height_m
PD_hist_mean
PD_hist_max
PD_hist_min
PD_hist_span
PD_hist_std
PD_delta_25y_24k
PD_delta_24y_23y
PD_ratio_25_23
PD_accel_2step
```

## Frontend Field to Dataset Column Mapping

| Frontend field | Possible dataset column | Confidence | Future source | Notes |
| --- | --- | --- | --- | --- |
| `player.id` | `Oyuncu_ID` | HIGH | `DATASET_DIRECT` | May need slug/string normalization for URL stability. |
| `player.name` | `İsim` | HIGH | `DATASET_DIRECT` | Direct display name. |
| `player.age` | derive from `TM_Date_Of_Birth` | MEDIUM | `DATASET_DIRECT` plus adapter calculation | UI currently stores age but does not render it. Need reference date/season rule. |
| `player.position` | `TM_Sub_Position` or `TM_Position` | HIGH | `DATASET_DIRECT` | `TM_Sub_Position` likely closer to detailed role; `TM_Position` can be fallback. |
| `player.nationality` | UNKNOWN | LOW | `MISSING_OR_UNKNOWN` | No nationality-like column found in inspected header. |
| `player.foot` | `TM_Foot` | HIGH | `DATASET_DIRECT` | Direct match. |
| `player.teamId` | `Team` or `Takim_Adi` plus slug | MEDIUM | `DATASET_DIRECT` | Need choose canonical team column. |
| `team.id` | `Team` or `Takim_Adi` plus slug | MEDIUM | `DATASET_DIRECT` | Adapter should generate stable IDs. |
| `team.name` | `Team` or `Takim_Adi` | HIGH | `DATASET_DIRECT` | Both exist; need inspect values later to choose canonical source. |
| `team.league` | `League` or `Turnuva_Ligi` | HIGH | `DATASET_DIRECT` | Both exist; need inspect values later to choose canonical source. |
| `team.country` | UNKNOWN | LOW | `MISSING_OR_UNKNOWN` | No country column found in inspected header. Could infer from league only if a trusted mapping exists. |
| `team.primaryColor` | no dataset column | HIGH | `FRONTEND_CONFIG` | Keep in web config keyed by team ID. |
| `team.secondaryColor` | no dataset column | HIGH | `FRONTEND_CONFIG` | Keep in web config keyed by team ID. |
| `team.badge` | no dataset column | MEDIUM | `FRONTEND_CONFIG` | Could derive initials, but real badges/colors require config/source. |
| `player.summary` | no dataset column | HIGH | `TEMPLATE_GENERATED` | Generate from role, top scores, outlier metrics. |
| `player.aiQualityScore` | model prediction / derived normalized score | MEDIUM | `MODEL_OUTPUT` or `DERIVED_SCORE` | Not present as a named dataset column. Existing model artifacts likely predict market value, but this must be confirmed outside React. |
| `player.aiScores.attack` | `expectedGoals`, `goals`, `totalShots`, `shotsOnTarget`, `Shot_Conversion_Rate`, `Goal_Involvement_Per90` | MEDIUM | `DERIVED_SCORE` | Requires scoring formula/normalization. |
| `player.aiScores.playmaking` | `Playmaking_Index`, `expectedAssists`, `bigChancesCreated`, `keyPasses`, `Deep_Impact_Index` | HIGH | `DERIVED_SCORE` | `Playmaking_Index` is already engineered. |
| `player.aiScores.dribbling` | `successfulDribbles`, `successfulDribblesPercentage`, `touches`, `possessionLost`, `dispossessed` | MEDIUM | `DERIVED_SCORE` | Needs positive/negative weighting. |
| `player.aiScores.defense` | `Defensive_Action_Volume_Per90`, `tackles`, `interceptions`, `ballRecovery`, `clearances`, `outfielderBlocks` | HIGH | `DERIVED_SCORE` | Engineered defensive column exists. |
| `player.aiScores.physicality` | `Duel_Dominance_Ratio`, `Aerial_Supremacy_Ratio`, `groundDuelsWonPercentage`, `aerialDuelsWonPercentage`, `TM_Height_cm` | HIGH | `DERIVED_SCORE` | Height may supplement duel stats. |
| `player.aiScores.discipline` | `fouls`, `yellowCards`, `redCards`, `directRedCards`, `Error_Liability_Per90` | MEDIUM | `DERIVED_SCORE` | Score likely inverse-weighted from risk events. |
| `aiReport.strengths` | no single column | HIGH | `TEMPLATE_GENERATED` | Use top derived scores and top raw stat percentiles. |
| `aiReport.weaknesses` | no single column | HIGH | `TEMPLATE_GENERATED` | Use low derived scores and risk metrics. |
| `aiReport.developmentAreas` | no single column | HIGH | `TEMPLATE_GENERATED` | Use role-specific low scores. |
| `aiReport.aiComment` | no single column | HIGH | `TEMPLATE_GENERATED` | Rule-based text first. |
| `marketValueHistory[*].month` | `PD_23_Yaz`, `PD_23_Kis`, `PD_24_Yaz`, `PD_24_Kis`, `PD_25_Yaz` | MEDIUM | `DATASET_DIRECT` | Current UI uses months, but dataset uses transfer-window labels. Adapter can map labels. |
| `marketValueHistory[*].value` | `PD_23_Yaz`, `PD_23_Kis`, `PD_24_Yaz`, `PD_24_Kis`, `PD_25_Yaz`, `PD_Guncel` | HIGH | `DATASET_DIRECT` | Values likely current/historical market values. Unit must be confirmed. |
| `futureProjection[*].season` | generated labels | HIGH | `FRONTEND_CONFIG` | Future season labels are not direct columns. |
| `futureProjection[*].marketValue` | model predictions | HIGH | `MODEL_OUTPUT` | Existing `.pkl` files likely relevant, but should be served by backend/offline export, not React. |
| `futureProjection[*].aiQualityScore` | forecasted score | LOW | `MODEL_OUTPUT` or `DERIVED_SCORE` | No clear source in header. |
| model confidence | UNKNOWN | LOW | `MISSING_OR_UNKNOWN` | Current "92%" is hardcoded. |

## Raw Metric Label Mapping

| UI metric label | Possible dataset column | Confidence | Notes |
| --- | --- | --- | --- |
| `Appearances` | `countRating` | LOW | Name suggests count of ratings, not confirmed appearances. |
| `Matches Started` | UNKNOWN | LOW | No starts column found. |
| `Minutes Played` | `minutesPlayed` | HIGH | Direct match. |
| `Goals` | `goals` | HIGH | Direct match. |
| `Assists` | `assists` | HIGH | Direct match. |
| `Expected Goals (xG)` | `expectedGoals` | HIGH | Direct match. |
| `Total Shots` | `totalShots` | HIGH | Direct match. |
| `Shots on Target` | `shotsOnTarget` | HIGH | Direct match. |
| `Goal Conversion %` | `goalConversionPercentage` | HIGH | Direct match. |
| `Big Chances Missed` | `bigChancesMissed` | HIGH | Direct match. |
| `Penalty Goals` | UNKNOWN | LOW | Header has `penaltiesTaken`, `penaltyWon`, `penaltyConceded`, not penalty goals. |
| `Offsides` | `offsides` | HIGH | Direct match. |
| `Expected Assists (xA)` | `expectedAssists` | HIGH | Direct match. |
| `Big Chances Created` | `bigChancesCreated` | HIGH | Direct match. |
| `Key Passes` | `keyPasses` | HIGH | Direct match. |
| `Pass to Assist` | `passToAssist` | HIGH | Direct match. |
| `Total Passes` | `accuratePasses` | LOW | UI label says total passes, but header only exposes accurate passes. Need true total passes or label adjustment later. |
| `Accurate Passes %` | `accuratePassesPercentage` | HIGH | Direct match. |
| `Accurate Opposition Half Passes` | `accurateOppositionHalfPasses` | HIGH | Direct match. |
| `Accurate Final Third Passes` | `accurateFinalThirdPasses` | HIGH | Direct match. |
| `Accurate Long Balls %` | `accurateLongBallsPercentage` | HIGH | Direct match. |
| `Accurate Crosses %` | `accurateCrossesPercentage` | HIGH | Direct match. |
| `Successful Dribbles` | `successfulDribbles` | HIGH | Direct match. |
| `Successful Dribbles %` | `successfulDribblesPercentage` | HIGH | Direct match. |
| `Dribbled Past` | `dribbledPast` | HIGH | Direct match. |
| `Touches` | `touches` | HIGH | Direct match. |
| `Possession Lost` | `possessionLost` | HIGH | Direct match. |
| `Dispossessed` | `dispossessed` | HIGH | Direct match. |
| `Tackles` | `tackles` | HIGH | Direct match. |
| `Tackles Won %` | `tacklesWonPercentage` | HIGH | Direct match. |
| `Interceptions` | `interceptions` | HIGH | Direct match. |
| `Clearances` | `clearances` | HIGH | Direct match. |
| `Outfielder Blocks` | `outfielderBlocks` | HIGH | Direct match. |
| `Ball Recovery` | `ballRecovery` | HIGH | Direct match. |
| `Possession Won Att Third` | `possessionWonAttThird` | HIGH | Direct match. |
| `Error Lead to Shot` | `errorLeadToShot` | HIGH | Direct match. |
| `Error Lead to Goal` | `errorLeadToGoal` | HIGH | Direct match. |
| `Own Goals` | `ownGoals` | HIGH | Direct match. |
| `Total Contest` | UNKNOWN | LOW | Could be derived from duel/action counts, but no exact source. |
| `Ground Duels Won` | `groundDuelsWon` | HIGH | Direct match. |
| `Ground Duels Won %` | `groundDuelsWonPercentage` | HIGH | Direct match. |
| `Aerial Duels Won` | `aerialDuelsWon` | HIGH | Direct match. |
| `Aerial Duels Won %` | `aerialDuelsWonPercentage` | HIGH | Direct match. |
| `Was Fouled` | `wasFouled` | HIGH | Direct match. |
| `Fouls` | `fouls` | HIGH | Direct match. |
| `Yellow Cards` | `yellowCards` | HIGH | Direct match. |
| `Red Cards` | `redCards` | HIGH | Direct match. |

## Missing Fields

| Frontend need | Status | Notes |
| --- | --- | --- |
| `nationality` | Missing | No clear nationality column in inspected header. |
| `country` for teams | Missing | Could be external config or inferred from league mapping. |
| `matchesStarted` | Missing | No clear starts column. |
| `appearances` | Unknown | `countRating` may be related but is not confirmed. |
| `penaltyGoals` | Missing/unknown | No exact column. |
| `totalPasses` | Missing/unknown | `accuratePasses` is not the same as total passes. |
| `totalContest` | Missing/unknown | No exact column. |
| `modelConfidence` | Missing | Current 92% is hardcoded. |
| real team colors/badges | Missing from dataset | Should be frontend config or external branding source. |

## Fields That Require Model Output

| Frontend need | Notes |
| --- | --- |
| predicted current/future market value | Existing model files `Model/models/elite_stacking_model.pkl` and `Model/models/elite_stacking_model_high_r2.pkl` likely produce model predictions, but this was not loaded or verified. |
| `futureProjection[*].marketValue` | Should come from backend/offline prediction export. |
| future `aiQualityScore` | Only model output if the model is designed to forecast quality; otherwise derive from current stats and trend heuristics. |

## Fields That Require Derived Scoring

| Frontend need | Candidate inputs |
| --- | --- |
| `aiQualityScore` | model predicted value, current value, age, position, league strength, club strength, engineered performance indexes |
| `aiScores.attack` | goals, expectedGoals, totalShots, shotsOnTarget, Shot_Conversion_Rate, Goal_Involvement_Per90 |
| `aiScores.playmaking` | Playmaking_Index, expectedAssists, bigChancesCreated, keyPasses, Deep_Impact_Index |
| `aiScores.dribbling` | successfulDribbles, successfulDribblesPercentage, dispossessed, possessionLost, touches |
| `aiScores.defense` | Defensive_Action_Volume_Per90, tackles, interceptions, ballRecovery, clearances, outfielderBlocks |
| `aiScores.physicality` | Duel_Dominance_Ratio, Aerial_Supremacy_Ratio, ground/aerial duel percentages, height |
| `aiScores.discipline` | inverse of fouls, cards, errors, Error_Liability_Per90 |

## Fields That Require Templates

| Frontend need | Template basis |
| --- | --- |
| `player.summary` | position, age, top category scores, market movement |
| `aiReport.strengths` | top 2-3 category scores and standout stats |
| `aiReport.weaknesses` | lowest category scores, error/card/loss metrics |
| `aiReport.developmentAreas` | role-specific weak areas and age/position context |
| `aiReport.aiComment` | combined score tier, role fit, value trend |

