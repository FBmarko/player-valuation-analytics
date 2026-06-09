# Sunum metrik özeti (otomatik)

- Üretim zamanı (UTC): `2026-05-06T16:37:00Z`
- Aynı oyuncu sızmaz test için: **GroupShuffleSplit** grupta `Oyuncu_ID`.

## Modeller

### Dürüst model (tarihsel PD yok)
- R² test: **48.17%**
- MAE: **5,320,902 €** | RMSE: **12,414,468 €**
- Ortalama göreli hata (MAPE benzeri): **150.57%**
- 2× band içi: **40.35%** | Test n: **3234**

### Benchmark (tarihsel PD dahil)
- R² test: **90.23%**
- MAE: **2,485,791 €** | RMSE: **5,389,898 €**
- 2× band içi: **80.24%** | Test n: **3234**

## Dosyalar

| Dosya | İçerik |
|-------|--------|
| `metrics_summary.json` | Tüm metrikler (web/API) |
| `model_comparison.csv` | Slide tablo |
| `league_metrics_*_test.csv` | Lig bazlı R²/MAE |
| `scatter_*_test.json` | Gerçek vs tahmin scatter grafik |
| `predictions_sample_*.csv` | Örnek oyuncu satırları |
| `predictions_worst15_honest.csv` | En büyük hatalar (dürüst) |
| `WEB_DATA_README.md` | Site entegrasyonu |
| `slide_outline.md` | Slayt iskeleti |
