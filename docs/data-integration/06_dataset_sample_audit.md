# Dataset Sample Audit

Inspected dataset:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

Inspection level: header, full row count, and enough row/value sampling to confirm field meanings and sample export behavior. No model files were loaded.

## Dataset Shape

| Item | Value |
| --- | --- |
| Rows | 20,744 |
| Columns | 136 |
| Format | CSV |
| Encoding used by export script | `utf-8-sig` |

## First 10 Rows Preview Summary

The first 10 rows are all from `Team = 1_fc_heidenheim` and mostly `Turnuva_Ligi = Bundesliga`. They show that early rows have `Team` and `Takim_Adi` aligned:

| Row | İsim | Oyuncu_ID | Team | Takim_Adi | League | Turnuva_Ligi | TM_Foot | TM_Position | TM_Sub_Position | PD_Guncel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Budu Zivzivadze | 149728.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | both | Attack | Centre-Forward | 1200000.0 |
| 2 | Eren Dinkçi | 1067120.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Attack | Right Winger | 6000000.0 |
| 3 | Marvin Pieringer | 909485.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Attack | Centre-Forward | 4000000.0 |
| 4 | Mikkel Kaufmann | 918437.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Attack | Centre-Forward | 1800000.0 |
| 5 | Christian Joe Conteh | 933833.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Attack | Right Winger | 1500000.0 |
| 6 | Sirlord Conteh | 800400.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Attack | Right Winger | 1500000.0 |
| 7 | Stefan Schimmer | 842922.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Attack | Centre-Forward | 500000.0 |
| 8 | Yannik Wagner | 2189165.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | left | Attack | Left Winger | 800000.0 |
| 9 | Arijon Ibrahimović | 1142248.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Midfield | Attacking Midfield | 6000000.0 |
| 10 | Niklas Dorsch | 794995.0 | 1_fc_heidenheim | 1. FC Heidenheim | Almanya_bundesliga | Bundesliga | right | Midfield | Defensive Midfield | 3000000.0 |

## Example Values

| Column | Example values observed |
| --- | --- |
| `İsim` | Budu Zivzivadze, Eren Dinkçi, Marvin Pieringer, Arijon Ibrahimović |
| `Oyuncu_ID` | 149728.0, 1067120.0, 909485.0, 1142248.0 |
| `Team` | 1_fc_heidenheim, 1_fc_koln, real_madrid, manchester_city |
| `Takim_Adi` | 1. FC Heidenheim, 1. FC Köln, Paris Saint-Germain, Crystal Palace |
| `League` | Almanya_bundesliga, Ingiltere_premier_league, Ispanya_laliga |
| `Turnuva_Ligi` | Bundesliga, Premier League, UEFA Champions League, Ligue 1 |
| `TM_Foot` | both, right, left, 0 |
| `TM_Position` | Attack, Midfield, Defender, Goalkeeper, Missing |
| `TM_Sub_Position` | Centre-Forward, Right Winger, Attacking Midfield, Centre-Back |
| `PD_Guncel` | 1200000.0, 6000000.0, 4000000.0 |
| `PD_23_Yaz` | 600000.0, 1000000.0, 2000000.0, 0.0 |
| `PD_23_Kis` | 700000.0, 6000000.0, 2500000.0, 0.0 |
| `PD_24_Yaz` | 900000.0, 12000000.0, 3000000.0, 0.0 |
| `PD_24_Kis` | 1800000.0, 12000000.0, 5500000.0, 0.0 |
| `PD_25_Yaz` | 2000000.0, 8000000.0, 5500000.0, 0.0 |

## Canonical Column Decisions

| Frontend concept | Selected source | Confidence | Notes |
| --- | --- | --- | --- |
| Player id | `Oyuncu_ID` | HIGH | Numeric values are converted to stable string IDs and combined with a player-name slug. |
| Player name | `İsim` | HIGH | Direct display name. |
| Team identity | `Team` | MEDIUM | Best observed stable team key for current/team grouping. Some rows disagree with `Takim_Adi`, likely because rows can represent historical/competition context. |
| Team display name | `Team`-derived display name, with `Takim_Adi` only when compatible | MEDIUM | Prevents mismatched output such as `Team = real_madrid` with `Takim_Adi = Paris Saint-Germain`. |
| League identity/name | `League`-derived display name | MEDIUM | `Turnuva_Ligi` can be a competition label such as UEFA Champions League, so `League` is safer for portfolio/sidebar grouping. |
| Position | `TM_Sub_Position`, fallback `TM_Position` | HIGH | Detail position matches current profile/card usage better than broad group. |
| Current market value | `PD_Guncel` | HIGH | Used for latest `marketValueHistory` value after converting raw EUR to EUR millions. |

## Market Value Unit Check

Observed `PD_Guncel` values include `500000.0`, `1200000.0`, `6000000.0`, and `12000000.0`. These appear to be raw EUR numeric amounts, not already-in-millions values.

Adapter decision:

```text
frontend value = dataset value / 1,000,000
```

Example:

```text
PD_Guncel 6000000.0 -> marketValueHistory value 6.0
```

Uncertainty:

- The exact currency source is not proven by metadata in the CSV header alone.
- The values are consistent with Transfermarkt-style raw EUR market values.
- This should be confirmed before production display, but using EUR millions is safe for the sample JSON because the current UI formats values as `EUR {value}M`.

## Important Ambiguity Found

The first 10 rows make `Team` and `Takim_Adi` look interchangeable, but high-value rows show mismatches. Examples:

| İsim | Team | Takim_Adi | League | Turnuva_Ligi |
| --- | --- | --- | --- | --- |
| Kylian Mbappé | real_madrid | Paris Saint-Germain | Ispanya_laliga | UEFA Champions League |
| Kylian Mbappé | real_madrid | Paris Saint-Germain | Ispanya_laliga | Ligue 1 |
| Michael Olise | fc_bayern_munchen | Crystal Palace | Almanya_bundesliga | Premier League |

Conclusion:

- `Team` and `League` appear better for current/canonical grouping.
- `Takim_Adi` and `Turnuva_Ligi` appear useful as observed row context, but are not safe as canonical frontend team/league values without further row-level modeling.
- This conclusion remains `MEDIUM` confidence until the upstream dataset construction is reviewed.

