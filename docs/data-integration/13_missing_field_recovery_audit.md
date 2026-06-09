# Missing Field Recovery Audit

## Summary

This is an audit-only pass. No React UI files, generated JSON files, export scripts, model files, CSV imports, backend/API code, or existing data files were modified.

Primary finding: most unresolved statistical frontend fields are already present in the available SofaScore source files and can be joined back to the generated player data by `Oyuncu_ID`. Nationality, team country, and cleaner display names also exist in Transfermarkt-style files, but those joins are less uniform and need more careful adapter logic or manual review.

## Search Scope

Searched data area:

| Area | Status |
| --- | --- |
| `Model/data/` | Present and searched |
| `Model/data/fragmented/` | Present and searched |
| `Model/data/processed/` | Present and searched |
| `Model/data/raw/` | Present and searched |
| `Model/data/structured/` | Present and searched |
| `Model/data/standardized/` | Present and searched |
| `Model/data/reports/` | Present; catalog/report files inspected as support, not recommended as value sources |
| `Model/archive/` | Not present |

Files found under `Model/data/`:

| File type | Count |
| --- | ---: |
| CSV | 2,349 |
| JSON | 1 |

## Candidate File Families Searched

The per-team SofaScore and Transfermarkt datasets contain hundreds of files with repeated schemas. They were header-scanned as families, with representative files inspected for examples and row/column counts.

| Candidate path or pattern | Files | Representative file | Representative rows | Representative columns | Relevant columns found | Missing fields helped | Confidence | Join key notes |
| --- | ---: | --- | ---: | ---: | --- | --- | --- | --- |
| `Model/data/standardized/sofascore/**/*.csv` | 510 | `Model/data/standardized/sofascore/Almanya_bundesliga/1_fc_heidenheim.csv` | 28 | 121 | `İsim`, `Oyuncu_ID`, `Sezon`, `Turnuva_Ligi`, `Takım`, `countRating`, `appearances`, `matchesStarted`, `penaltyGoals`, `totalPasses`, `totalContest` | appearances, matches started, penalty goals, total passes, total contest, league/team display hints | HIGH | Generated player ids end with `Oyuncu_ID`; all 500 generated players matched this family by `Oyuncu_ID`. File path also carries `League` and `Team`-like keys. |
| `Model/data/structured/sofascore/**/*.csv` | 348 | `Model/data/structured/sofascore/Almanya_bundesliga/1_fc_heidenheim.csv` | 28 | 121 | Same direct SofaScore stat columns as standardized files | same as above | HIGH | Same useful schema; standardized copy is likely the cleaner adapter target. |
| `Model/data/fragmented/sofa/**/*.csv` | 281 | `Model/data/fragmented/sofa/ARG1/argentinos_juniors.csv` | 4 | 87 | `Oyuncu_ID`, `Sezon`, `Turnuva_Ligi`, `countRating`, `appearances`, `matchesStarted`, `penaltyGoals`, `totalPasses`, `totalContest` | same as above | MEDIUM | Direct columns exist, but schema is smaller/less standardized and team/league folder names use competition codes such as `ARG1`. |
| `Model/data/standardized/transfermarkt/**/*.csv` | 308 | `Model/data/standardized/transfermarkt/Ingiltere_premier_league/manchester_city.csv` | 27 | 26 | `player_id`, `name`, `country_of_birth`, `country_of_citizenship`, `current_club_domestic_competition_id`, `current_club_name` | player nationality, better team display name, league/country bridge | MEDIUM | 471/500 generated players matched by normalized player name plus team filename. 14 matched by name only but not current team file, and 15 were missing. Uses Transfermarkt `player_id`, not generated SofaScore id. |
| `Model/data/structured/transfermarkt/**/*.csv` | 308 | `Model/data/structured/transfermarkt/Almanya_bundesliga/1_fuballclub_heidenheim_1846.csv` | varies | 27 | Transfermarkt player/person/team fields, including citizenship and club names | same as above | MEDIUM | Similar to standardized Transfermarkt files, but team filenames can be less aligned with current generated `teamId` values. |
| `Model/data/fragmented/tm/**/*.csv` | 546 | `Model/data/fragmented/tm/A1/fuballclub_blauwei_linz.csv` | varies | 26 | `name`, `country_of_birth`, `country_of_citizenship`, `current_club_domestic_competition_id`, `current_club_name` | player nationality and club names | LOW/MEDIUM | Useful raw source, but fragmented by Transfermarkt competition/team naming and less convenient than standardized files. |

