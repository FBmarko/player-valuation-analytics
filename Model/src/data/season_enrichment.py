from __future__ import annotations

import os

import pandas as pd

from column_normalization import normalize_team_columns

TM_COLS = [
    "TM_Foot",
    "TM_Height_cm",
    "TM_Position",
    "TM_Sub_Position",
    "TM_Date_Of_Birth",
    "PD_Guncel",
]


def _composite_keys(df: pd.DataFrame) -> pd.Series:
    return (
        df["Oyuncu_ID"].astype(float).astype(str)
        + "||"
        + df["Sezon"].astype(str)
        + "||"
        + df["Turnuva_Ligi"].astype(str)
    )


def enrich_sealed_with_raw_leagues(
    sealed: pd.DataFrame,
    league_dir: str = "data/raw/leagues",
    expected_columns: int = 87,
    verbose: bool = True,
) -> pd.DataFrame:
    if not league_dir or not os.path.isdir(league_dir):
        if verbose:
            print("Raw lig klasörü yok, atlandı.")
        return sealed

    all_raw: list[pd.DataFrame] = []
    for f in sorted(os.listdir(league_dir)):
        if not f.endswith(".csv"):
            continue
        fpath = os.path.join(league_dir, f)
        try:
            df = pd.read_csv(fpath)
        except Exception as e:
            if verbose:
                print(f"Okunamadı: {f}")
            continue
        if len(df.columns) != expected_columns:
            if verbose:
                print(f"Atlandı: {f}")
            continue
        all_raw.append(df)

    if not all_raw:
        if verbose:
            print("Uygun raw lig yok.")
        return sealed

    raw = pd.concat(all_raw, ignore_index=True)
    sealed = sealed.copy()
    sealed["Oyuncu_ID"] = sealed["Oyuncu_ID"].astype(float)
    raw["Oyuncu_ID"] = raw["Oyuncu_ID"].astype(float)

    sealed_ids = set(sealed["Oyuncu_ID"].dropna().unique())
    matched_raw = raw[raw["Oyuncu_ID"].isin(sealed_ids)].copy()

    sealed_keys = set(_composite_keys(sealed))
    matched_raw["_row_key"] = _composite_keys(matched_raw)
    new_rows = matched_raw[~matched_raw["_row_key"].isin(sealed_keys)].drop(columns=["_row_key"])

    if verbose:
        print(f"+{len(new_rows)} satır eklendi.")

    if len(new_rows) == 0:
        return sealed

    tm_lookup = (
        sealed.drop_duplicates(subset=["Oyuncu_ID"], keep="last")[["Oyuncu_ID"] + TM_COLS]
        .set_index("Oyuncu_ID")
        .to_dict("index")
    )
    league_lookup = (
        sealed.drop_duplicates(subset=["Oyuncu_ID"], keep="last")[["Oyuncu_ID", "League", "Team"]]
        .set_index("Oyuncu_ID")
        .to_dict("index")
    )

    for col in TM_COLS:
        new_rows[col] = new_rows["Oyuncu_ID"].map(lambda pid: tm_lookup.get(pid, {}).get(col))

    new_rows["League"] = new_rows["Oyuncu_ID"].map(lambda pid: league_lookup.get(pid, {}).get("League", ""))
    new_rows["Team"] = new_rows["Oyuncu_ID"].map(lambda pid: league_lookup.get(pid, {}).get("Team", ""))

    target_columns = sealed.columns.tolist()
    for col in list(new_rows.columns):
        if col not in target_columns:
            new_rows = new_rows.drop(columns=[col])

    for col in target_columns:
        if col not in new_rows.columns:
            new_rows[col] = None

    new_rows = new_rows[target_columns]
    enriched = pd.concat([sealed, new_rows], ignore_index=True)
    enriched = enriched[enriched["PD_Guncel"].notna()]
    enriched = normalize_team_columns(enriched)

    if verbose:
        print(f"Toplam: {len(enriched)} satır.")

    return enriched
