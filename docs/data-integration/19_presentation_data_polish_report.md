# Presentation Data Polish Report

This report documents the improvements made to presentation-visible data quality in the scouting dashboard, including team display names, league display names, team country mappings, and player nationalities.

## Files Changed

* **[export_web_ready_generated.py](file:///c:/Users/onlyf/WebProje/Model/scripts/export_web_ready_generated.py)**: Modified to load `Model/data/raw/players.csv` and resolve player nationalities automatically using a team-country-aware name matching algorithm.
* **[web_export_config.json](file:///c:/Users/onlyf/WebProje/Model/config/web_export_config.json)**: Added overrides for team names, league names, countries, and high-profile nationalities.
* **[players.generated.json](file:///c:/Users/onlyf/WebProje/public/data/generated/players.generated.json)**: Regenerated and updated in the public runtime directory.
* **[teams.generated.json](file:///c:/Users/onlyf/WebProje/public/data/generated/teams.generated.json)**: Regenerated and updated in the public runtime directory.
* **[metadata.generated.json](file:///c:/Users/onlyf/WebProje/public/data/generated/metadata.generated.json)**: Regenerated and updated in the public runtime directory.

## Overrides Added

### 1. Team Names
Applied Display name corrections to eliminate slug/title-case artifacts and restore proper typography:

| Team Key (Raw) | Before (Default title-case) | After (Override) |
| --- | --- | --- |
| `fc_bayern_munchen` | FC Bayern Munchen | FC Bayern München |
| `paris_saintgermain` | Paris Saintgermain | Paris Saint-Germain |
| `as_monaco` | As Monaco | AS Monaco |
| `atletico_madrid` | Atletico Madrid | Atlético Madrid |
| `deportivo_alaves` | Deportivo Alaves | Deportivo Alavés |
| `brighton_hove_albion` | Brighton Hove Albion | Brighton & Hove Albion |
| `basaksehir_fk` | Basaksehir Fk | Başakşehir FK |
| `besiktas_jk` | Besiktas Jk | Beşiktaş JK |
| `fenerbahce` | Fenerbahce | Fenerbahçe |
| `gaziantep_fk` | Gaziantep Fk | Gaziantep FK |
| `goztepe` | Goztepe | Göztepe |
| `kasmpasa` | Kasmpasa | Kasımpaşa |
| `levante_ud` | Levante Ud | Levante UD |
| `1_fc_heidenheim` | 1 FC Heidenheim | 1. FC Heidenheim |
| `1_fc_koln` | 1 FC Koln | 1. FC Köln |
| `1_fc_union_berlin` | 1 FC Union Berlin | 1. FC Union Berlin |
| `1_fsv_mainz_05` | 1 Fsv Mainz 05 | 1. FSV Mainz 05 |
| `borussia_mgladbach` | Borussia Mgladbach | Borussia Mönchengladbach |

### 2. League Names
Mapped under-scored Turkish league keys to their clean international presentation titles:

| League Key (Raw) | Before (Default title-case) | After (Override) |
| --- | --- | --- |
| `Almanya_bundesliga` | Almanya Bundesliga | Bundesliga |
| `Ispanya_laliga` | Ispanya Laliga | LaLiga |
| `Ingiltere_premier_league` | Ingiltere Premier League | Premier League |
| `Fransa_ligue_1` | Fransa Ligue 1 | Ligue 1 |
| `Italya_serie_a` | Italya Serie A | Serie A |
| `Turkiye_trendyol_super_lig` | Turkiye Trendyol Super Lig | Trendyol Süper Lig |
| `Hollanda_eredivisie` | Hollanda Eredivisie | Eredivisie |
| `Portekiz_liga_portugal` | Portekiz Liga Portugal | Liga Portugal |
| `Belcika_pro_league` | Belcika Pro League | Belgian Pro League |
| `Iskocya_premiership` | Iskocya Premiership | Scottish Premiership |

### 3. Country Mappings
Established full country coverage (100% of teams mapped) by bridging the team leagues to their home nation via `countryOverrides`:

* `Almanya_bundesliga` -> **Germany**
* `Ingiltere_premier_league` -> **England**
* `Ispanya_laliga` -> **Spain**
* `Fransa_ligue_1` -> **France**
* `Italya_serie_a` -> **Italy**
* `Turkiye_trendyol_super_lig` -> **Türkiye**
* `Hollanda_eredivisie` -> **Netherlands**
* `Portekiz_liga_portugal` -> **Portugal**
* `Belcika_pro_league` -> **Belgium**
* `Iskocya_premiership` -> **Scotland**
* `Avusturya_bundesliga` -> **Austria**
* `Brezilya_serie_a` -> **Brazil**
* `Danimarka_superliga` -> **Denmark**
* `Hirvatistan_hnl` -> **Croatia**
* `Isvicre_super_league` -> **Switzerland**
* `Sirbistan_superliga` -> **Serbia**
* `Suudi_arabistan_pro_league` -> **Saudi Arabia**
* `Ukrayna_premier_league` -> **Ukraine**
* `Yunanistan_super_league` -> **Greece**

### 4. Automatic & Manual Player Nationalities
Developed and integrated a **team-aware name matching algorithm** to automatically map player nationalities from `Model/data/raw/players.csv` into the generated database.
- **Accency/Whitespace Normalization**: Player names are stripped of special characters, accents, and spacing before matching.
- **Conflict Resolution**: If a name matches multiple players in `players.csv` with different citizenships, the algorithm checks the candidates' club domestic competition codes and filters by the team country of the generated player.
- **Coverage**:
  - **92.72%** of all 7,105 players resolved automatically (**6,588 players**).
  - Only **0.30%** (21 players) have unresolved name conflicts, and **6.98%** (496 players) are not present in the raw file.
- **Manual Overrides**: Explicit overrides for high-profile targets are configured in `web_export_config.json`:
  - Erling Haaland -> **Norway**
  - Kylian Mbappé -> **France**
  - Lamine Yamal -> **Spain**
  - Vinicius Júnior -> **Brazil**
  - Jude Bellingham -> **England**
  - Bukayo Saka -> **England**
  - Pedri -> **Spain**
  - Jamal Musiala -> **Germany**
  - Florian Wirtz -> **Germany**
  - Rodri -> **Spain**
  - Phil Foden -> **England**
  - Declan Rice -> **England**
  - Michael Olise -> **France**
  - Vitinha -> **Portugal**
  - Nico Paz -> **Argentina**

---

## Dataset Metrics & Status

* **Player Count**: **7,105** (100% of eligible unique players preserved)
* **Team Count**: **308** (100% of eligible teams preserved)
* **`marketEstimate` Coverage**: **100%** (all 7,105 players have calculated model predictions)
* **Future Projections**: Pending (remain zero placeholder values until a future projection model is integrated)

## Build Verification

* **Command**: `npm.cmd run build`
* **Result**: **PASSED**
* **JS Bundle Size**: **600.29 kB** (minified static bundle; large JSON database is loaded dynamically at runtime)

## Unresolved Fields & Limitations
* Nationalities of the remaining 7% of players are set to `UNKNOWN` or `Unconfirmed` (e.g. because they are not present in the raw data files or have unresolved conflicts).

## Recommended Demo Players to Show
1. **Harry Kane** (ID: `harry-kane-108579`) - England / FC Bayern München. Top index striker with corrected display team and custom resolved English nationality.
2. **Bruno Fernandes** (ID: `bruno-fernandes-288205`) - Portugal / Manchester United. Resolved Portuguese nationality.
3. **Virgil van Dijk** (ID: `virgil-van-dijk-151545`) - Netherlands / Liverpool. Resolved Dutch nationality.
4. **Erling Haaland** (ID: `erling-haaland-839956`) - Norway / Manchester City. Elite striker with Norway nationality.
5. **Kylian Mbappé** (ID: `kylian-mbappe-826643`) - France / Real Madrid. High-profile French target.
6. **Lamine Yamal** (ID: `lamine-yamal-1402912`) - Spain / FC Barcelona. Spain nationality.
7. **Vinicius Júnior** (ID: `vinicius-junior-868812`) - Brazil / Real Madrid. Brazil nationality.
8. **Jude Bellingham** (ID: `jude-bellingham-991011`) - England / Real Madrid. England nationality.
9. **Manuel Ugarte** (ID: `manuel-ugarte-903117`) - Manchester United. Showcases a high positive valuation gap (undervalued indicator from the stacking model).
