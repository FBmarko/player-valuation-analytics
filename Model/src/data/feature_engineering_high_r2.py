"""
Benchmark / maksimum R² hattı: ana engineered ile aynı özellikler +
tarihsel PD kesitleri (PD_23_* …) KORUNUR veya sealed’de yoksa
player_valuations + TM eşlemesiyle eklenir.

Çıktı: data/processed/engineered_master_dataset_high_r2.csv
Ana feature_engineering.py ve çıktısı değişmez.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
_SRC_DATA = Path(__file__).resolve().parent
sys.path.insert(0, str(_SRC_DATA))
os.chdir(ROOT)

from column_normalization import normalize_team_columns
from dataset_version import apply_league_version_filter
from sofa_metrics_drop import drop_sofa_extension_columns

VAL_PATH = ROOT / "data/raw/player_valuations.csv"
TM_BASE = ROOT / "data/structured/transfermarkt"
IN_PATH = ROOT / "data/processed/sealed_master_dataset.csv"
OUT_PATH = ROOT / "data/processed/engineered_master_dataset_high_r2.csv"

PD_CUTOFFS = {
    "PD_23_Yaz": pd.Timestamp("2023-08-31"),
    "PD_23_Kis": pd.Timestamp("2024-01-31"),
    "PD_24_Yaz": pd.Timestamp("2024-08-31"),
    "PD_24_Kis": pd.Timestamp("2025-01-31"),
    "PD_25_Yaz": pd.Timestamp("2025-08-31"),
}


def _sofa_id_to_tm_player_id() -> dict[float, int]:
    m: dict[float, int] = {}
    if not TM_BASE.is_dir():
        return m
    for p in TM_BASE.rglob("*.csv"):
        try:
            tdf = pd.read_csv(p, low_memory=False)
        except Exception:
            continue
        if "sofascore_id" not in tdf.columns or "player_id" not in tdf.columns:
            continue
        for _, row in tdf.iterrows():
            sid = pd.to_numeric(row["sofascore_id"], errors="coerce")
            pid = row["player_id"]
            if pd.isna(sid) or pd.isna(pid):
                continue
            m[float(sid)] = int(pid)
    return m


def _history_by_cutoffs(val_df: pd.DataFrame) -> dict[int, dict[str, float]]:
    val_df = val_df.copy()
    val_df["date"] = pd.to_datetime(val_df["date"])
    val_df = val_df.sort_values("date")
    out: dict[int, dict[str, float]] = {}
    for pid, group in val_df.groupby("player_id"):
        d: dict[str, float] = {}
        for c_name, c_date in PD_CUTOFFS.items():
            valid = group[group["date"] <= c_date]
            d[c_name] = (
                float(valid.iloc[-1]["market_value_in_eur"]) if len(valid) else 0.0
            )
        out[int(pid)] = d
    return out


def ensure_historical_pd_columns(df: pd.DataFrame) -> pd.DataFrame:
    need = list(PD_CUTOFFS.keys())
    if all(c in df.columns for c in need):
        print("Tarihsel PD sütunları sealed’de mevcut (benchmark).")
        return df

    if not VAL_PATH.is_file():
        print(
            "Uyarı: player_valuations.csv yok; tarihsel PD sütunları 0 doldurulacak — R² benchmark düşer."
        )
        for c in need:
            if c not in df.columns:
                df[c] = 0.0
        return df

    val_df = pd.read_csv(VAL_PATH, low_memory=False)
    hist = _history_by_cutoffs(val_df)
    sid2pid = _sofa_id_to_tm_player_id()
    oid = pd.to_numeric(df["Oyuncu_ID"], errors="coerce")

    for col in need:
        vals = []
        for o in oid.values:
            if pd.isna(o):
                vals.append(0.0)
                continue
            pid = sid2pid.get(float(o))
            if pid is None:
                vals.append(0.0)
            else:
                vals.append(hist.get(pid, {}).get(col, 0.0))
        df[col] = vals
    print("Tarihsel PD kesitleri eklendi (player_valuations + TM → Oyuncu_ID).")
    return df


print("\N{ROCKET} Özellik mühendisliği (yüksek R² / benchmark hattı)...")

df = pd.read_csv(IN_PATH, low_memory=False)
df = normalize_team_columns(df)
df = drop_sofa_extension_columns(df)
df = apply_league_version_filter(df)
df = ensure_historical_pd_columns(df)

_lig_path = ROOT / "data/processed/lig_guc_by_league.csv"
_kul_path = ROOT / "data/processed/kulup_guc_by_team.csv"
try:
    _lig = pd.read_csv(_lig_path)
    _kul = pd.read_csv(_kul_path)
    df = df.merge(
        _lig[["League", "Lig_Ort_Pd", "Lig_Oyuncu_Sayisi", "Lig_Guc_0_100"]],
        on="League",
        how="left",
    )
    df = df.merge(
        _kul[
            [
                "League",
                "Team",
                "Kulup_Ort_Pd",
                "Kulup_Oyuncu_Sayisi",
                "Kulup_Guc_0_100",
            ]
        ],
        on=["League", "Team"],
        how="left",
    )
except FileNotFoundError:
    pass

df = df[df["minutesPlayed"] >= 45].copy()

if "PD_Guncel" in df.columns:
    _pdg = pd.to_numeric(df["PD_Guncel"], errors="coerce")
    _n_before = len(df)
    df = df[_pdg.notna() & (_pdg > 0)].copy()
    print(f"PD_Guncel geçersiz/atıldı (NaN veya <=0): {_n_before} -> {len(df)} satır")

df["Mins_90"] = df["minutesPlayed"] / 90.0

volume_metrics = [
    "goals",
    "assists",
    "expectedGoals",
    "bigChancesCreated",
    "keyPasses",
    "accuratePasses",
    "accurateLongBalls",
    "accurateThroughBalls",
    "successfulDribbles",
    "totalTackle",
    "interceptions",
    "ballRecovery",
    "clearances",
    "outfielderBlocks",
    "goalsPrevented",
    "saves",
    "errorLeadToGoal",
    "errorLeadToShot",
    "penaltyConceded",
    "accurateCrosses",
    "totalCross",
    "duelWon",
    "aerialWon",
]

for col in volume_metrics:
    if col in df.columns:
        df[f"{col}_Per90"] = df[col] / df["Mins_90"]

df["xG_Overperformance"] = df.get("goals", 0) - df.get("expectedGoals", 0)
df["Shot_Conversion_Rate"] = np.where(
    df.get("totalShots", 0) > 0,
    df.get("goals", 0) / df.get("totalShots", 1),
    0,
)
df["Goal_Involvement_Per90"] = (df.get("goals", 0) + df.get("assists", 0)) / df["Mins_90"]

if "expectedAssists" in df.columns and "assists" in df.columns:
    df["xA_Overperformance"] = df["assists"].fillna(0) - df["expectedAssists"].fillna(0)

df["Assist_Dominance_Per90"] = (
    df.get("assists", 0) * 1.5 + df.get("goals", 0)
) / df["Mins_90"]

if "groundDuelsWonPercentage" in df.columns:
    df["Duel_Dominance_Ratio"] = df["groundDuelsWonPercentage"].fillna(0) / 100.0
elif "totalDuelsWon" in df.columns and "duelLost" in df.columns:
    tot_duels = df["totalDuelsWon"].fillna(0) + df["duelLost"].fillna(0)
    df["Duel_Dominance_Ratio"] = np.where(
        tot_duels > 0, df["totalDuelsWon"].fillna(0) / tot_duels, 0
    )

if "aerialDuelsWon" in df.columns and "aerialDuelsWonPercentage" in df.columns:
    df["Aerial_Supremacy_Ratio"] = df["aerialDuelsWonPercentage"].fillna(0) / 100.0
elif "aerialWon" in df.columns and "aerialLost" in df.columns:
    tot_aerial = df["aerialWon"].fillna(0) + df["aerialLost"].fillna(0)
    df["Aerial_Supremacy_Ratio"] = np.where(
        tot_aerial > 0, df["aerialWon"].fillna(0) / tot_aerial, 0
    )

if "accuratePasses" in df.columns and "totalPasses" in df.columns:
    tot_passes = df["totalPasses"].fillna(0)
    df["Passing_Reliability"] = np.where(
        tot_passes > 0, df["accuratePasses"].fillna(0) / tot_passes, 0
    )
elif "accuratePassesPercentage" in df.columns:
    df["Passing_Reliability"] = df["accuratePassesPercentage"].fillna(0) / 100.0

if "accurateCrosses" in df.columns and "totalCross" in df.columns:
    df["Cross_Accuracy"] = np.where(
        df["totalCross"] > 0, df["accurateCrosses"] / df["totalCross"], 0
    )

def_cols = [
    c
    for c in [
        "totalTackle_Per90",
        "interceptions_Per90",
        "ballRecovery_Per90",
        "clearances_Per90",
    ]
    if c in df.columns
]
if len(def_cols) > 0:
    df["Defensive_Action_Volume_Per90"] = df[def_cols].sum(axis=1)

err_cols = [
    c
    for c in [
        "errorLeadToGoal_Per90",
        "errorLeadToShot_Per90",
        "penaltyConceded_Per90",
    ]
    if c in df.columns
]
if len(err_cols) > 0:
    df["Error_Liability_Per90"] = df[err_cols].sum(axis=1)

playmaking_cols = [
    c
    for c in [
        "keyPasses_Per90",
        "bigChancesCreated_Per90",
        "accuratePasses_Per90",
    ]
    if c in df.columns
]
if len(playmaking_cols) > 0:
    playmaking_norm = pd.DataFrame()
    for c in playmaking_cols:
        col_min = df[c].min()
        col_max = df[c].max()
        playmaking_norm[c] = (df[c] - col_min) / (col_max - col_min + 0.001)
    df["Playmaking_Index"] = playmaking_norm.mean(axis=1)

deep_cols_check = [
    "Defensive_Action_Volume_Per90",
    "accuratePasses_Per90",
    "Duel_Dominance_Ratio",
]
deep_cols = [c for c in deep_cols_check if c in df.columns]
if len(deep_cols) > 0:
    deep_norm = pd.DataFrame()
    for c in deep_cols:
        col_min = df[c].min()
        col_max = df[c].max()
        deep_norm[c] = (df[c] - col_min) / (col_max - col_min + 0.001)
    df["Deep_Impact_Index"] = deep_norm.mean(axis=1)

if "saves" in df.columns and "goalsConceded" in df.columns:
    tot_shots_faced = df["saves"] + df["goalsConceded"]
    df["Shot_Stopping_Efficiency"] = np.where(
        tot_shots_faced > 0, df["saves"] / tot_shots_faced, 0
    )

if "TM_Height_cm" in df.columns:
    df["TM_Height_m"] = df["TM_Height_cm"] / 100.0

# Benchmark: tarihsel PD türevleri (R² için ek sinyal)
_pd_hist = [c for c in ("PD_23_Yaz", "PD_23_Kis", "PD_24_Yaz", "PD_24_Kis", "PD_25_Yaz") if c in df.columns]
if len(_pd_hist) >= 1:
    _h = df[_pd_hist].copy()
    for col in _h.columns:
        _h[col] = pd.to_numeric(_h[col], errors="coerce").fillna(0.0)
    df["PD_hist_mean"] = _h.mean(axis=1)
    df["PD_hist_max"] = _h.max(axis=1)
    df["PD_hist_min"] = _h.min(axis=1)
    df["PD_hist_span"] = (df["PD_hist_max"] - df["PD_hist_min"]).clip(lower=0.0)
    if _h.shape[1] >= 2:
        df["PD_hist_std"] = _h.std(axis=1).fillna(0.0)
    else:
        df["PD_hist_std"] = 0.0
    if "PD_25_Yaz" in _h.columns and "PD_24_Kis" in _h.columns:
        df["PD_delta_25y_24k"] = _h["PD_25_Yaz"] - _h["PD_24_Kis"]
    if "PD_24_Yaz" in _h.columns and "PD_23_Yaz" in _h.columns:
        df["PD_delta_24y_23y"] = _h["PD_24_Yaz"] - _h["PD_23_Yaz"]
    if "PD_25_Yaz" in _h.columns and "PD_23_Yaz" in _h.columns:
        df["PD_ratio_25_23"] = np.where(
            _h["PD_23_Yaz"] > 1e3, _h["PD_25_Yaz"] / _h["PD_23_Yaz"], 0.0
        )
    if "PD_delta_25y_24k" in df.columns and "PD_delta_24y_23y" in df.columns:
        df["PD_accel_2step"] = df["PD_delta_25y_24k"] - df["PD_delta_24y_23y"]

df.replace([np.inf, -np.inf], 0, inplace=True)
df.fillna(0, inplace=True)

# Tarihsel PD düşürülmez — bu dosyanın amacı yüksek R² benchmark.

df.to_csv(OUT_PATH, index=False, encoding="utf-8")
print("Tamamlandı (benchmark engineered):", OUT_PATH.relative_to(ROOT))
