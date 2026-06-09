from pathlib import Path
import pandas as pd
import re
import os


PROJECT_ROOT = Path(".")
REPORT_DIR = Path("data/reports/catalog")
REPORT_DIR.mkdir(parents=True, exist_ok=True)

CSV_CATALOG_OUTPUT = REPORT_DIR / "csv_catalog.csv"
COLUMN_CATALOG_OUTPUT = REPORT_DIR / "column_catalog.csv"
DATASET_CANDIDATES_OUTPUT = REPORT_DIR / "dataset_candidates.csv"


IGNORE_PARTS = {
    "__pycache__",
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "env",
    "catboost_info",
}


IMPORTANT_KEYWORDS = {
    "player": ["player", "oyuncu", "name", "player_name"],
    "sofascore_id": ["sofa", "sofascore", "sofascore_id", "sofa_id"],
    "market_value": ["market", "value", "piyasa", "deger", "valuation", "price", "pd"],
    "league": ["league", "lig", "competition"],
    "club": ["club", "team", "squad", "takim", "kulup"],
    "position": ["position", "pos", "mevki"],
    "age": ["age", "yas"],
    "minutes": ["minutes", "mins", "dakika"],
    "goals": ["goals", "goal", "gol"],
    "assists": ["assists", "assist", "asist"],
}


def should_ignore(path: Path) -> bool:
    parts = set(path.parts)
    return bool(parts.intersection(IGNORE_PARTS))


def read_csv_safely(file_path: Path):
    encodings = ["utf-8-sig", "utf-8", "cp1254", "latin1"]
    separators = [",", ";", "\t"]

    last_error = None

    for enc in encodings:
        for sep in separators:
            try:
                df = pd.read_csv(file_path, encoding=enc, sep=sep, low_memory=False)

                # Yanlış separator seçildiyse genelde tek kolon gelir.
                if len(df.columns) <= 1:
                    continue

                return df, enc, sep
            except Exception as e:
                last_error = e

    raise ValueError(f"CSV okunamadı. Son hata: {last_error}")


def normalize_text(value):
    value = str(value).strip().lower()
    value = value.replace("ı", "i").replace("ğ", "g").replace("ü", "u")
    value = value.replace("ş", "s").replace("ö", "o").replace("ç", "c")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value


def detect_column_group(columns, keywords):
    normalized_columns = [normalize_text(c) for c in columns]

    for col, normalized_col in zip(columns, normalized_columns):
        for keyword in keywords:
            keyword = normalize_text(keyword)
            if keyword in normalized_col:
                return col

    return None


