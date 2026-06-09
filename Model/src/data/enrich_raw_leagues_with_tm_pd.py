from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

MASTER = ROOT / "data" / "processed" / "tm_sofa_id_pd_master.csv"
RAW_DIR = ROOT / "data" / "raw" / "leagues"
OUT_DIR = ROOT / "data" / "processed" / "leagues_with_pd"


def main() -> None:
    print("\N{ROCKET} Raw liglere PD ekleniyor...")

    if not MASTER.is_file():
        print("Önce tm_sofa_id_pd_master.csv oluştur.")
        sys.exit(1)
    if not RAW_DIR.is_dir():
        print("Klasör yok.")
        sys.exit(1)

    tm = pd.read_csv(MASTER)
    tm["sofascore_id"] = pd.to_numeric(tm["sofascore_id"], errors="coerce")
    tm["PD_Guncel"] = pd.to_numeric(tm["PD_Guncel"], errors="coerce")
    tm = tm.dropna(subset=["sofascore_id"])
    tm = tm.drop_duplicates(subset=["sofascore_id"], keep="last")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name in sorted(os.listdir(RAW_DIR)):
        if not name.endswith(".csv"):
            continue
        path = RAW_DIR / name
        try:
            df = pd.read_csv(path, low_memory=False)
        except Exception:
            continue
        if "Oyuncu_ID" not in df.columns:
            continue

        df = df.copy()
        df["Oyuncu_ID"] = pd.to_numeric(df["Oyuncu_ID"], errors="coerce")

        if "PD_Guncel" in df.columns:
            df = df.drop(columns=["PD_Guncel"])

        merged = df.merge(
            tm[["sofascore_id", "PD_Guncel"]],
            left_on="Oyuncu_ID",
            right_on="sofascore_id",
            how="left",
        )
        merged = merged.drop(columns=["sofascore_id"])

        out_path = OUT_DIR / name
        merged.to_csv(out_path, index=False, encoding="utf-8-sig")

    print("Tamamlandı:", OUT_DIR.relative_to(ROOT))


if __name__ == "__main__":
    main()