## Candidate Files Inspected

| File path | Rows | Columns | Relevant columns found | Example values | Missing frontend field it may fill | Confidence | Possible join key |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| `Model/data/processed/engineered_master_dataset_high_r2.csv` | 20,744 | 136 | `İsim`, `Oyuncu_ID`, `Turnuva_Ligi`, `countRating`, `accuratePasses`, `minutesPlayed`, `groundDuelsWon`, `aerialDuelsWon`, `League`, `Team`, `Takim_Adi` | `Oyuncu_ID=149728`, `Team=1_fc_heidenheim`, `League=Almanya_bundesliga`, `countRating=14`, `minutesPlayed=737` | current generated base; partial evidence for appearances only | MEDIUM for base joins, LOW for missing direct fields | `Oyuncu_ID`, `İsim`, `League`, `Team` |
| `Model/data/processed/engineered_master_dataset.csv` | 20,744 | 122 | Same core columns as high-r2 file; missing some high-r2 engineered columns | same first examples as high-r2 | historical comparison only | LOW | Same as above |
| `Model/data/processed/sealed_master_dataset.csv` | 21,817 | 83 | `İsim`, `Oyuncu_ID`, `Turnuva_Ligi`, `countRating`, `accuratePasses`, `minutesPlayed`, `League`, `Team`, `Takim_Adi` | `Takim_Adi=1. FC Heidenheim` | better team display fallback; not missing stats | MEDIUM | `Oyuncu_ID`, `Team`, `League` |
| `Model/data/processed/tm_sofa_id_pd_master.csv` | 8,279 | 2 | `sofascore_id`, `PD_Guncel` | `sofascore_id=106662.0`, `PD_Guncel=600000.0` | not useful for nationality; confirms SofaScore id is used for value mapping | LOW | `sofascore_id` only; no Transfermarkt `player_id` or nationality columns |
| `Model/data/processed/pd_manual_merge_matched.csv` | 986 | 10 | `Hedef_Lig`, `Takim_TM`, `İsim_Sealed`, `Takim_Adi_Sealed` | `Hedef_Lig=Ingiltere_championship`, `Takim_TM=IPSWICH TOWN`, `Takim_Adi_Sealed=Ipswich Town` | better team display/name-review evidence | LOW/MEDIUM | `İsim_Sealed`, `Takim_Adi_Sealed`, `Hedef_Lig`; limited coverage |
| `Model/data/processed/kulup_guc_by_team.csv` | 308 | 6 | `League`, `Team`, club strength columns | `Team=1_fuballclub_heidenheim_1846`, `League=Almanya_bundesliga` | team key cross-check only | LOW | `League`, `Team`; team keys may differ from current generated keys |
| `Model/data/processed/lig_guc_by_league.csv` | 19 | 5 | `League`, `Lig_Oyuncu_Sayisi`, `Lig_Toplam_PD`, `Lig_Ort_Pd`, `Lig_Guc_0_100` | `League=Almanya_bundesliga`, `Lig_Guc_0_100=65.738...` | league list/strength only, not country | LOW | `League` |
| `Model/data/raw/players.csv` | 47,702 | 26 | `player_id`, `name`, `country_of_birth`, `country_of_citizenship`, `current_club_id`, `current_club_domestic_competition_id`, `current_club_name` | `Erling Haaland -> Norway`, `Kylian Mbappé -> France`, `Bukayo Saka -> England` | player nationality, club display, competition id | MEDIUM | Exact player name plus current club/team; `player_id` is Transfermarkt id and does not equal generated `Oyuncu_ID`. |
| `Model/data/raw/filtered_elite_players.csv` | 36,812 | 26 | Same as `players.csv` | same top-player nationality examples | player nationality | MEDIUM | Same as `players.csv`; subset/filtered copy. |
| `Model/data/raw/clubs.csv` | 796 | 17 | `club_id`, `club_code`, `name`, `domestic_competition_id` | `fc-bayern-munchen -> FC Bayern München`, `1-fc-koln -> 1. Fußball-Club Köln`, `aston-villa -> Aston Villa Football Club` | team country via competition id, better team display name | MEDIUM | `club_code` to generated `team.id`; matched 32/90 generated teams exactly. |
| `Model/data/raw/competitions.csv` | 67 | 11 | `competition_id`, `competition_code`, `name`, `country_name`, `domestic_league_code` | `GB1 -> England / premier-league`, `ES1 -> Spain / laliga`, `L1 -> Germany / bundesliga`, `TR1 -> Türkiye / super-lig` | team country, league display name/country mapping | HIGH if competition id is available; MEDIUM from generated league string alone | `domestic_competition_id` from clubs/Transfermarkt, or curated map from generated `League`. |
| `Model/data/raw/countries.csv` | 118 | 8 | `country_id`, `country_name`, `country_code`, `total_clubs` | `country_name=Armenia`, `country_code=ARM1` | country reference only | LOW | `country_id` if another file supplies it |
| `Model/data/raw/player_valuations.csv` | 616,377 | 6 | `player_id`, `current_club_name`, `current_club_id`, `player_club_domestic_competition_id` | `current_club_name=Galatasaray`, `player_club_domestic_competition_id=TR1` | historical club/league bridge only | LOW | Transfermarkt `player_id`; no nationality or target stats |
| `Model/data/raw/transfers.csv` | 157,186 | 10 | `player_id`, `player_name`, `from_club_name`, `to_club_name` | `player_name=Luca Belardinelli`, `to_club_name=FC Empoli` | legacy team names only | LOW | Transfermarkt `player_id`, `player_name`; historical and not current-squad safe |
| `Model/data/raw/player_stats_market_value.csv` | 600 | 13 | `Player_Name`, `League`, `Minutes_Played`, `Key_Passes`, `Duels_Won` | synthetic-looking names such as `Player_1` | none recommended | LOW | No useful player id; appears synthetic/sample-like |
| `Model/data/reports/catalog/column_catalog.csv` | 160,812 | 8 | `path`, `column`, `normalized_column`, `sample_values` | catalog metadata only | supports search only | LOW | not a value source |
| `Model/data/reports/catalog/csv_catalog.csv` | 2,436 | 22 | `path`, `rows`, `columns_count`, `columns` | catalog metadata only | supports search only | LOW | not a value source |
| `Model/data/reports/catalog/dataset_candidates.csv` | 2,435 | 14 | `path`, `candidate_score`, `player_col`, `sofascore_id_col`, `market_value_col`, `league_col`, `club_col` | catalog metadata only | supports search only | LOW | not a value source |
| `Model/data/reports/missing_sofa_id_summary.csv` | 308 | 10 | `file`, `league_folder`, `total_rows`, `missing_sofa_id_count`, `sofa_id_column`, `player_name_column` | join-quality support only | supports SofaScore id confidence | LOW | not a frontend value source |

