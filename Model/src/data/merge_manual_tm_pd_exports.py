from __future__ import annotations

import os
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from thefuzz import fuzz
except ImportError:
    fuzz = None

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

SEALED_PATH = ROOT / "data" / "processed" / "sealed_master_dataset.csv"
TM_MASTER_PATH = ROOT / "data" / "processed" / "tm_sofa_id_pd_master.csv"
UNMATCHED_CSV = ROOT / "data" / "processed" / "pd_manual_merge_unmatched.csv"
MATCHED_CSV = ROOT / "data" / "processed" / "pd_manual_merge_matched.csv"
SKIPPED_CSV = ROOT / "data" / "processed" / "pd_manual_merge_skipped.csv"
UNMATCHED_MD = ROOT / "reports" / "pd_manual_merge_unmatched.md"
STRUCTURED_SOFASCORE = ROOT / "data" / "structured" / "sofascore"
STRUCTURED_TM = ROOT / "data" / "structured" / "transfermarkt"

# TM metninde PD bu eşiğin altındaysa ve oyuncu Sofa lig klasöründe hiç yoksa unmatched raporuna düşme.
MIN_PD_EUR_SKIP_IF_ABSENT_IN_SOFLEAGUE = 200_000.0

_PARTICLE_TOKENS = frozenset({"de", "da", "del", "dos", "das", "van", "von", "la", "le", "el"})

# Championship / Çekya bu dataset version’ında pipeline dışında (dataset_version.py).
MANUAL_EXPORTS: list[tuple[str, str]] = []


def resolve_export_path(stem: str) -> Path | None:
    candidates = [
        ROOT / "data" / "manual" / f"{stem}.xlsx",
        ROOT / "data" / "manual" / f"{stem}.xls",
        ROOT / f"{stem}.xlsx",
        ROOT / f"{stem}.xls",
        ROOT / f"{stem}.csv",
        ROOT / "data" / "manual" / f"{stem}.csv",
    ]
    for p in candidates:
        if p.is_file():
            return p
    return None


def norm_txt(x) -> str:
    if pd.isna(x):
        return ""
    s = str(x).strip().lower()
    trans = str.maketrans({
        "ø": "o",
        "ö": "o",
        "ő": "o",
        "ô": "o",
        "õ": "o",
        "ü": "u",
        "ű": "u",
        "ú": "u",
        "ù": "u",
        "û": "u",
        "ý": "y",
        "ž": "z",
        "ć": "c",
        "č": "c",
        "ń": "n",
        "ñ": "n",
        "ł": "l",
        "đ": "d",
        "ß": "ss",
        "æ": "ae",
        "ä": "a",
        "å": "a",
        "ā": "a",
        "ë": "e",
        "é": "e",
        "è": "e",
        "ê": "e",
        "ě": "e",
        "í": "i",
        "ì": "i",
        "î": "i",
        "ï": "i",
        "š": "s",
        "ř": "r",
        "ť": "t",
        "ů": "u",
    })
    s = s.translate(trans)
    s = s.replace("œ", "oe").replace("þ", "th")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def norm_name_fold_particles(norm_name: str) -> str:
    """'de cordova' → 'decordova' (TM ↔ Sofa yazım farkları)."""
    if not norm_name:
        return norm_name
    parts = norm_name.split()
    if len(parts) < 2:
        return norm_name
    out: list[str] = [parts[0]]
    i = 1
    while i < len(parts):
        tok = parts[i]
        if i + 1 < len(parts) and tok in _PARTICLE_TOKENS and len(tok) <= 4:
            out.append(tok + parts[i + 1])
            i += 2
        else:
            out.append(tok)
            i += 1
    return " ".join(out)


