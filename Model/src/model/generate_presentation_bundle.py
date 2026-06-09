"""
Sunum + web için metrik / örnek / grafik verisi üretir.

Çıktı: reports/presentation/

Koşum (proje kökünden): python src/model/generate_presentation_bundle.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

OUT_DIR = ROOT / "reports" / "presentation"

TARGET = "PD_Guncel"
DROP_COLS = [
    "Oyuncu_ID",
    "id",
    "İsim",
    "name",
    "first_name",
    "last_name",
    "url",
    "image_url",
    "current_club_name",
    "agent_name",
    "Takim_Adi",
    "Takım",
    TARGET,
]

HISTORICAL_PD = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
]

RANDOM_STATE = 42
TEST_SIZE = 0.15
SCATTER_CAP = 2500
SAMPLE_ROWS = 400


def _prepare_X(df: pd.DataFrame, keep_historical_pd: bool) -> pd.DataFrame:
    X = df.drop(columns=[c for c in DROP_COLS if c in df.columns], errors="ignore")
    if not keep_historical_pd:
        X = X.drop(columns=[c for c in HISTORICAL_PD if c in X.columns], errors="ignore")
    cats = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()
    for c in cats:
        X[c] = X[c].fillna("Unknown").astype(str)
    return X


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = r2_score(y_true, y_pred)
    denom = np.maximum(np.abs(y_true), 1.0)
    mape = float(np.mean(np.abs(y_true - y_pred) / denom) * 100)
    within_2x = float(
        np.mean((y_pred >= y_true * 0.5) & (y_pred <= y_true * 2.0)) * 100
    )
    return {
        "r2": float(r2),
        "r2_pct": round(float(r2) * 100, 2),
        "mae_eur": float(mae),
        "rmse_eur": float(rmse),
        "mape_pct": round(mape, 2),
        "within_2x_band_pct": round(within_2x, 2),
        "n_test": int(len(y_true)),
    }


def _evaluate_model(
    model_path: Path,
    data_path: Path,
    keep_historical_pd: bool,
) -> tuple[dict, pd.DataFrame] | tuple[None, None]:
    if not model_path.is_file() or not data_path.is_file():
        return None, None
    df = pd.read_csv(data_path, low_memory=False)
    if TARGET not in df.columns or "Oyuncu_ID" not in df.columns:
        return None, None
    pdv = pd.to_numeric(df[TARGET], errors="coerce")
    ok = pdv.notna() & (pdv > 0)
    df = df.loc[ok].reset_index(drop=True)
    X = _prepare_X(df, keep_historical_pd)
    y = pd.to_numeric(df[TARGET], errors="coerce").values
    groups = df["Oyuncu_ID"].astype(float)
    gss = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
    idx_train, idx_test = next(gss.split(X, y, groups=groups))

    model = joblib.load(model_path)
    y_test = y[idx_test]
    y_pred = model.predict(X.iloc[idx_test])

    meta = _metrics(y_test, y_pred)
    meta["model_path"] = str(model_path.relative_to(ROOT))
    meta["data_path"] = str(data_path.relative_to(ROOT))
    meta["n_train"] = int(len(idx_train))
    meta["feature_count"] = int(X.shape[1])

    out = df.iloc[idx_test].copy()
    out["_y_true"] = y_test
    out["_y_pred"] = y_pred
    out["_abs_err"] = np.abs(y_test - y_pred)
    out["_pct_err"] = np.abs(y_test - y_pred) / np.maximum(np.abs(y_test), 1.0) * 100

    return meta, out


def _league_breakdown(test_df: pd.DataFrame, min_n: int = 40) -> list[dict]:
    rows = []
    if "League" not in test_df.columns:
        return rows
    for lg, sub in test_df.groupby("League"):
        if len(sub) < min_n:
            continue
        yt = sub["_y_true"].values
        pr = sub["_y_pred"].values
        m = _metrics(yt, pr)
        rows.append({"League": str(lg), **m})
    return sorted(rows, key=lambda x: -x["n_test"])


def _scatter_json(test_df: pd.DataFrame, cap: int) -> list[dict]:
    sub = test_df.sample(n=min(cap, len(test_df)), random_state=RANDOM_STATE)
    out = []
    for _, r in sub.iterrows():
        name = r.get("İsim", "")
        out.append(
            {
                "actual_eur": float(r["_y_true"]),
                "predicted_eur": float(r["_y_pred"]),
                "player": str(name) if pd.notna(name) else "",
                "league": str(r.get("League", "")),
                "team": str(r.get("Team", "")),
            }
        )
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    honest_model = ROOT / "models" / "elite_stacking_model.pkl"
    honest_data = ROOT / "data" / "processed" / "engineered_master_dataset.csv"
    bench_model = ROOT / "models" / "elite_stacking_model_high_r2.pkl"
    bench_data = ROOT / "data" / "processed" / "engineered_master_dataset_high_r2.csv"

    honest_meta, honest_test = _evaluate_model(honest_model, honest_data, keep_historical_pd=False)
    bench_meta, bench_test = _evaluate_model(bench_model, bench_data, keep_historical_pd=True)

    bundle = {
        "generated_utc": generated,
        "split": {
            "method": "GroupShuffleSplit",
            "test_size": TEST_SIZE,
            "random_state": RANDOM_STATE,
            "group": "Oyuncu_ID",
        },
        "models": {
            "honest_pd_minimal_leakage": honest_meta,
            "benchmark_historical_pd": bench_meta,
        },
    }

    (OUT_DIR / "metrics_summary.json").write_text(
        json.dumps(bundle, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # model_comparison.csv
    comp_rows = []
    if honest_meta:
        comp_rows.append(
            {
                "model_key": "honest",
                "description": "Tarihsel PD yok / düşük sızıntı",
                **{k: v for k, v in honest_meta.items() if k not in ("model_path", "data_path")},
            }
        )
    if bench_meta:
        comp_rows.append(
            {
                "model_key": "benchmark",
                "description": "Tarihsel PD dahil (R² üst sınır)",
                **{k: v for k, v in bench_meta.items() if k not in ("model_path", "data_path")},
            }
        )
    if comp_rows:
        pd.DataFrame(comp_rows).to_csv(OUT_DIR / "model_comparison.csv", index=False, encoding="utf-8-sig")

    # League CSV + scatter JSON + samples
    if honest_test is not None:
        pd.DataFrame(_league_breakdown(honest_test)).to_csv(
            OUT_DIR / "league_metrics_honest_test.csv", index=False, encoding="utf-8-sig"
        )
        (OUT_DIR / "scatter_honest_test.json").write_text(
            json.dumps(_scatter_json(honest_test, SCATTER_CAP), ensure_ascii=False),
            encoding="utf-8",
        )
        top = honest_test.nlargest(15, "_abs_err")
        sm = honest_test.sample(n=min(SAMPLE_ROWS, len(honest_test)), random_state=RANDOM_STATE)
        cols = [c for c in ["İsim", "League", "Team", "TM_Position", TARGET] if c in sm.columns]
        sm[cols + ["_y_true", "_y_pred", "_abs_err", "_pct_err"]].rename(
            columns={"_y_true": "PD_Gercek", "_y_pred": "PD_Tahmin", "_abs_err": "Hata_EUR", "_pct_err": "Hata_Pct"}
        ).to_csv(OUT_DIR / "predictions_sample_honest.csv", index=False, encoding="utf-8-sig")
        top[cols + ["_y_true", "_y_pred", "_abs_err"]].rename(
            columns={"_y_true": "PD_Gercek", "_y_pred": "PD_Tahmin", "_abs_err": "Hata_EUR"}
        ).to_csv(OUT_DIR / "predictions_worst15_honest.csv", index=False, encoding="utf-8-sig")

    if bench_test is not None:
        pd.DataFrame(_league_breakdown(bench_test)).to_csv(
            OUT_DIR / "league_metrics_benchmark_test.csv", index=False, encoding="utf-8-sig"
        )
        (OUT_DIR / "scatter_benchmark_test.json").write_text(
            json.dumps(_scatter_json(bench_test, SCATTER_CAP), ensure_ascii=False),
            encoding="utf-8",
        )
        sm = bench_test.sample(n=min(SAMPLE_ROWS, len(bench_test)), random_state=RANDOM_STATE)
        cols = [c for c in ["İsim", "League", "Team", "TM_Position", TARGET] if c in sm.columns]
        sm[cols + ["_y_true", "_y_pred", "_abs_err", "_pct_err"]].rename(
            columns={"_y_true": "PD_Gercek", "_y_pred": "PD_Tahmin", "_abs_err": "Hata_EUR", "_pct_err": "Hata_Pct"}
        ).to_csv(OUT_DIR / "predictions_sample_benchmark.csv", index=False, encoding="utf-8-sig")

    # metrics_summary.md
    lines = [
        "# Sunum metrik özeti (otomatik)",
        "",
        f"- Üretim zamanı (UTC): `{generated}`",
        "- Aynı oyuncu sızmaz test için: **GroupShuffleSplit** grupta `Oyuncu_ID`.",
        "",
        "## Modeller",
        "",
    ]
    if honest_meta:
        lines.append("### Dürüst model (tarihsel PD yok)")
        lines.append(f"- R² test: **{honest_meta['r2_pct']}%**")
        lines.append(f"- MAE: **{honest_meta['mae_eur']:,.0f} €** | RMSE: **{honest_meta['rmse_eur']:,.0f} €**")
        lines.append(f"- Ortalama göreli hata (MAPE benzeri): **{honest_meta['mape_pct']}%**")
        lines.append(f"- 2× band içi: **{honest_meta['within_2x_band_pct']}%** | Test n: **{honest_meta['n_test']}**")
        lines.append("")
    else:
        lines.append("_Dürüst model veya `engineered_master_dataset.csv` bulunamadı._")
        lines.append("")
    if bench_meta:
        lines.append("### Benchmark (tarihsel PD dahil)")
        lines.append(f"- R² test: **{bench_meta['r2_pct']}%**")
        lines.append(f"- MAE: **{bench_meta['mae_eur']:,.0f} €** | RMSE: **{bench_meta['rmse_eur']:,.0f} €**")
        lines.append(f"- 2× band içi: **{bench_meta['within_2x_band_pct']}%** | Test n: **{bench_meta['n_test']}**")
        lines.append("")
    else:
        lines.append("_Benchmark model veya `engineered_master_dataset_high_r2.csv` bulunamadı._")
        lines.append("")

    lines.extend(
        [
            "## Dosyalar",
            "",
            "| Dosya | İçerik |",
            "|-------|--------|",
            "| `metrics_summary.json` | Tüm metrikler (web/API) |",
            "| `model_comparison.csv` | Slide tablo |",
            "| `league_metrics_*_test.csv` | Lig bazlı R²/MAE |",
            "| `scatter_*_test.json` | Gerçek vs tahmin scatter grafik |",
            "| `predictions_sample_*.csv` | Örnek oyuncu satırları |",
            "| `predictions_worst15_honest.csv` | En büyük hatalar (dürüst) |",
            "| `WEB_DATA_README.md` | Site entegrasyonu |",
            "| `slide_outline.md` | Slayt iskeleti |",
            "",
        ]
    )
    (OUT_DIR / "metrics_summary.md").write_text("\n".join(lines), encoding="utf-8")

    web_readme = f"""# Web sitesi — veri kaynağı