def main():
    csv_files = [
        p for p in PROJECT_ROOT.rglob("*.csv")
        if not should_ignore(p)
    ]

    print(f"Toplam CSV bulundu: {len(csv_files)}")
    print("Kataloglama başlıyor...\n")

    csv_rows = []
    column_rows = []
    candidate_rows = []

    for file_path in csv_files:
        rel_path = file_path.as_posix()

        try:
            file_size_mb = round(os.path.getsize(file_path) / (1024 * 1024), 3)
        except Exception:
            file_size_mb = None

        try:
            df, encoding, sep = read_csv_safely(file_path)
            status = "ok"
            error = ""
        except Exception as e:
            csv_rows.append({
                "path": rel_path,
                "status": "read_error",
                "error": str(e),
                "rows": None,
                "columns_count": None,
                "file_size_mb": file_size_mb,
                "missing_total": None,
                "missing_ratio": None,
                "duplicate_rows": None,
                "encoding": None,
                "separator": None,
                "columns": ""
            })
            continue

        rows = len(df)
        cols = len(df.columns)
        total_cells = rows * cols if rows > 0 and cols > 0 else 0
        missing_total = int(df.isna().sum().sum())
        missing_ratio = round(missing_total / total_cells, 4) if total_cells else 0
        duplicate_rows = int(df.duplicated().sum())

        detected = {}
        for group_name, keywords in IMPORTANT_KEYWORDS.items():
            detected[group_name] = detect_column_group(df.columns, keywords)

        csv_rows.append({
            "path": rel_path,
            "status": status,
            "error": error,
            "rows": rows,
            "columns_count": cols,
            "file_size_mb": file_size_mb,
            "missing_total": missing_total,
            "missing_ratio": missing_ratio,
            "duplicate_rows": duplicate_rows,
            "encoding": encoding,
            "separator": sep,
            "columns": " | ".join(map(str, df.columns)),
            "player_col": detected["player"],
            "sofascore_id_col": detected["sofascore_id"],
            "market_value_col": detected["market_value"],
            "league_col": detected["league"],
            "club_col": detected["club"],
            "position_col": detected["position"],
            "age_col": detected["age"],
            "minutes_col": detected["minutes"],
            "goals_col": detected["goals"],
            "assists_col": detected["assists"],
        })

        for col in df.columns:
            series = df[col]
            column_rows.append({
                "path": rel_path,
                "column": col,
                "normalized_column": normalize_text(col),
                "dtype": str(series.dtype),
                "missing_count": int(series.isna().sum()),
                "missing_ratio": round(series.isna().sum() / rows, 4) if rows else 0,
                "unique_count": int(series.nunique(dropna=True)),
                "sample_values": " | ".join(
                    series.dropna().astype(str).drop_duplicates().head(8).tolist()
                )
            })

        # Eğitim datası adayı skoru
        score = 0
        reasons = []

        if rows and rows >= 500:
            score += 2
            reasons.append("500+ rows")

        if rows and rows >= 2000:
            score += 2
            reasons.append("2000+ rows")

        if detected["player"]:
            score += 2
            reasons.append("player column")

        if detected["market_value"]:
            score += 4
            reasons.append("market value column")

        if detected["league"]:
            score += 3
            reasons.append("league column")

        if detected["sofascore_id"]:
            score += 3
            reasons.append("sofascore id column")

        if detected["age"]:
            score += 1
            reasons.append("age column")

        if detected["position"]:
            score += 1
            reasons.append("position column")

        if missing_ratio < 0.10:
            score += 2
            reasons.append("low missing ratio")

        if duplicate_rows == 0:
            score += 1
            reasons.append("no duplicate rows")

        # Audit/unmatched/prediction dosyalarını eğitim datası adayı olarak zayıflat.
        lower_path = rel_path.lower()
        bad_name_signals = [
            "audit",
            "unmatched",
            "prediction",
            "predictions",
            "report",
            "quality",
            "remaining",
            "club_quality",
            "league_quality"
        ]

        if any(signal in lower_path for signal in bad_name_signals):
            score -= 5
            reasons.append("looks like report/audit/prediction")

        candidate_rows.append({
            "path": rel_path,
            "candidate_score": score,
            "reasons": " | ".join(reasons),
            "rows": rows,
            "columns_count": cols,
            "missing_ratio": missing_ratio,
            "duplicate_rows": duplicate_rows,
            "player_col": detected["player"],
            "sofascore_id_col": detected["sofascore_id"],
            "market_value_col": detected["market_value"],
            "league_col": detected["league"],
            "club_col": detected["club"],
            "position_col": detected["position"],
            "age_col": detected["age"],
        })

    csv_catalog = pd.DataFrame(csv_rows)
    column_catalog = pd.DataFrame(column_rows)
    dataset_candidates = pd.DataFrame(candidate_rows)

    csv_catalog.to_csv(CSV_CATALOG_OUTPUT, index=False, encoding="utf-8-sig")
    column_catalog.to_csv(COLUMN_CATALOG_OUTPUT, index=False, encoding="utf-8-sig")
    dataset_candidates.sort_values(
        ["candidate_score", "rows"],
        ascending=[False, False]
    ).to_csv(DATASET_CANDIDATES_OUTPUT, index=False, encoding="utf-8-sig")

    print("Kataloglama tamamlandı.\n")
    print(f"CSV katalog: {CSV_CATALOG_OUTPUT}")
    print(f"Kolon katalog: {COLUMN_CATALOG_OUTPUT}")
    print(f"Dataset adayları: {DATASET_CANDIDATES_OUTPUT}")

    print("\nEn güçlü eğitim datası adayları:")
    print(
        dataset_candidates.sort_values(
            ["candidate_score", "rows"],
            ascending=[False, False]
        )
        .head(20)
        [["candidate_score", "path", "rows", "columns_count", "missing_ratio", "market_value_col", "league_col", "sofascore_id_col"]]
        .to_string(index=False)
    )


if __name__ == "__main__":
    main()