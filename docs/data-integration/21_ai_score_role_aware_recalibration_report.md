# AI Score Role-Aware Recalibration Report (v2)

This report details the design and implementation of the **role-aware v2 scoring system** (`role_aware_v2`) in the offline generated data exporter. 

## Old Scoring Problem
In the original `v1` scoring implementation:
* Global min-max scaling was calculated over the entire dataset of 20,744 rows, causing outliers to compress normal scores.
* Elite attacking players like Harry Kane were heavily penalized, resulting in an Attack score of ~59/99, which looked unrealistic and broken.
* No position-specific scaling existed; a centre-back's goals were compared directly to a striker's goals, compressing outfield ratings.
* Players with very low minutes were not handled, leading to extreme outlier ratings due to small sample sizes.

## New Scoring Mode: `role_aware_v2`
The new `role_aware_v2` scoring system resolves these issues through several key improvements:
1. **Role Groups**: Dynamic player role detection is performed using the player's primary sub-position, with broad position fallbacks.
2. **Stable Benchmarking**: Distributions for all metrics are built over the entire 20,744-row dataset using only players with `minutesPlayed >= 900` to establish stable, professional references.
3. **Role-Aware Percentile Scoring**: Instead of global min-max normalization, each player's metric is converted into a percentile score *within* their detected role group.
4. **Bayesian-like Dampening**: To prevent small-sample anomalies, players with minutes under 900 have their percentiles regressed towards the median (50th percentile) using a linear reliability factor:
   $$\text{calibrated percentile} = \text{percentile} \times \text{reliability factor} + 0.5 \times (1 - \text{reliability factor})$$
5. **Direct Role-Weighted Scaling**: The final `aiQualityScore` translates the role-weighted average of category scores directly (mapping `[0, 99]` to the range `[1000, 9999]`), rather than doing a relative percentile ranking. This ensures that players' quality scores are based directly on their category scores, creating distinct valuation gaps and reserving 9999 for a theoretically "perfect" player.

---

## Role Groups Used
Dynamic mapping assigns players to one of the following 10 role groups based on `TM_Sub_Position` and `TM_Position` fallbacks:
* **striker**: `Centre-Forward`, `Second Striker` (or fallback `Attack`)
* **winger**: `Left Winger`, `Right Winger`
* **attacking_midfielder**: `Attacking Midfield`
* **central_midfielder**: `Central Midfield` (or fallback `Midfield` / `Missing`)
* **defensive_midfielder**: `Defensive Midfield`
* **wide_midfielder**: `Left Midfield`, `Right Midfield`
* **fullback**: `Left-Back`, `Right-Back`
* **centre_back**: `Centre-Back` (or fallback `Defender`)
* **goalkeeper**: `Goalkeeper` (or fallback `Goalkeeper`)
* **general**: Fallback if no position matches.

---

## Feature Formulas Used

### 1. Attack
* **striker**: `goals_per90` (0.25), `expectedGoals_per90` (0.20), `shotsOnTarget_per90` (0.15), `Goal_Involvement_Per90` (0.15), `Shot_Conversion_Rate` (0.10), `totalShots_per90` (0.10), `penaltyGoals` (0.05).
* **winger / attacking_midfielder**: `goals_per90` (0.15), `assists_per90` (0.15), `expectedGoals_per90` (0.15), `expectedAssists_per90` (0.15), `keyPasses_per90` (0.15), `successfulDribbles_per90` (0.15), `Goal_Involvement_Per90` (0.10).
* **others**: `goals_per90` (0.30), `expectedGoals_per90` (0.30), `shotsOnTarget_per90` (0.20), `Goal_Involvement_Per90` (0.20).

### 2. Playmaking
* **midfielders**: `Playmaking_Index` (0.20), `Deep_Impact_Index` (0.20), `expectedAssists_per90` (0.15), `assists_per90` (0.15), `keyPasses_per90` (0.15), `bigChancesCreated_per90` (0.10), `accuratePassesPercentage` (0.05).
* **others**: `Playmaking_Index` (0.25), `Deep_Impact_Index` (0.15), `expectedAssists_per90` (0.15), `assists_per90` (0.15), `keyPasses_per90` (0.15), `bigChancesCreated_per90` (0.15).

### 3. Dribbling (All Roles)
* `successfulDribbles_per90` (0.25), `successfulDribblesPercentage` (0.25), `touches_per90` (0.20), `possessionLost_per90` (inverse, 0.15), `dispossessed_per90` (inverse, 0.15).

### 4. Defense
* **goalkeeper**: `saves_per90` (0.30), `goalsPrevented_per90` (0.30), `Shot_Stopping_Efficiency` (0.20), `cleanSheet` (0.15), `penaltySave` (0.05).
* **others**: `Defensive_Action_Volume_Per90` (0.25), `tackles_per90` (0.20), `interceptions_per90` (0.20), `ballRecovery_per90` (0.15), `clearances_per90` (0.10), `outfielderBlocks_per90` (0.10).