## Direct Missing Field Findings

| Missing frontend field | Direct column found? | Best observed column(s) | Best source | Example values | Confidence |
| --- | --- | --- | --- | --- | --- |
| player nationality | Yes | `country_of_citizenship`, fallback `country_of_birth` | `Model/data/standardized/transfermarkt/**/*.csv`, `Model/data/raw/players.csv` | `Erling Haaland -> Norway`, `Vinicius Júnior -> Brazil`, `Michael Olise -> France` | MEDIUM |
| team country | Yes, by bridge | `clubs.domestic_competition_id` -> `competitions.country_name` | `Model/data/raw/clubs.csv` + `Model/data/raw/competitions.csv` | `fc-bayern-munchen -> L1 -> Germany`, `aston-villa -> GB1 -> England` | MEDIUM |
| appearances | Yes | `appearances` | `Model/data/standardized/sofascore/**/*.csv` | Haaland `29`, Mbappé `25`, Saka `27` | HIGH |
| matches started | Yes | `matchesStarted` | `Model/data/standardized/sofascore/**/*.csv` | Haaland `28`, Mbappé `24`, Rice `29` | HIGH |
| penalty goals | Yes | `penaltyGoals` | `Model/data/standardized/sofascore/**/*.csv` | Haaland `3`, Mbappé `8`, Saka `1` | HIGH |
| total passes | Yes | `totalPasses` | `Model/data/standardized/sofascore/**/*.csv` | Haaland `305`, Pedri `1510`, Rice `1797` | HIGH |
| total contest | Yes | `totalContest` | `Model/data/standardized/sofascore/**/*.csv` | Mbappé `120`, Yamal `231`, Haaland `26` | HIGH |
| better team display name | Yes | `clubs.name`, `current_club_name`, `Takim_Adi` | `Model/data/raw/clubs.csv`, Transfermarkt standardized files, processed datasets | `FC Bayern München`, `Real Madrid Club de Fútbol`, `1. Fußball-Club Köln` | MEDIUM |
| better league display name | Partially | `competitions.name`, `Turnuva_Ligi` | `Model/data/raw/competitions.csv`, SofaScore files | `premier-league`, `laliga`, `Bundesliga`, `Ligue 1` | MEDIUM |