Bu klasör **sunum ve statik web** için üretilmiştır. Site şu dosyaları okuyabilir:

## Önerilen entegrasyon

1. **Build / deploy öncesi** sunucu veya CI’da çalıştır:
   `python src/model/generate_presentation_bundle.py`
2. Üretilen `reports/presentation/*.json` ve `.csv` dosyalarını frontend **public** dizinine kopyala:
   - Örnek (Vite/React): `public/data/pd_model/metrics_summary.json`
   - Örnek (Next.js): `public/data/pd_model/...` veya `static/...`
3. Sayfada `fetch('/data/pd_model/metrics_summary.json')` ile çek.

## Dosya yolları (repo içi)

Kök: `{OUT_DIR.relative_to(ROOT)}`

| Dosya | Kullanım |
|-------|----------|
| `metrics_summary.json` | Özet kartlar, model karşılaştırma |
| `scatter_honest_test.json` | Chart.js / ECharts scatter |
| `scatter_benchmark_test.json` | İkinci grafik (benchmark) |
| `model_comparison.csv` | Tablo bileşeni |
| `league_metrics_honest_test.csv` | Lig filtresi / çubuk grafik |

## Modeller (tahmin API’si değil)

Canlı tahmin için ayrıca **`.pkl` model dosyalarını** backend’de (Python FastAPI/Flask)
yükleyip `predict` endpoint’i yazman gerekir. Bu klasör sadece **önceden hesaplanmış metrik ve örnekler** içindir.

