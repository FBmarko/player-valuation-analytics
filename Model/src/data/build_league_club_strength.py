from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

TM_BASE = ROOT / "data" / "structured" / "transfermarkt"
OUT_LIG = ROOT / "data" / "processed" / "lig_guc_by_league.csv"
OUT_KULUP = ROOT / "data" / "processed" / "kulup_guc_by_team.csv"

GUC_US = 1.55


def _scale_0_100(values: np.ndarray, power: float = GUC_US) -> np.ndarray:
    x = np.log1p(np.maximum(values.astype(float), 0.0))
    lo, hi = np.min(x), np.max(x)
    if hi - lo < 1e-12:
        return np.full_like(values, 50.0, dtype=float)
    t = (x - lo) / (hi - lo)
    t = np.clip(t, 0.0, 1.0)
    t = np.power(t, power)
    return (100.0 * t).astype(float)


def main() -> None:
    if not TM_BASE.is_dir():
        print("Klasör yok.")
        sys.exit(1)

    print("\N{ROCKET} Lig / kulüp gücü hesaplanıyor...")

    league_rows: list[dict] = []
    club_rows: list[dict] = []

    for league_dir in sorted(TM_BASE.iterdir()):
        if not league_dir.is_dir():
            continue
        league_key = league_dir.name
        all_mv: list[float] = []

        for csv_path in sorted(league_dir.glob("*.csv")):
            try:
                df = pd.read_csv(csv_path, low_memory=False)
            except Exception:
                continue
            if "market_value_in_eur" not in df.columns:
                continue
            mv = pd.to_numeric(df["market_value_in_eur"], errors="coerce").dropna()
            mv = mv[mv >= 0]
            if len(mv) == 0:
                continue
            vals = mv.values.astype(float)
            all_mv.extend(vals.tolist())
            team_key = csv_path.stem
            club_rows.append(
                {
                    "League": league_key,
                    "Team": team_key,
                    "Kulup_Oyuncu_Sayisi": int(len(vals)),
                    "Kulup_Toplam_PD": float(vals.sum()),
                    "Kulup_Ort_Pd": float(vals.mean()),
                }
            )

        if not all_mv:
            continue
        arr = np.array(all_mv, dtype=float)
        league_rows.append(
            {
                "League": league_key,
                "Lig_Oyuncu_Sayisi": int(len(arr)),
                "Lig_Toplam_PD": float(arr.sum()),
                "Lig_Ort_Pd": float(arr.mean()),
            }
        )

    if not league_rows:
        print("Veri yok.")
        sys.exit(1)

    lig_df = pd.DataFrame(league_rows)
    kul_df = pd.DataFrame(club_rows)

    lig_df["Lig_Guc_0_100"] = _scale_0_100(lig_df["Lig_Ort_Pd"].values, GUC_US)
    kul_df["Kulup_Guc_0_100"] = _scale_0_100(kul_df["Kulup_Ort_Pd"].values, GUC_US)

    OUT_LIG.parent.mkdir(parents=True, exist_ok=True)
    lig_df.to_csv(OUT_LIG, index=False, encoding="utf-8-sig")
    kul_df.to_csv(OUT_KULUP, index=False, encoding="utf-8-sig")

    print("Tamamlandı:", OUT_LIG.relative_to(ROOT), OUT_KULUP.relative_to(ROOT))


if __name__ == "__main__":
    main()