## Generated Dataset Join Coverage

Active generated files were not modified, but were read to test join viability.

| Join target | Test | Result | Notes |
| --- | --- | ---: | --- |
| Generated players -> standardized SofaScore stats | generated player id suffix to `Oyuncu_ID` | 500/500 matched | Strongest finding. This supports adding `appearances`, `matchesStarted`, `penaltyGoals`, `totalPasses`, and `totalContest` in the adapter from standardized SofaScore. |
| Generated players -> standardized Transfermarkt nationality | normalized player `name` plus normalized team filename | 471/500 exact name+team-file matches | Good coverage but not perfect. 14 players matched by name in a different current team file, and 15 did not match. |
| Generated players -> raw `players.csv` nationality | exact normalized `name` | many names matched, but duplicated across `players.csv` and `filtered_elite_players.csv` | Useful fallback, but name-only matching should be guarded because ids differ. |
| Generated teams -> raw `clubs.csv` | generated `team.id` to `club_code` | 32/90 exact matches | Useful where it works; many misses are naming variants such as `arsenal` vs a longer Transfermarkt club code/name. |
| Club -> country | `clubs.domestic_competition_id` to `competitions.competition_id` | works for matched clubs | This is the safest country path when club match is available. |

## `countRating` Versus Appearances

`countRating` can not safely be treated as exact appearances when a direct `appearances` column is available.

Evidence from SofaScore files:

| Metric | Value |
| --- | ---: |
| Rows compared with both `countRating` and `appearances` | 31,603 |
| Equal rows | 23,628 |
| Different rows | 7,975 |

Examples where they differ:

| File | `countRating` | `appearances` | `minutesPlayed` | Notes |
| --- | ---: | ---: | ---: | --- |
| `Model/data/fragmented/sofa/A1/red_bull_salzburg.csv` | 3 | 4 | 69 | Player appeared but did not receive a rating in every appearance. |
| `Model/data/fragmented/sofa/A1/red_bull_salzburg.csv` | 17 | 18 | 479 | One appearance without rating. |
| `Model/data/fragmented/sofa/A1/red_bull_salzburg.csv` | 0 | 1 | 1 | Cameo appearance with no rating. |
| `Model/data/standardized/sofascore/Ispanya_laliga/real_madrid.csv` | 19 | 20 | not sampled | Jude Bellingham generated-row example. |