## Veriyi “kaydetme”

- **Eğitilmiş model**: `models/elite_stacking_model.pkl` ve isteğe bağlı `elite_stacking_model_high_r2.pkl` — `joblib.dump` ile zaten kayıtlı.
- **İşlenmiş tablo**: `data/processed/engineered_master_dataset.csv` (ve benchmark için `engineered_master_dataset_high_r2.csv`).
- **Sunum paketi**: bu script ile `reports/presentation/` — git’e commit edebilir veya release artefact olarak arşivlersin.
"""
    (OUT_DIR / "WEB_DATA_README.md").write_text(web_readme, encoding="utf-8")

    slide = """# Slayt iskeleti (öneri)

1. **Problem**: Oyuncu piyasa değeri (PD) tahmini — veri: Sofa performans + lig + TM alanları.
2. **Veri hattı**: Structured Sofa + TM → `sealed` → `feature_engineering` → `engineered`.
3. **İki model stratejisi**:
   - Dürüst: tarihsel PD özellikleri **yok** → düşük sızıntı, daha zor görev.
   - Benchmark: tarihsel PD **var** → yüksek R², üst sınır / kıyaslama.
4. **Metrikler** (tablo: `model_comparison.csv`):
   - R², MAE, RMSE, 2× band, örnek MAPE.
5. **Grafik**: Gerçek vs tahmin (`scatter_*_test.json`).
6. **Lig analizi**: `league_metrics_*_test.csv` — hangi ligde model daha iyi.
7. **Hata örnekleri**: `predictions_worst15_honest.csv` — sınırlılıklar.
8. **Web**: Statik JSON + (isteğe bağlı) backend predict.
"""
    (OUT_DIR / "slide_outline.md").write_text(slide, encoding="utf-8")

    print("Tamamlandı:", OUT_DIR.relative_to(ROOT))
    if not honest_meta:
        print("Uyarı: dürüst model veya veri eksik.")
    if not bench_meta:
        print("Uyarı: benchmark model veya veri eksik.")


if __name__ == "__main__":
    main()
