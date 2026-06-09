import pandas as pd
import numpy as np

from column_normalization import normalize_team_columns
from dataset_version import apply_league_version_filter
from sofa_metrics_drop import drop_sofa_extension_columns

# Tarihsel TM PD anlık görüntüleri model gürültüsü / sızıntı — sealed’de kalsa bile engineered’da tutulmaz.
HISTORICAL_PD_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
]

print("\N{ROCKET} Özellik mühendisliği başlıyor... Biraz sürebilir.")

in_path = 'data/processed/sealed_master_dataset.csv'
out_path = 'data/processed/engineered_master_dataset.csv'

df = pd.read_csv(in_path)
df = normalize_team_columns(df)
df = drop_sofa_extension_columns(df)
df = apply_league_version_filter(df)

_lig_path = 'data/processed/lig_guc_by_league.csv'
_kul_path = 'data/processed/kulup_guc_by_team.csv'
try:
    _lig = pd.read_csv(_lig_path)
    _kul = pd.read_csv(_kul_path)
    df = df.merge(
        _lig[['League', 'Lig_Ort_Pd', 'Lig_Oyuncu_Sayisi', 'Lig_Guc_0_100']],
        on='League',
        how='left',
    )
    df = df.merge(
        _kul[['League', 'Team', 'Kulup_Ort_Pd', 'Kulup_Oyuncu_Sayisi', 'Kulup_Guc_0_100']],
        on=['League', 'Team'],
        how='left',
    )
except FileNotFoundError:
    pass

df = df[df['minutesPlayed'] >= 45].copy()

if 'PD_Guncel' in df.columns:
    _pdg = pd.to_numeric(df['PD_Guncel'], errors='coerce')
    _n_before = len(df)
    df = df[_pdg.notna() & (_pdg > 0)].copy()
    print(f"PD_Guncel geçersiz/atıldı (NaN veya <=0): {_n_before} -> {len(df)} satır")

df['Mins_90'] = df['minutesPlayed'] / 90.0

volume_metrics = [
    'goals', 'assists', 'expectedGoals', 'bigChancesCreated', 'keyPasses',
    'accuratePasses', 'accurateLongBalls', 'accurateThroughBalls', 'successfulDribbles',
    'totalTackle', 'interceptions', 'ballRecovery', 'clearances', 'outfielderBlocks',
    'goalsPrevented', 'saves', 'errorLeadToGoal', 'errorLeadToShot', 'penaltyConceded',
    'accurateCrosses', 'totalCross', 'duelWon', 'aerialWon'
]

for col in volume_metrics:
    if col in df.columns:
        df[f'{col}_Per90'] = df[col] / df['Mins_90']

df['xG_Overperformance'] = df.get('goals', 0) - df.get('expectedGoals', 0)
df['Shot_Conversion_Rate'] = np.where(df.get('totalShots', 0) > 0, df.get('goals', 0) / df.get('totalShots', 1), 0)
df['Goal_Involvement_Per90'] = (df.get('goals', 0) + df.get('assists', 0)) / df['Mins_90']

if 'expectedAssists' in df.columns and 'assists' in df.columns:
    df['xA_Overperformance'] = df['assists'].fillna(0) - df['expectedAssists'].fillna(0)

df['Assist_Dominance_Per90'] = (df.get('assists', 0) * 1.5 + df.get('goals', 0)) / df['Mins_90']

if 'groundDuelsWonPercentage' in df.columns:
    df['Duel_Dominance_Ratio'] = df['groundDuelsWonPercentage'].fillna(0) / 100.0
elif 'totalDuelsWon' in df.columns and 'duelLost' in df.columns:
    tot_duels = df['totalDuelsWon'].fillna(0) + df['duelLost'].fillna(0)
    df['Duel_Dominance_Ratio'] = np.where(tot_duels > 0, df['totalDuelsWon'].fillna(0) / tot_duels, 0)

if 'aerialDuelsWon' in df.columns and 'aerialDuelsWonPercentage' in df.columns:
    df['Aerial_Supremacy_Ratio'] = df['aerialDuelsWonPercentage'].fillna(0) / 100.0
elif 'aerialWon' in df.columns and 'aerialLost' in df.columns:
    tot_aerial = df['aerialWon'].fillna(0) + df['aerialLost'].fillna(0)
    df['Aerial_Supremacy_Ratio'] = np.where(tot_aerial > 0, df['aerialWon'].fillna(0) / tot_aerial, 0)

if 'accuratePasses' in df.columns and 'totalPasses' in df.columns:
    tot_passes = df['totalPasses'].fillna(0)
    df['Passing_Reliability'] = np.where(tot_passes > 0, df['accuratePasses'].fillna(0) / tot_passes, 0)
elif 'accuratePassesPercentage' in df.columns:
    df['Passing_Reliability'] = df['accuratePassesPercentage'].fillna(0) / 100.0

if 'accurateCrosses' in df.columns and 'totalCross' in df.columns:
    df['Cross_Accuracy'] = np.where(df['totalCross'] > 0, df['accurateCrosses'] / df['totalCross'], 0)

def_cols = [c for c in ['totalTackle_Per90', 'interceptions_Per90', 'ballRecovery_Per90', 'clearances_Per90'] if c in df.columns]
if len(def_cols) > 0:
    df['Defensive_Action_Volume_Per90'] = df[def_cols].sum(axis=1)

err_cols = [c for c in ['errorLeadToGoal_Per90', 'errorLeadToShot_Per90', 'penaltyConceded_Per90'] if c in df.columns]
if len(err_cols) > 0:
    df['Error_Liability_Per90'] = df[err_cols].sum(axis=1)

playmaking_cols = [c for c in ['keyPasses_Per90', 'bigChancesCreated_Per90', 'accuratePasses_Per90'] if c in df.columns]
if len(playmaking_cols) > 0:
    playmaking_norm = pd.DataFrame()
    for c in playmaking_cols:
        col_min = df[c].min()
        col_max = df[c].max()
        playmaking_norm[c] = (df[c] - col_min) / (col_max - col_min + 0.001)
    df['Playmaking_Index'] = playmaking_norm.mean(axis=1)

deep_cols_check = ['Defensive_Action_Volume_Per90', 'accuratePasses_Per90', 'Duel_Dominance_Ratio']
deep_cols = [c for c in deep_cols_check if c in df.columns]
if len(deep_cols) > 0:
    deep_norm = pd.DataFrame()
    for c in deep_cols:
        col_min = df[c].min()
        col_max = df[c].max()
        deep_norm[c] = (df[c] - col_min) / (col_max - col_min + 0.001)
    df['Deep_Impact_Index'] = deep_norm.mean(axis=1)

if 'saves' in df.columns and 'goalsConceded' in df.columns:
    tot_shots_faced = df['saves'] + df['goalsConceded']
    df['Shot_Stopping_Efficiency'] = np.where(tot_shots_faced > 0, df['saves'] / tot_shots_faced, 0)

if 'TM_Height_cm' in df.columns:
    df['TM_Height_m'] = df['TM_Height_cm'] / 100.0

df.replace([np.inf, -np.inf], 0, inplace=True)
df.fillna(0, inplace=True)

_hist_drop = [c for c in HISTORICAL_PD_COLUMNS if c in df.columns]
if _hist_drop:
    df = df.drop(columns=_hist_drop)
    print("Tarihsel PD sütunları engineered çıktısından çıkarıldı:", _hist_drop)

df.to_csv(out_path, index=False, encoding='utf-8')
print("Tamamlandı:", out_path)