Conclusion: `countRating` is a rating-count proxy, not guaranteed appearances. Recommended action is to use direct `appearances` from standardized SofaScore when joining by `Oyuncu_ID`. If the adapter cannot load the SofaScore source, `countRating` may be a low-confidence fallback only.

## Total Contest Derivation Check

A better direct source exists: standardized/structured SofaScore files contain `totalContest`.

The suggested derivation:

```text
totalContest = groundDuelsWon + aerialDuelsWon + dribbledPast + tackles
```

does not match the direct source in sampled rows:

| File | `totalContest` | Candidate sum | Components |
| --- | ---: | ---: | --- |
| `Model/data/structured/sofascore/Almanya_bundesliga/1_fc_heidenheim.csv` | 17 | 49 | `groundDuelsWon=24`, `aerialDuelsWon=9`, `dribbledPast=7`, `tackles=9` |
| same | 21 | 68 | `groundDuelsWon=31`, `aerialDuelsWon=2`, `dribbledPast=16`, `tackles=19` |
| same | 22 | 108 | `groundDuelsWon=47`, `aerialDuelsWon=41`, `dribbledPast=5`, `tackles=15` |
| same | 1 | 46 | `groundDuelsWon=15`, `aerialDuelsWon=22`, `dribbledPast=6`, `tackles=3` |

Conclusion: do not derive `totalContest` from these components. Use direct `totalContest` from SofaScore.

## Total Passes Check

The current engineered dataset has `accuratePasses`, but that is not equivalent to total pass attempts. Standardized/structured SofaScore files include direct `totalPasses`, plus related columns such as `totalOwnHalfPasses`, `totalOppositionHalfPasses`, `totalChippedPasses`, and `inaccuratePasses`.

Examples:

| Player | File | `accuratePasses` | `totalPasses` |
| --- | --- | ---: | ---: |
| Erling Haaland | `Model/data/standardized/sofascore/Ingiltere_premier_league/manchester_city.csv` | not sampled | 305 |
| Pedri | `Model/data/standardized/sofascore/Ispanya_laliga/fc_barcelona.csv` | not sampled | 1510 |
| Declan Rice | `Model/data/standardized/sofascore/Ingiltere_premier_league/arsenal.csv` | not sampled | 1797 |
| 1. FC Heidenheim sample row | `Model/data/standardized/sofascore/Almanya_bundesliga/1_fc_heidenheim.csv` | 104 | 145 |

Conclusion: use direct `totalPasses` from SofaScore. Do not relabel `accuratePasses` as total passes.

## Nationality Join Notes

The generated player id suffix is a SofaScore id. Transfermarkt raw/standardized files use `player_id`, which is a different id namespace.

Examples:

| Generated player | Generated/SofaScore id | Transfermarkt `player_id` | Citizenship source |
| --- | ---: | ---: | --- |
| Erling Haaland | 839956 | 418560 | `country_of_citizenship=Norway` |
| Kylian Mbappé | 826643 | 342229 | `country_of_citizenship=France` |
| Lamine Yamal | 1402912 | 937958 | `country_of_citizenship=Spain` |
| Bukayo Saka | 934235 | 433177 | `country_of_citizenship=England` |

`Model/data/processed/tm_sofa_id_pd_master.csv` does not solve this mapping because it only contains:

```text
sofascore_id
PD_Guncel
```

Recommended approach: add nationality from standardized Transfermarkt only when a conservative join succeeds on normalized player name plus normalized team/league path or current club evidence. Leave unresolved players unknown or route them to config/manual review.

## Display Name Notes

Team names:

- Current generated names are title-cased from slug keys.
- `Model/data/raw/clubs.csv` provides cleaner names for exact `club_code` matches, for example `fc-bayern-munchen -> FC Bayern München`.
- Coverage by exact generated `team.id` to `club_code` is 32/90, so this is useful but not complete.
- Processed `Takim_Adi` and SofaScore `Takım` can be used as fallback display candidates, but previous docs noted canonical `Team`/`League` can disagree with display columns.

League names:

