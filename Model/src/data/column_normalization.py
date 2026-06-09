from __future__ import annotations

import pandas as pd


def normalize_team_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    if "Team" not in out.columns:
        out["Team"] = ""

    slug = out["Team"].fillna("").astype(str)
    slug_pretty = slug.str.replace("_", " ", regex=False).str.strip().str.title()

    if "Takım" in out.columns:
        raw = out["Takım"].fillna("").astype(str).str.strip()
        use_raw = raw.ne("")
        out["Takim_Adi"] = raw.where(use_raw, slug_pretty)
        out = out.drop(columns=["Takım"])
    elif "Takim_Adi" not in out.columns:
        out["Takim_Adi"] = slug_pretty
    else:
        ta = out["Takim_Adi"].fillna("").astype(str).str.strip()
        need = ta.eq("") | ta.str.lower().eq("nan")
        out.loc[need, "Takim_Adi"] = slug_pretty[need].values

    return out