def fuzzy_name_score(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    if fuzz is None:
        return 100.0 if a == b else 0.0
    af = norm_name_fold_particles(a)
    bf = norm_name_fold_particles(b)
    return max(
        fuzz.token_sort_ratio(a, b),
        fuzz.token_set_ratio(a, b),
        fuzz.partial_ratio(a, b),
        fuzz.token_sort_ratio(af, bf),
        fuzz.token_set_ratio(af, bf),
    )


def norm_club_key(s: str) -> str:
    n = norm_txt(s)
    for prefix in (
        "sk ",
        "fk ",
        "fc ",
        "sc ",
        "ac ",
        "if ",
        "bk ",
        "vfl ",
        "tsv ",
        "1 fc ",
        "1 fk ",
    ):
        if n.startswith(prefix):
            n = n[len(prefix) :]
    n = n.replace(" prag ", " praha ").replace(" prague ", " praha ")
    if n.endswith(" prag"):
        n = n[: -len(" prag")] + " praha"
    if n.endswith(" prague"):
        n = n[: -len(" prague")] + " praha"
    return n.strip()


def parse_tm_tr_eur(val) -> float | None:
    if isinstance(val, (int, float)) and pd.notna(val):
        v = float(val)
        if v > 500_000_000:
            return None
        return v
    if pd.isna(val):
        return None
    s = str(val).strip().lower().replace(" ", "").replace("\u00a0", "")
    m = re.search(r"([\d]+[.,]?[\d]*)\s*mil", s)
    if m:
        num = float(m.group(1).replace(",", "."))
        return num * 1_000_000
    m = re.search(r"([\d]+[.,]?[\d]*)\s*bin", s)
    if m:
        num = float(m.group(1).replace(",", "."))
        return num * 1_000
    m = re.search(r"([\d]+[.,]?[\d]*)", re.sub(r"[€$]", "", s))
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def load_tm_table(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in (".xlsx", ".xls"):
        return pd.read_excel(path)
    return pd.read_csv(path, encoding="utf-8-sig")


def _pick_columns(raw: pd.DataFrame) -> tuple[str, str, str]:
    cols_lower = {c: c.lower().strip() for c in raw.columns}

    c_team = None
    for c, cl in cols_lower.items():
        if cl in ("takim", "takım", "team", "kulüp", "kulup", "club"):
            c_team = c
            break
    if c_team is None:
        for c, cl in cols_lower.items():
            if "tak" in cl and "im" in cl:
                c_team = c
                break
    if c_team is None:
        raise ValueError("Takım kolonu bulunamadı (Takim / Takım / Team).")

    c_play = None
    for c, cl in cols_lower.items():
        if "oyuncu" in cl and ("adi" in cl or "adı" in cl or "isim" in cl or "name" in cl):
            c_play = c
            break
    if c_play is None:
        for c, cl in cols_lower.items():
            if cl in ("oyuncu", "isim", "ad soyad", "player"):
                c_play = c
                break
    if c_play is None:
        raise ValueError("Oyuncu adı kolonu bulunamadı.")

    c_val = None
    for c, cl in cols_lower.items():
        if ("guncel" in cl or "güncel" in cl) and ("deger" in cl or "değer" in cl):
            c_val = c
            break
    if c_val is None:
        for c, cl in cols_lower.items():
            if "piyasa" in cl or "market" in cl or "value" in cl or "pd" == cl:
                c_val = c
                break
    if c_val is None:
        raise ValueError("Güncel piyasa değeri kolonu bulunamadı.")

    return c_team, c_play, c_val


def _team_score(tm_team_norm: str, takim_adi: str, team_slug: str) -> float:
    if fuzz is None:
        return 100.0 if tm_team_norm and norm_club_key(takim_adi) == norm_club_key(tm_team_norm) else 0.0
    t1 = norm_club_key(tm_team_norm)
    t2 = norm_club_key(str(takim_adi or ""))
    t3 = norm_club_key(str(team_slug or "").replace("_", " "))
    return max(
        fuzz.token_set_ratio(t1, t2),
        fuzz.token_set_ratio(t1, t3),
        fuzz.partial_ratio(t1, t2),
    )


def explain_no_match(tm_row: pd.Series, sub: pd.DataFrame, league_key: str) -> str:
    np_name = norm_txt(tm_row["Oyuncu Adi"])
    if not np_name:
        return "Oyuncu adı boş"
    if len(sub) == 0:
        return f"Sealed içinde '{league_key}' ligi için satır yok"
    names = sub["İsim"].map(norm_txt)
    if (names == np_name).any():
        return "İsim ligde var; takım TM vs Sofa uyuşmadı"
    if fuzz is None:
        return "İsim bu ligde yok (fuzzy kapalı; thefuzz kurun)"
    for n in names.unique():
        if n and fuzzy_name_score(np_name, n) >= 92:
            return "Çok benzeyen isim var; takım ayrımı net değil veya eşik altında"
    return "İsim bu ligde yok — SofaScore structured verisinde oyuncu/takım muhtemelen eksik"


def explain_unmatched_after_all(
    tm_row: pd.Series, league_key: str, sealed_hint: str, tm_index: pd.DataFrame
) -> str:
    sid = find_sofascore_id_from_tm_index(tm_row, tm_index)
    if sid is not None:
        if find_sofa_row_by_oyuncu_id(league_key, sid) is None:
            return (
                f"TM structured’da sofascore_id={sid:.0f} bulundu; "
                f"Sofa lig klasöründe ({league_key}) bu Oyuncu_ID yok."
            )
    slug = resolve_team_slug(league_key, str(tm_row["Takim"]))
    if not slug:
        return (
            "Structured SofaScore: TM takım adı klasörle eşleşmedi. "
            f"(Sealed özeti: {sealed_hint})"
        )
    p = STRUCTURED_SOFASCORE / league_key / f"{slug}.csv"
    if not p.is_file():
        return f"Structured SofaScore: {slug}.csv bulunamadı."
    np_name = norm_txt(tm_row["Oyuncu Adi"])
    if not np_name:
        return "Oyuncu adı boş."
    s = pd.read_csv(p, low_memory=False)
    if find_sofa_player_row(s, np_name) is None:
        return (
            f"Takım dosyası ({slug}.csv) var; oyuncu kadroda yok veya isim formatı "
            f"çok farklı. (Sealed: {sealed_hint})"
        )
    return sealed_hint


def resolve_team_slug(league_key: str, tm_team: str) -> str | None:
    folder = STRUCTURED_SOFASCORE / league_key
    if not folder.is_dir():
        return None
    nt = norm_club_key(norm_txt(tm_team))
    best: str | None = None
    best_sc = -1
    for p in folder.glob("*.csv"):
        stem_h = p.stem.replace("_", " ")
        cand = norm_club_key(norm_txt(stem_h))
        if fuzz is not None:
            sc = fuzz.token_set_ratio(nt, cand)
        else:
            sc = 100 if nt == cand else 0
        if sc > best_sc:
            best_sc = sc
            best = p.stem
    if best is not None and best_sc >= 85:
        return best
    return None


_SOFA_NAME_FUZZ_MIN = 86.0
_SOFA_AMBIGUOUS_GAP = 2.0


def find_sofa_player_row(sofa_df: pd.DataFrame, np_name: str):
    if not np_name:
        return None
    names = sofa_df["İsim"].map(norm_txt)
    m = sofa_df.loc[names == np_name]
    if len(m) >= 1:
        return m.iloc[0]
    np_fold = norm_name_fold_particles(np_name)
    names_f = sofa_df["İsim"].map(lambda x: norm_name_fold_particles(norm_txt(x)))
    m2 = sofa_df.loc[names_f == np_fold]
    if len(m2) >= 1:
        return m2.iloc[0]
    if fuzz is None:
        return None
    scored: list[tuple[float, pd.Series]] = []
    for _, r in sofa_df.iterrows():
        nn = norm_txt(r["İsim"])
        sc = fuzzy_name_score(np_name, nn)
        scored.append((sc, r))
    scored.sort(key=lambda x: -x[0])
    if not scored or scored[0][0] < _SOFA_NAME_FUZZ_MIN:
        return None
    if len(scored) > 1 and scored[1][0] >= scored[0][0] - _SOFA_AMBIGUOUS_GAP:
        return None
    return scored[0][1]


def player_present_in_league_sofa(league_key: str, np_name: str) -> bool:
    if not np_name:
        return False
    folder = STRUCTURED_SOFASCORE / league_key
    if not folder.is_dir():
        return False
    for p in folder.glob("*.csv"):
        try:
            sdf = pd.read_csv(p, low_memory=False)
        except Exception:
            continue
        if "İsim" not in sdf.columns:
            continue
        if find_sofa_player_row(sdf, np_name) is not None:
            return True
    return False


def row_dict_for_sealed(sofa_row: pd.Series, league_key: str, team_slug: str, pd_new: float, sealed_columns: list[str]) -> dict:
    out = {c: np.nan for c in sealed_columns}
    for k, v in sofa_row.items():
        if k in out and k != "Takım":
            out[k] = v
    out["League"] = league_key
    out["Team"] = team_slug
    out["PD_Guncel"] = float(pd_new)
    tv = sofa_row.get("Takım", "")
    out["Takim_Adi"] = str(tv).strip() if pd.notna(tv) else ""
    tm_empty = [
        "TM_Foot",
        "TM_Height_cm",
        "TM_Position",
        "TM_Sub_Position",
        "TM_Date_Of_Birth",
    ]
    for c in tm_empty:
        if c in out:
            out[c] = np.nan
    return out


def build_tm_sofa_name_index() -> pd.DataFrame:
    rows: list[dict] = []
    if not STRUCTURED_TM.is_dir():
        return pd.DataFrame(columns=["nm", "club_file", "club_tm", "sid"])
    for league_dir in STRUCTURED_TM.iterdir():
        if not league_dir.is_dir():
            continue
        for csv_path in league_dir.glob("*.csv"):
            try:
                df = pd.read_csv(csv_path, low_memory=False)
            except Exception:
                continue
            if "sofascore_id" not in df.columns:
                continue
            if "name" in df.columns:
                name_col = "name"
            elif "first_name" in df.columns and "last_name" in df.columns:
                df = df.copy()
                df["_merge_name"] = (
                    df["first_name"].fillna("").astype(str).str.strip()
                    + " "
                    + df["last_name"].fillna("").astype(str).str.strip()
                ).str.strip()
                name_col = "_merge_name"
            else:
                continue
            stem_norm = norm_club_key(csv_path.stem.replace("_", " "))
            club_tm_col = "current_club_name" if "current_club_name" in df.columns else None
            for _, r in df.iterrows():
                sid = pd.to_numeric(r.get("sofascore_id"), errors="coerce")
                if pd.isna(sid) or float(sid) <= 0:
                    continue
                nm = norm_txt(r.get(name_col, ""))
                if not nm:
                    continue
                club_tm = (
                    norm_club_key(norm_txt(r.get(club_tm_col, "")))
                    if club_tm_col
                    else ""
                )
                rows.append(
                    {"nm": nm, "club_file": stem_norm, "club_tm": club_tm, "sid": float(sid)}
                )
    return pd.DataFrame(rows)


def _tm_team_score_row(nt_team: str, row: pd.Series) -> float:
    if fuzz is None:
        m = 0.0
        if nt_team == row["club_file"]:
            m = max(m, 100.0)
        if nt_team == row["club_tm"]:
            m = max(m, 100.0)
        return m
    return max(
        fuzz.token_set_ratio(nt_team, row["club_file"]),
        fuzz.token_set_ratio(nt_team, row["club_tm"]),
    )


def find_sofascore_id_from_tm_index(tm_row: pd.Series, tm_index: pd.DataFrame) -> float | None:
    if tm_index.empty:
        return None
    np_name = norm_txt(tm_row["Oyuncu Adi"])
    nt_team = norm_club_key(norm_txt(tm_row["Takim"]))
    if not np_name or not nt_team:
        return None
    work = tm_index.copy()
    work["_ts"] = work.apply(lambda r: _tm_team_score_row(nt_team, r), axis=1)
    work = work.loc[work["_ts"] >= 62]
    if work.empty:
        return None
    if fuzz is None:
        work = work.loc[work["nm"] == np_name]
        if len(work) != 1:
            return None
        return float(work.iloc[0]["sid"])
    work["_ns"] = work["nm"].apply(lambda n: fuzz.token_sort_ratio(np_name, n))
    work = work.loc[work["_ns"] >= 88]
    if work.empty:
        return None
    work["_combo"] = work["_ns"] * 0.62 + work["_ts"] * 0.38
    work = work.sort_values("_combo", ascending=False).reset_index(drop=True)
    top = work.iloc[0]
    if len(work) > 1:
        second = work.iloc[1]
        if float(top["_combo"] - second["_combo"]) < 2.5 and float(top["_ns"]) < 95:
            return None
    return float(top["sid"])


def find_sofa_row_by_oyuncu_id(league_key: str, oyuncu_id: float) -> tuple[pd.Series, str] | None:
    folder = STRUCTURED_SOFASCORE / league_key
    if not folder.is_dir():
        return None
    best_row: pd.Series | None = None
    best_slug: str | None = None
    best_minutes = -1.0
    for p in folder.glob("*.csv"):
        try:
            sdf = pd.read_csv(p, low_memory=False)
        except Exception:
            continue
        if "Oyuncu_ID" not in sdf.columns:
            continue
        oids = pd.to_numeric(sdf["Oyuncu_ID"], errors="coerce")
        m = sdf.loc[oids == float(oyuncu_id)].copy()
        if len(m) == 0:
            continue
        if "Sezon" in m.columns:
            pref = m[m["Sezon"].astype(str).str.contains("25/26", na=False)]
            if len(pref) > 0:
                m = pref
        if "minutesPlayed" in m.columns:
            mins = pd.to_numeric(m["minutesPlayed"], errors="coerce").fillna(0)
            idx = mins.idxmax()
            row = m.loc[idx]
            row_mins = float(mins.loc[idx])
        else:
            row = m.iloc[0]
            row_mins = 0.0
        if row_mins > best_minutes:
            best_minutes = row_mins
            best_row = row
            best_slug = p.stem
    if best_row is not None and best_slug is not None:
        return best_row, best_slug
    return None


def commit_sofa_pd_merge(
    sofa_hit: pd.Series,
    team_slug: str,
    league_key: str,
    path_name: str,
    tm_row: pd.Series,
    pd_new: float,
    sealed: pd.DataFrame,
    pending_appends: list[dict],
    updates: dict[float, float],
    matched: list[dict],
    not_text: str,
) -> None:
    oid = float(sofa_hit["Oyuncu_ID"])
    in_sealed = sealed["League"] == league_key
    same_id = sealed["Oyuncu_ID"].astype(float) == oid
    if (in_sealed & same_id).any():
        updates[oid] = float(pd_new)
        matched.append(
            {
                "Kaynak_Dosya": path_name,
                "Hedef_Lig": league_key,
                "Takim_TM": tm_row["Takim"],
                "Oyuncu_TM": tm_row["Oyuncu Adi"],
                "Oyuncu_ID": oid,
                "İsim_Sealed": sofa_hit["İsim"],
                "Takim_Adi_Sealed": str(sofa_hit.get("Takım", "")),
                "PD_Once": None,
                "PD_Sonra": pd_new,
                "Not": not_text + " (mevcut satır)",
            }
        )
        return
    cols = sealed.columns.tolist()
    pending_appends.append(row_dict_for_sealed(sofa_hit, league_key, team_slug, pd_new, cols))
    updates[oid] = float(pd_new)
    matched.append(
        {
            "Kaynak_Dosya": path_name,
            "Hedef_Lig": league_key,
            "Takim_TM": tm_row["Takim"],
            "Oyuncu_TM": tm_row["Oyuncu Adi"],
            "Oyuncu_ID": oid,
            "İsim_Sealed": sofa_hit["İsim"],
            "Takim_Adi_Sealed": str(sofa_hit.get("Takım", "")),
            "PD_Once": None,
            "PD_Sonra": pd_new,
            "Not": not_text,
        }
    )


def try_tm_sofaid_then_sofa_row(
    tm_row: pd.Series,
    league_key: str,
    path_name: str,
    pd_new: float,
    sealed: pd.DataFrame,
    pending_appends: list[dict],
    updates: dict[float, float],
    matched: list[dict],
    tm_index: pd.DataFrame,
) -> bool:
    sid = find_sofascore_id_from_tm_index(tm_row, tm_index)
    if sid is None:
        return False
    res = find_sofa_row_by_oyuncu_id(league_key, sid)
    if res is None:
        return False
    sofa_hit, team_slug = res
    if abs(float(sofa_hit["Oyuncu_ID"]) - sid) > 0.01:
        return False
    commit_sofa_pd_merge(
        sofa_hit,
        team_slug,
        league_key,
        path_name,
        tm_row,
        pd_new,
        sealed,
        pending_appends,
        updates,
        matched,
        "TM structured → sofascore_id eşleşmesi + Sofa satırı + Excel PD",
    )
    return True


def try_structured_sofa_and_pd(
    tm_row: pd.Series,
    league_key: str,
    path_name: str,
    pd_new: float,
    sealed: pd.DataFrame,
    pending_appends: list[dict],
    updates: dict[float, float],
    matched: list[dict],
) -> bool:
    np_name = norm_txt(tm_row["Oyuncu Adi"])
    if not np_name:
        return False
    slug = resolve_team_slug(league_key, str(tm_row["Takim"]))
    if not slug:
        return False
    sofa_path = STRUCTURED_SOFASCORE / league_key / f"{slug}.csv"
    if not sofa_path.is_file():
        return False
    sofa_df = pd.read_csv(sofa_path, low_memory=False)
    sofa_hit = find_sofa_player_row(sofa_df, np_name)
    if sofa_hit is None:
        return False
    commit_sofa_pd_merge(
        sofa_hit,
        slug,
        league_key,
        path_name,
        tm_row,
        pd_new,
        sealed,
        pending_appends,
        updates,
        matched,
        "İsimle structured Sofa takım dosyası + Excel PD",
    )
    return True


def find_player_row(tm_row: pd.Series, sub: pd.DataFrame):
    np_name = norm_txt(tm_row["Oyuncu Adi"])
    nt_team = norm_txt(tm_row["Takim"])
    if not np_name:
        return None

    names = sub["İsim"].map(norm_txt)
    name_matches = sub.loc[names == np_name]
    if len(name_matches) == 0:
        np_fold = norm_name_fold_particles(np_name)
        names_f = sub["İsim"].map(lambda x: norm_name_fold_particles(norm_txt(x)))
        name_matches = sub.loc[names_f == np_fold]

    if len(name_matches) == 1:
        return name_matches.iloc[0]

    if len(name_matches) > 1:
        if fuzz is None:
            return name_matches.iloc[0]
        best = None
        best_s = -1
        for _, r in name_matches.iterrows():
            sc = _team_score(nt_team, r.get("Takim_Adi", ""), r.get("Team", ""))
            if sc > best_s:
                best_s = sc
                best = r
        if best is not None and best_s >= 42:
            return best
        return None

    if fuzz is None:
        return None

    best_row = None
    best_name_sc = 0.0
    for _, r in sub.iterrows():
        nn = norm_txt(r["İsim"])
        sc = fuzzy_name_score(np_name, nn)
        if sc > best_name_sc:
            best_name_sc = sc
            best_row = r

    if best_row is None or best_name_sc < 90:
        return None

    team_sc = _team_score(nt_team, best_row.get("Takim_Adi", ""), best_row.get("Team", ""))
    if team_sc >= 38:
        return best_row

    alt = None
    alt_sc = 0
    for _, r in sub.iterrows():
        nn = norm_txt(r["İsim"])
        nsc = fuzzy_name_score(np_name, nn)
        if nsc < best_name_sc - 1:
            continue
        tsc = _team_score(nt_team, r.get("Takim_Adi", ""), r.get("Team", ""))
        if tsc > alt_sc:
            alt_sc = tsc
            alt = r
    if alt is not None and alt_sc >= 44:
        return alt
    return None


def main() -> None:
    sealed = pd.read_csv(SEALED_PATH, low_memory=False)
    tm_master = pd.read_csv(TM_MASTER_PATH, low_memory=False)
    tm_master["sofascore_id"] = pd.to_numeric(tm_master["sofascore_id"], errors="coerce")
    tm_master["PD_Guncel"] = pd.to_numeric(tm_master["PD_Guncel"], errors="coerce")

    tm_index = build_tm_sofa_name_index()

    unmatched: list[dict] = []
    skipped: list[dict] = []
    matched: list[dict] = []
    updates: dict[float, float] = {}
    pending_appends: list[dict] = []

    for stem, league_key in MANUAL_EXPORTS:
        path = resolve_export_path(stem)
        if path is None:
            print("Dosya yok:", stem, "(data/manual/ veya proje kökünde .xlsx/.csv bekleniyor)")
            continue
        raw = load_tm_table(path)
        c_team, c_play, c_val = _pick_columns(raw)
        df = raw[[c_team, c_play, c_val]].copy()
        df.columns = ["Takim", "Oyuncu Adi", "Guncel Piyasa Degeri"]

        sub = sealed.loc[sealed["League"] == league_key].copy()
        if len(sub) == 0:
            print("Uyarı: sealed içinde lig yok:", league_key)

        for _, tm_row in df.iterrows():
            pd_new = parse_tm_tr_eur(tm_row["Guncel Piyasa Degeri"])
            if pd_new is None:
                skipped.append(
                    {
                        "Kaynak_Dosya": path.name,
                        "Hedef_Lig": league_key,
                        "Takim": tm_row["Takim"],
                        "Oyuncu_Adi": tm_row["Oyuncu Adi"],
                        "Guncel_TM_Metin": tm_row["Guncel Piyasa Degeri"],
                        "Sebep": "PD parse edilemedi — rapor dışı",
                    }
                )
                continue
            hit = find_player_row(tm_row, sub)
            if hit is not None:
                oid = float(hit["Oyuncu_ID"])
                updates[oid] = float(pd_new)
                matched.append(
                    {
                        "Kaynak_Dosya": path.name,
                        "Hedef_Lig": league_key,
                        "Takim_TM": tm_row["Takim"],
                        "Oyuncu_TM": tm_row["Oyuncu Adi"],
                        "Oyuncu_ID": oid,
                        "İsim_Sealed": hit["İsim"],
                        "Takim_Adi_Sealed": hit.get("Takim_Adi", ""),
                        "PD_Once": hit.get("PD_Guncel"),
                        "PD_Sonra": pd_new,
                        "Not": "Sealed içinde doğrudan eşleşti",
                    }
                )
                continue
            if try_structured_sofa_and_pd(
                tm_row, league_key, path.name, pd_new, sealed, pending_appends, updates, matched
            ):
                continue
            if try_tm_sofaid_then_sofa_row(
                tm_row,
                league_key,
                path.name,
                pd_new,
                sealed,
                pending_appends,
                updates,
                matched,
                tm_index,
            ):
                continue
            npn = norm_txt(tm_row["Oyuncu Adi"])
            if pd_new < MIN_PD_EUR_SKIP_IF_ABSENT_IN_SOFLEAGUE and not player_present_in_league_sofa(
                league_key, npn
            ):
                skipped.append(
                    {
                        "Kaynak_Dosya": path.name,
                        "Hedef_Lig": league_key,
                        "Takim": tm_row["Takim"],
                        "Oyuncu_Adi": tm_row["Oyuncu Adi"],
                        "Parsed_PDEUR": pd_new,
                        "Sebep": (
                            f"PD < {MIN_PD_EUR_SKIP_IF_ABSENT_IN_SOFLEAGUE:,.0f} € ve Sofa lig klasöründe "
                            "isimle eşleşme yok — rapor dışı"
                        ),
                    }
                )
                continue
            unmatched.append(
                {
                    "Kaynak_Dosya": path.name,
                    "Hedef_Lig": league_key,
                    "Takim": tm_row["Takim"],
                    "Oyuncu_Adi": tm_row["Oyuncu Adi"],
                    "Guncel_TM_Metin": tm_row["Guncel Piyasa Degeri"],
                    "Parsed_PDEUR": pd_new,
                    "Sebep": explain_unmatched_after_all(
                        tm_row, league_key, explain_no_match(tm_row, sub, league_key), tm_index
                    ),
                }
            )

    if pending_appends:
        sealed = pd.concat([sealed, pd.DataFrame(pending_appends)], ignore_index=True)

    if updates or pending_appends:
        sealed["Oyuncu_ID"] = pd.to_numeric(sealed["Oyuncu_ID"], errors="coerce")
        for oid, pde in updates.items():
            sealed.loc[sealed["Oyuncu_ID"] == oid, "PD_Guncel"] = float(pde)
        sealed.to_csv(SEALED_PATH, index=False, encoding="utf-8")

        for sid, pde in updates.items():
            rows = tm_master["sofascore_id"] == sid
            if rows.any():
                tm_master.loc[rows, "PD_Guncel"] = pde
            else:
                tm_master = pd.concat(
                    [tm_master, pd.DataFrame([{"sofascore_id": sid, "PD_Guncel": pde}])],
                    ignore_index=True,
                )
        tm_master = tm_master.drop_duplicates(subset=["sofascore_id"], keep="last")
        tm_master.to_csv(TM_MASTER_PATH, index=False, encoding="utf-8-sig")

    udf = pd.DataFrame(unmatched)
    mdf = pd.DataFrame(matched)
    sdf = pd.DataFrame(skipped)
    udf.to_csv(UNMATCHED_CSV, index=False, encoding="utf-8-sig")
    mdf.to_csv(MATCHED_CSV, index=False, encoding="utf-8-sig")
    sdf.to_csv(SKIPPED_CSV, index=False, encoding="utf-8-sig")

    UNMATCHED_MD.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Manuel TM PD birleştirme — eşleşmeyen satırlar",
        "",
        f"- Eşleşen: **{len(matched)}** | Eşleşmeyen: **{len(unmatched)}** | Atlanan: **{len(skipped)}**",
        f"- Eşleşmeyen CSV: `{UNMATCHED_CSV.relative_to(ROOT)}`",
        f"- Atlanan CSV: `{SKIPPED_CSV.relative_to(ROOT)}`",
        "",
        "## Özet (lig × kaynak dosya)",
        "",
    ]
    if len(udf) > 0:
        g = udf.groupby(["Hedef_Lig", "Kaynak_Dosya"]).size().reset_index(name="adet")
        for _, r in g.iterrows():
            lines.append(f"- **{r['Hedef_Lig']}** / {r['Kaynak_Dosya']}: {int(r['adet'])} oyuncu")
        lines.extend(["", "## Liste (ilk 200 satır)", ""])
        show = udf.head(200)
        lines.append("| Lig | Takım (TM) | Oyuncu | Sebep |")
        lines.append("|-----|------------|--------|-------|")
        for _, r in show.iterrows():
            lig = str(r.get("Hedef_Lig", ""))
            tm = str(r.get("Takim", "")).replace("|", "\\|")
            op = str(r.get("Oyuncu_Adi", "")).replace("|", "\\|")
            sb = str(r.get("Sebep", "")).replace("|", "\\|")
            lines.append(f"| {lig} | {tm} | {op} | {sb} |")
        if len(udf) > 200:
            lines.append("")
            lines.append(f"*… ve {len(udf) - 200} satır daha (tam liste CSV’de).*")
    else:
        lines.append("_Eşleşmeyen yok._")

    UNMATCHED_MD.write_text("\n".join(lines), encoding="utf-8")

    print("Tamamlandı.")
    print("Eşleşen:", len(matched), "| Eşleşmeyen:", len(unmatched), "| Atlanan:", len(skipped))
    print("Rapor:", UNMATCHED_MD.relative_to(ROOT))
    print("Eşleşmeyen CSV:", UNMATCHED_CSV.relative_to(ROOT))
    print("Atlanan CSV:", SKIPPED_CSV.relative_to(ROOT))


if __name__ == "__main__":
    main()
