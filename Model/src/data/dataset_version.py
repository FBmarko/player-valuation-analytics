"""
Bu version’da eğitim / feature pipeline’a alınmayacak ligler (Sofa `League` değeri).

Yeniden dahil etmek: bu frozenset’ten kaldır — `compile_master` + `feature_engineering` yeniden çalıştır.
"""

from __future__ import annotations

import pandas as pd

EXCLUDED_LEAGUES_FROM_DATASET_VERSION = frozenset({
    "Ingiltere_championship",
    "Cekya_first_league",
})


def apply_league_version_filter(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or len(df) == 0 or "League" not in df.columns:
        return df
    ex = EXCLUDED_LEAGUES_FROM_DATASET_VERSION
    before = len(df)
    out = df[~df["League"].isin(ex)].copy()
    dropped = before - len(out)
    if dropped:
        print(
            f"Lig version filtresi: {before} -> {len(out)} satır "
            f"(çıkarılan: {', '.join(sorted(ex))})"
        )
    return out
