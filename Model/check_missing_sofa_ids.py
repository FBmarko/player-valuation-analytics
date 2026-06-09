from pathlib import Path
import pandas as pd
import re


BASE_DIR = Path("data/structured/transfermarkt")

REPORT_DIR = Path("data/reports")
REPORT_DIR.mkdir(parents=True, exist_ok=True)

SUMMARY_OUTPUT = REPORT_DIR / "missing_sofa_id_summary.csv"
DETAIL_OUTPUT = REPORT_DIR / "missing_sofa_id_rows.csv"


# Buraya senin gerçek kolon adını da özellikle ekledik.
SOFA_COLUMN_CANDIDATES = [
    "sofascore_id",
    "sofascoreid",
    "sofa_id",
    "sofaid",
    "sofa_score_id",
    "sofa score id",
    "SofaScore ID",
    "Sofascore ID",
    "sofascore player id",
    "sofa_player_id",
]

PLAYER_NAME_CANDIDATES = [
    "player_name",
    "name",
    "player",
    "oyuncu",
    "Oyuncu",
    "Name",
    "Player"
]


def normalize_col_name(col):
    """
    Kolon adlarını karşılaştırmak için sadeleştirir.
    Örnek:
    'SofaScore ID' -> 'sofascoreid'
    'sofascore_id' -> 'sofascoreid'
    'sofa-score-id' -> 'sofascoreid'
    """
    col = str(col).strip().lower()
    col = re.sub(r"[^a-z0-9]", "", col)
    return col


def read_csv_safely(file_path: Path):
    encodings = ["utf-8-sig", "utf-8", "cp1254", "latin1"]
    separators = [",", ";", "\t"]

    last_error = None

    for enc in encodings:
        for sep in separators:
            try:
                df = pd.read_csv(
                    file_path,
                    encoding=enc,
                    sep=sep
                )

                # Yanlış separator seçilirse genelde tek kolon gelir.
                # Tek kolon geldiyse diğer separatorları denemeye devam edelim.
                if len(df.columns) <= 1:
                    continue

                return df

            except Exception as e:
                last_error = e

    raise ValueError(f"CSV okunamadı veya separator bulunamadı. Son hata: {last_error}")


def find_column(columns, candidates):
    normalized_candidates = [normalize_col_name(c) for c in candidates]

    # Önce birebir normalize eşleşme ara.
    for col in columns:
        normalized_col = normalize_col_name(col)
        if normalized_col in normalized_candidates:
            return col

    # Sonra içinde sofa/sofascore geçen kolon var mı diye ara.
    for col in columns:
        normalized_col = normalize_col_name(col)
        if "sofa" in normalized_col or "sofascore" in normalized_col:
            return col

    return None


def find_player_column(columns):
    normalized_candidates = [normalize_col_name(c) for c in PLAYER_NAME_CANDIDATES]

    for col in columns:
        normalized_col = normalize_col_name(col)
        if normalized_col in normalized_candidates:
            return col

    for col in columns:
        normalized_col = normalize_col_name(col)
        if "player" in normalized_col or "name" in normalized_col or "oyuncu" in normalized_col:
            return col

    return None


def is_missing_sofa_id(value):
    if pd.isna(value):
        return True

    value_str = str(value).strip().lower()

    missing_values = {
        "",
        "nan",
        "none",
        "null",
        "na",
        "n/a",
        "-",
        "--",
        "0",
        "0.0"
    }

    return value_str in missing_values


def main():
    if not BASE_DIR.exists():
        print(f"Klasör bulunamadı: {BASE_DIR.resolve()}")
        return

    csv_files = list(BASE_DIR.rglob("*.csv"))

    print(f"Toplam CSV dosyası bulundu: {len(csv_files)}")
    print("Kontrol başlıyor...\n")

    summary_rows = []
    detail_rows = []

    for file_path in csv_files:
        try:
            df = read_csv_safely(file_path)
        except Exception as e:
            summary_rows.append({
                "file": str(file_path),
                "league_folder": file_path.parent.name,
                "status": "read_error",
                "error": str(e),
                "columns": "",
                "total_rows": None,
                "missing_sofa_id_count": None,
                "missing_ratio": None,
                "sofa_id_column": None,
                "player_name_column": None
            })
            continue

        sofa_col = find_column(df.columns, SOFA_COLUMN_CANDIDATES)
        player_col = find_player_column(df.columns)

        if sofa_col is None:
            summary_rows.append({
                "file": str(file_path),
                "league_folder": file_path.parent.name,
                "status": "sofa_id_column_not_found",
                "error": "",
                "columns": " | ".join(map(str, df.columns)),
                "total_rows": len(df),
                "missing_sofa_id_count": None,
                "missing_ratio": None,
                "sofa_id_column": None,
                "player_name_column": player_col
            })
            continue

        missing_mask = df[sofa_col].apply(is_missing_sofa_id)
        missing_df = df[missing_mask].copy()

        total_rows = len(df)
        missing_count = len(missing_df)
        missing_ratio = round(missing_count / total_rows, 4) if total_rows > 0 else 0

        summary_rows.append({
            "file": str(file_path),
            "league_folder": file_path.parent.name,
            "status": "checked",
            "error": "",
            "columns": " | ".join(map(str, df.columns)),
            "total_rows": total_rows,
            "missing_sofa_id_count": missing_count,
            "missing_ratio": missing_ratio,
            "sofa_id_column": sofa_col,
            "player_name_column": player_col
        })

        if missing_count > 0:
            for index, row in missing_df.iterrows():
                detail_rows.append({
                    "file": str(file_path),
                    "league_folder": file_path.parent.name,
                    "row_index": index,
                    "player_name": row[player_col] if player_col else "",
                    "sofa_id_column": sofa_col,
                    "sofa_id_value": row[sofa_col]
                })

    summary_df = pd.DataFrame(summary_rows)
    detail_df = pd.DataFrame(detail_rows)

    summary_df.to_csv(SUMMARY_OUTPUT, index=False, encoding="utf-8-sig")
    detail_df.to_csv(DETAIL_OUTPUT, index=False, encoding="utf-8-sig")

    print("Kontrol tamamlandı.\n")

    print("Durum özeti:")
    print(summary_df["status"].value_counts().to_string())

    checked_files = summary_df[summary_df["status"] == "checked"]
    files_with_missing = checked_files[checked_files["missing_sofa_id_count"] > 0]

    print()
    print(f"Özet rapor: {SUMMARY_OUTPUT}")
    print(f"Detay rapor: {DETAIL_OUTPUT}\n")

    print(f"Kontrol edilen dosya sayısı: {len(checked_files)}")
    print(f"Sofa ID eksiği olan dosya sayısı: {len(files_with_missing)}")

    if len(files_with_missing) > 0:
        print("\nSofa ID eksiği olan ilk dosyalar:")
        print(
            files_with_missing[
                ["league_folder", "file", "total_rows", "missing_sofa_id_count", "missing_ratio", "sofa_id_column"]
            ].head(30).to_string(index=False)
        )
    else:
        print("\nKontrol edilen dosyalarda boş Sofa ID bulunamadı.")


if __name__ == "__main__":
    main()