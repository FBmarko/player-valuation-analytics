import pandas as pd

from season_enrichment import enrich_sealed_with_raw_leagues

print("\N{ROCKET} Tarihsel sezonlar ekleniyor...")

sealed = pd.read_csv("data/processed/sealed_master_dataset.csv")

enriched = enrich_sealed_with_raw_leagues(sealed, league_dir="data/raw/leagues", verbose=False)

out_path = "data/processed/sealed_master_dataset.csv"
enriched.to_csv(out_path, index=False, encoding="utf-8")
print("Tamamlandı:", out_path)
