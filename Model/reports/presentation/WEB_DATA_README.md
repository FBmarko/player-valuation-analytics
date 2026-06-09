# Web sitesi — veri kaynağı

Bu klasör **sunum ve statik web** için üretilmiştır. Site şu dosyaları okuyabilir:

## Önerilen entegrasyon

1. **Build / deploy öncesi** sunucu veya CI’da çalıştır:
   `python src/model/generate_presentation_bundle.py`
2. Üretilen `reports/presentation/*.json` ve `.csv` dosyalarını frontend **public** dizinine kopyala:
   - Örnek (Vite/React): `public/data/pd_model/metrics_summary.json`
   - Örnek (Next.js): `public/data/pd_model/...` veya `static/...`
3. Sayfada `fetch('/data/pd_model/metrics_summary.json')` ile çek.

## Dosya yolları (repo içi)

Kök: `reports\presentation`

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
