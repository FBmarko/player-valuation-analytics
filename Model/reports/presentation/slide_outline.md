# Slayt iskeleti (öneri)

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