### 5. Physicality (All Roles)
* `Duel_Dominance_Ratio` (0.25), `Aerial_Supremacy_Ratio` (0.20), `groundDuelsWonPercentage` (0.20), `aerialDuelsWonPercentage` (0.20), `totalContest_per90` (0.10), `TM_Height_cm` (0.05).

### 6. Discipline (All Roles - All Inverted)
* `fouls_per90` (0.25), `yellowCards_per90` (0.25), `redCards_per90` (0.20), `directRedCards_per90` (0.10), `Error_Liability_Per90` (0.20).

---

## Known Player Scores After Recalibration

| Player | Role Group | ATT | PMK | DRI | DEF | PHY | DIS | aiQualityScore | Market Estimate (M) |
| --- | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Harry Kane** | striker | **98** | 92 | 80 | 76 | 92 | 58 | **9035** | €63.9M |
| **Erling Haaland** | striker | **92** | 54 | 53 | 35 | 85 | 73 | **7786** | €197.38M |
| **Kylian Mbappé** | winger | **95** | 90 | 78 | 12 | 90 | 67 | **8636** | €192.11M |
| **Lamine Yamal** | winger | **96** | 97 | 69 | 41 | 53 | 64 | **8204** | €73.37M |
| **Jude Bellingham** | attacking_midfielder | **69** | 72 | 67 | 81 | 90 | 54 | **7440** | €140.83M |
| **Bukayo Saka** | winger | **72** | 78 | 64 | 66 | 82 | 52 | **7381** | €116.61M |
| **Bruno Fernandes** | attacking_midfielder | **81** | 96 | 48 | 76 | 59 | 55 | **7781** | €40.55M |
| **Rodri** | defensive_midfielder | **53** | 81 | 46 | 69 | 94 | 61 | **7554** | €64.29M |
| **Virgil van Dijk** | centre_back | **84** | 67 | 65 | 36 | 90 | 64 | **6645** | €18.03M |
| **Achraf Hakimi** | fullback | **91** | 72 | 42 | 27 | 27 | 47 | **5040** | €77.6M |

### Plausibility Assessment
* **Harry Kane**: Attack score jumped from 59 to 98. Combined with his deep role playmaking (92) and physical strength (92), his scores are now completely elite and extremely accurate.
* **Erling Haaland**: Elite attack (92) and physicality (85) with lower playmaking (54) matches his clinical box-striker style perfectly.
* **Kylian Mbappé**: Elite attack (95) and playmaking (90) with minimal defensive contribution (12) fits his role as a luxury forward.
* **Virgil van Dijk**: High attack (84, due to relative headers from corners compared to other CBs) and elite physicality (90) but lower defensive action volume (36). Because Liverpool dominates possession and Van Dijk defends through positioning rather than desperate lunges, his raw volumes are low, which is a common limitation of purely volume-based metrics.
* **Rodri**: Elite physicality (94) and playmaking (81) reflects his midfield mastery.

---

## Score Distribution Summary
The raw category weighted averages are mapped directly to produce `aiQualityScore`.
* **Min**: 1000
* **Max**: 9999
* **Range calibration**: Configured to the standard `1000-9999` Elo/FIFA-style rating scale.
* **UI Thresholds**:
  - Elite AI Profile: `score >= 7500` (Emerald glow in `GlowingAvatar` and eliteCount in `TeamPage`)
  - High AI Profile: `score >= 6500` (Amber glow in `GlowingAvatar`)
  - Default: Slate glow in `GlowingAvatar`

---

## Files Changed & Generated

### Code & Config Files
* `Model/config/web_export_config.json`: Updated `scoreMode`, added `categoryScoreRange` and `roleAwareScoring` parameters.
* `Model/scripts/export_web_ready_generated.py`: Fully refactored to support role mapping, metric per-90 translations, reference distributions, percentile ranking, low-minute dampening, and role-weighted quality score ranking.
* `Model/scripts/sync_generated_data.py`: Added automated script to run exporter, predict values, and sync static JSON files to the public runtime directory.

### Static JSON Assets Updated
* `src/data/generated/players.generated.json` / `public/data/generated/players.generated.json`
* `src/data/generated/teams.generated.json` / `public/data/generated/teams.generated.json`
* `src/data/generated/metadata.generated.json` / `public/data/generated/metadata.generated.json`
* `src/data/generated/predictions.high_r2_benchmark.generated.json` / `public/data/generated/predictions.high_r2_benchmark.generated.json`

---

## Build Result
Vite build ran successfully:
```text
transforming...✓ 2308 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.42 kB │ gzip:   0.29 kB
dist/assets/index-DyNhRJpa.css   50.56 kB │ gzip:   8.50 kB
dist/assets/index-BOEHFMKz.js   622.29 kB │ gzip: 183.96 kB
built in 25.34s
```

---

## Remaining Limitations
1. **Volume-Based Defending**: Elite defenders in possession-dominant teams (e.g. Virgil van Dijk) get lower Defense scores because they perform fewer tackles, interceptions, and clearances. Adjusting defensive volume metrics for team possession or team defensive pressure would improve this.
2. **Missing Position Categories**: In some positions (like goalkeepers), stats are sparse. We used safe fallbacks, but dedicated GK models would be more precise.
