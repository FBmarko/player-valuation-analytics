# Score Formula v1

These are `v1 UI scoring formulas`. They exist only to create web-ready sample JSON that can exercise the existing UI shape.

They are not final football science formulas, not trained model outputs, and not a replacement for the real market-value model.

## Normalization Rule

For each numeric input column:

```text
normalized = ((value - dataset_min) / (dataset_max - dataset_min)) * 99
```

Clamp to:

```text
0 <= normalized <= 99
```

If `dataset_max == dataset_min`, use:

```text
normalized = 50
```

For inverse risk metrics:

```text
inverse_normalized = 99 - normalized
```

Missing/non-numeric values are skipped for that category. If a category has no usable inputs, it receives `0`.

## Category Score Rule

For each category:

```text
category_score = round(mean(normalized_input_scores))
```

All category scores are integers on a 0-99 scale.

## Attack

Inputs:

- `goals`
- `expectedGoals`
- `totalShots`
- `shotsOnTarget`
- `Shot_Conversion_Rate`
- `Goal_Involvement_Per90`

Formula:

```text
attack = round(mean(normalize(inputs)))
```

Notes:

- This rewards production, shot volume, expected goal output, and conversion.
- It does not account for position-specific expectations yet.

## Playmaking

Inputs:

- `Playmaking_Index`
- `expectedAssists`
- `bigChancesCreated`
- `keyPasses`
- `Deep_Impact_Index`

Formula:

```text
playmaking = round(mean(normalize(inputs)))
```

Notes:

- Uses both raw chance creation and engineered creative indexes.
- It is suitable for UI sampling, not final scouting ranking.

## Dribbling

Positive inputs:

- `successfulDribbles`
- `successfulDribblesPercentage`
- `touches`

Inverse inputs:

- `possessionLost`
- `dispossessed`

Formula:

```text
dribbling = round(mean(
  normalize(successfulDribbles),
  normalize(successfulDribblesPercentage),
  normalize(touches),
  inverse_normalize(possessionLost),
  inverse_normalize(dispossessed)
))
```

Notes:

- Possession-loss metrics are treated as risk signals.
- This does not yet separate high-volume creators from low-touch players by role.

## Defense

Inputs:

- `Defensive_Action_Volume_Per90`
- `tackles`
- `interceptions`
- `ballRecovery`
- `clearances`
- `outfielderBlocks`

Formula:

```text
defense = round(mean(normalize(inputs)))
```

Notes:

- Goalkeeper-specific defensive interpretation is not handled yet.
- Position normalization should be added before production use.

## Physicality

Inputs:

- `Duel_Dominance_Ratio`
- `Aerial_Supremacy_Ratio`
- `groundDuelsWonPercentage`
- `aerialDuelsWonPercentage`
- `TM_Height_cm`

Formula:

```text
physicality = round(mean(normalize(inputs)))
```

Notes:

- Height is only a crude proxy and should not dominate a final score.
- A future formula should account for position and role.

## Discipline

Inverse inputs:

- `fouls`
- `yellowCards`
- `redCards`
- `directRedCards`
- `Error_Liability_Per90`

Formula:

```text
discipline = round(mean(inverse_normalize(inputs)))
```

Notes:

- Lower fouls/cards/errors produce a higher discipline score.
- This is a risk-control UI signal, not a complete behavioral model.

## AI Quality Score

Inputs:

- `attack`
- `playmaking`
- `dribbling`
- `defense`
- `physicality`
- `discipline`

Formula:

```text
category_average = mean(category_scores)
aiQualityScore = round((category_average / 99) * 10000)
```

Output scale:

```text
approximately 0-10000
```

Notes:

- The current UI expects values similar to the mock `aiQualityScore` scale.
- This v1 score is intentionally transparent and simple.
- It should be replaced or calibrated after model output and football-domain scoring rules are reviewed.

## Current Sample Score Ranges

For the generated 50-player sample:

| Score | Min | Max |
| --- | --- | --- |
| `attack` | 4 | 50 |
| `playmaking` | 7 | 66 |
| `dribbling` | 35 | 67 |
| `defense` | 3 | 36 |
| `physicality` | 36 | 79 |
| `discipline` | 67 | 98 |
| `aiQualityScore` | 3401 | 5017 |

These ranges are lower than the mock data because min-max normalization is calculated against the full dataset and the formula has not been calibrated for UI drama or player role.

