"""Sealed sabit gürültü + engineered dinamik (yüksek sıfır oranı) temizliği."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA_SRC = Path(__file__).resolve().parent
sys.path.insert(0, str(DATA_SRC))
os.chdir(ROOT)

from dataset_version import apply_league_version_filter
from sofa_metrics_drop import drop_sofa_extension_columns

SEALED_PATH = ROOT / "data/processed/sealed_master_dataset.csv"
ENGINEERED_PATH = ROOT / "data/processed/engineered_master_dataset.csv"

HISTORICAL_PD_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
]

COLLINEAR_DROPS_SEALED = [
    *HISTORICAL_PD_COLUMNS,
    "TM_Height_m",
    "Takım",
    "totalAttemptAssist",
    "totalOwnHalfPasses",
    "totalPasses",
    "matchesStarted",
    "totalOppositionHalfPasses",
    "totalContest",
    "tacklesWon",
    "totalChippedPasses",
    "totalCross",
    "totalLongBalls",
    "penaltyGoals",
    "appearances",
]

# engineered: bu sayısal sütunlar >= eşik sıfır olsa bile silinmez
ENGINEERED_PROTECTED_NUMERIC = {
    "Oyuncu_ID",
    "PD_Guncel",
    "minutesPlayed",
    "Mins_90",
}

# Deneme / arşiv hedefleri — varsa koru
ENGINEERED_PROTECTED_EXTRA = {
    "Target_SIV",
    "Stat_Anomaly_Score",
    "SIV_Multiplier",
}

# Kaleci / nadir olay: çoğu satırda 0 olması normal; yine de model için anlamlı — silinmez.
ENGINEERED_PROTECTED_SPARSE = frozenset(
    {
        # Kartlar (seyrek)
        "redCards",
        "yellowRedCards",
        "directRedCards",
        # Kaleci metrikleri (saha oyuncularında çoğunlukla 0)
        "saves",
        "saves_Per90",
        "goalsPrevented",
        "goalsPrevented_Per90",
        "goalsConceded",
        "Shot_Stopping_Efficiency",
        "penaltySave",
        "highClaims",
        "punches",
        "runsOut",
        "successfulRunsOut",
        "crossesNotClaimed",
        "cleanSheet",
    }
)


def clean_sealed() -> None:
    print("\N{ROCKET} Gürültü — sealed...")
    df = pd.read_csv(SEALED_PATH, low_memory=False)
    df = apply_league_version_filter(df)

    _before = len(df.columns)
    df = drop_sofa_extension_columns(df)
    print(f"  Sofa genişletme sütunları: {_before} -> {len(df.columns)} kolon")

    if "id" in df.columns:
        df = df.drop(columns=["id"])
        print("  'id' sütunu kaldırıldı.")

    found = [c for c in COLLINEAR_DROPS_SEALED if c in df.columns]
    if found:
        df = df.drop(columns=found)
        print(f"  Sabit liste ({len(found)}): {found}")

    df.to_csv(SEALED_PATH, index=False, encoding="utf-8")
    print("  Tamamlandı:", SEALED_PATH.relative_to(ROOT))


def clean_engineered(zero_threshold: float = 90.0) -> None:
    if not ENGINEERED_PATH.is_file():
        print("  Engineered dosya yok, atlandı:", ENGINEERED_PATH.relative_to(ROOT))
        return

    print(f"\N{ROCKET} Gürültü — engineered (≥{zero_threshold:.0f}% sıfır sayısallar)...")
    df = pd.read_csv(ENGINEERED_PATH, low_memory=False)
    initial_cols = len(df.columns)

    _hist = [c for c in HISTORICAL_PD_COLUMNS if c in df.columns]
    if _hist:
        df = df.drop(columns=_hist)
        print(f"  Tarihsel PD sütunları düşürüldü: {_hist}")

    protected = (
        set(ENGINEERED_PROTECTED_NUMERIC)
        | set(ENGINEERED_PROTECTED_EXTRA)
        | set(ENGINEERED_PROTECTED_SPARSE)
    )
    _sparse_hit = sorted(set(ENGINEERED_PROTECTED_SPARSE) & set(df.columns))
    if _sparse_hit:
        print(f"  Korunan seyrek özellikler ({len(_sparse_hit)}): {', '.join(_sparse_hit[:12])}{'...' if len(_sparse_hit) > 12 else ''}")

    noise_cols: list[tuple[str, float]] = []
    for col in df.select_dtypes(include=[np.number]).columns:
        if col in protected:
            continue
        zero_pct = float((df[col] == 0).mean() * 100)
        if zero_pct >= zero_threshold:
            noise_cols.append((col, zero_pct))

    noise_cols.sort(key=lambda x: -x[1])
    print(f"  Tespit: {len(noise_cols)} kolon ≥{zero_threshold:.0f}% sıfır")
    for col, pct in noise_cols[:25]:
        print(f"    - {col}: %{pct:.1f} sıfır")
    if len(noise_cols) > 25:
        print(f"    ... ve {len(noise_cols) - 25} kolon daha")

    drop_names = [c for c, _ in noise_cols]
    df = df.drop(columns=drop_names, errors="ignore")

    print(f"  {initial_cols} -> {len(df.columns)} kolon ({initial_cols - len(df.columns)} kaldırıldı)")
    df.to_csv(ENGINEERED_PATH, index=False, encoding="utf-8")
    print("  Tamamlandı:", ENGINEERED_PATH.relative_to(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sealed: sabit gürültü. Engineered: ≥eşik sıfır oranı olan sayısalları sil."
    )
    parser.add_argument(
        "--with-engineered",
        action="store_true",
        help="Aynı koşuda engineered CSV üzerinde de sıfır-gürültü temizliği yap (önce sealed, sonra engineered)",
    )
    parser.add_argument(
        "--engineered-only",
        action="store_true",
        help="Sadece engineered_master_dataset (sealed’a dokunma)",
    )
    parser.add_argument(
        "--zero-threshold",
        type=float,
        default=90.0,
        help="Engineered: sayısal kolon en az bu kadar %% sıfırsa sil (varsayılan 90)",
    )
    args = parser.parse_args()

    if args.engineered_only:
        if args.with_engineered:
            print("Not: --engineered-only ile --with-engineered birlikte anlamsız; sadece engineered çalıştırılıyor.")
        clean_engineered(zero_threshold=args.zero_threshold)
    else:
        clean_sealed()
        if args.with_engineered:
            clean_engineered(zero_threshold=args.zero_threshold)

    print("\nBitti.")


if __name__ == "__main__":
    main()
