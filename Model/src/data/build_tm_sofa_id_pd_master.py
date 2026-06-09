from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

TM_BASE = ROOT / "data" / "structured" / "transfermarkt"
OUT_PATH = ROOT / "data" / "processed" / "tm_sofa_id_pd_master.csv"

REQUIRED = ("sofascore_id", "market_value_in_eur")


def main() -> None:
    print("\N{ROCKET} TM → Sofa ID master oluşturuluyor...")

    if not TM_BASE.is_dir():
        print("Klasör yok.")
        sys.exit(1)

    rows: list[pd.DataFrame] = []

    for league in sorted(TM_BASE.iterdir()):
        if not league.is_dir():
            continue
        for csv_path in sorted(league.glob("*.csv")):
            try:
                df = pd.read_csv(csv_path, low_memory=False)
            except Exception:
                continue
            miss = [c for c in REQUIRED if c not in df.columns]
            if miss:
                continue
            sub = df.loc[:, list(REQUIRED)].copy()
            sub = sub[sub["sofascore_id"].notna()]
            sub = sub[pd.to_numeric(sub["sofascore_id"], errors="coerce").notna()]
            if sub.empty:
                continue
            sub["sofascore_id"] = pd.to_numeric(sub["sofascore_id"], errors="coerce")
            sub["market_value_in_eur"] = pd.to_numeric(
                sub["market_value_in_eur"], errors="coerce"
            )
            sub = sub[sub["sofascore_id"] > 0]
            rows.append(sub)

    if not rows:
        print("Veri yok.")
        sys.exit(1)

    all_df = pd.concat(rows, ignore_index=True)
    all_df = all_df.rename(columns={"market_value_in_eur": "PD_Guncel"})
    all_df = all_df.drop_duplicates(subset=["sofascore_id"], keep="last")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    all_df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print("Tamamlandı:", OUT_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