- SofaScore `Turnuva_Ligi` is user-friendly for rows, for example `Bundesliga` and `Ligue 1`.
- Transfermarkt `competitions.name` gives slug-like names such as `premier-league`, `laliga`, and `super-lig`.
- `competitions.country_name` is strong when reached through `domestic_competition_id`.
- Generated league keys such as `Ingiltere_premier_league` do not directly equal Transfermarkt competition ids like `GB1`; a small curated mapping may still be needed.

## Final Recommendation Table

| Field | Best source found | Join key | Confidence | Recommended action |
| --- | --- | --- | --- | --- |
| player nationality | `Model/data/standardized/transfermarkt/**/*.csv` `country_of_citizenship`, fallback `Model/data/raw/players.csv` | normalized `name` + normalized team filename/current club; no direct id map found | MEDIUM | NEEDS_MANUAL_REVIEW |
| team country | `Model/data/raw/clubs.csv` + `Model/data/raw/competitions.csv` | generated `team.id` -> `club_code` -> `domestic_competition_id` -> `competition_id`; fallback curated league map | MEDIUM | ADD_TO_CONFIG_OVERRIDE |
| appearances | `Model/data/standardized/sofascore/**/*.csv` `appearances` | generated player id suffix -> `Oyuncu_ID` | HIGH | ADD_TO_ADAPTER |
| matches started | `Model/data/standardized/sofascore/**/*.csv` `matchesStarted` | generated player id suffix -> `Oyuncu_ID` | HIGH | ADD_TO_ADAPTER |
| penalty goals | `Model/data/standardized/sofascore/**/*.csv` `penaltyGoals` | generated player id suffix -> `Oyuncu_ID` | HIGH | ADD_TO_ADAPTER |
| total passes | `Model/data/standardized/sofascore/**/*.csv` `totalPasses` | generated player id suffix -> `Oyuncu_ID` | HIGH | ADD_TO_ADAPTER |
| total contest | `Model/data/standardized/sofascore/**/*.csv` `totalContest` | generated player id suffix -> `Oyuncu_ID` | HIGH | ADD_TO_ADAPTER |
| better team display name | `Model/data/raw/clubs.csv` `name`, fallback `Takim_Adi`/`Takım` | `club_code`, generated `Team`, SofaScore/processed team keys | MEDIUM | NEEDS_MANUAL_REVIEW |
| better league display name | SofaScore `Turnuva_Ligi`, Transfermarkt `competitions.name` | `League`, `Turnuva_Ligi`, or curated `League` -> competition id map | MEDIUM | NEEDS_MANUAL_REVIEW |

## Fields Found

These missing fields were found in available data:

- `appearances`
- `matchesStarted`
- `penaltyGoals`
- `totalPasses`
- `totalContest`
- player nationality via Transfermarkt citizenship fields
- team country via club/competition bridge
- cleaner team and league display candidates

## Still Unresolved Or Risky

- Nationality is not safely joinable by id yet because generated ids are SofaScore ids and Transfermarkt nationality files use Transfermarkt `player_id`.
- `tm_sofa_id_pd_master.csv` is not a full id bridge; it lacks Transfermarkt `player_id`.
- Team country has partial exact club-code coverage and likely needs either expanded matching or curated overrides.
- Team display names need manual review because legal club names can be too formal for UI display.
- League display names need manual review because generated Turkish league keys, SofaScore names, and Transfermarkt competition ids/names are not one-to-one without mapping.

## Safest Next Adapter Additions

The safest next adapter work is to enrich generated rows from `Model/data/standardized/sofascore/**/*.csv` by `Oyuncu_ID` for:

- `rawMetrics.Overview.Appearances`
- `rawMetrics.Overview.Matches Started`
- `rawMetrics.Attack & Shooting.Penalty Goals`
- `rawMetrics.Playmaking & Passing.Total Passes`
- `rawMetrics.Physicality & Duels.Total Contest`

These have direct source columns and 500/500 coverage for the current generated players.

Nationality, team country, and display-name improvements should be handled after a small mapping strategy is chosen, with unresolved rows left as unknown rather than guessed.
