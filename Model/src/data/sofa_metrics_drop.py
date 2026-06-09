from __future__ import annotations

import pandas as pd

SOFA_EXTENSION_METRICS_COLS: tuple[str, ...] = (
    "totalRating",
    "goalsAssistsSum",
    "inaccuratePasses",
    "shotsOffTarget",
    "totalDuelsWon",
    "totalDuelsWonPercentage",
    "goalsFromInsideTheBox",
    "goalsFromOutsideTheBox",
    "shotsFromInsideTheBox",
    "shotsFromOutsideTheBox",
    "headedGoals",
    "leftFootGoals",
    "rightFootGoals",
    "penaltyFaced",
    "savedShotsFromInsideTheBox",
    "savedShotsFromOutsideTheBox",
    "goalsConcededInsideTheBox",
    "goalsConcededOutsideTheBox",
    "penaltyConversion",
    "duelLost",
    "aerialLost",
    "attemptPenaltyMiss",
    "attemptPenaltyPost",
    "attemptPenaltyTarget",
    "scoringFrequency",
    "savesCaught",
    "savesParried",
    "goalKicks",
    "kilometersCovered",
    "numberOfSprints",
    "topSpeed",
    "substitutionsIn",
    "substitutionsOut",
)


def drop_sofa_extension_columns(df: pd.DataFrame) -> pd.DataFrame:
    to_drop = [c for c in SOFA_EXTENSION_METRICS_COLS if c in df.columns]
    if not to_drop:
        return df
    out = df.drop(columns=to_drop)
    return out
