import pandas as pd
import joblib

HISTORICAL_PD_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
]

model = joblib.load('models/elite_stacking_model.pkl')
df = pd.read_csv('data/processed/engineered_master_dataset.csv')

drop_cols = ['Oyuncu_ID', 'id', 'İsim', 'name', 'first_name', 'last_name', 'url', 'image_url', 'current_club_name', 'agent_name', 'PD_Guncel']
X = df.drop(columns=[c for c in drop_cols if c in df.columns], errors='ignore')
X = X.drop(columns=[c for c in HISTORICAL_PD_COLUMNS if c in X.columns], errors='ignore')

cats = X.select_dtypes(include=['object', 'string', 'category']).columns.tolist()
for c in cats: X[c] = X[c].fillna('Unknown').astype(str)

predictions = model.predict(X)
df['AI_Predicted_PD'] = predictions
df['Value_Difference_Euro'] = df['AI_Predicted_PD'] - df['PD_Guncel']

undervalued = df[df['PD_Guncel'] > 0].copy()
undervalued = undervalued.sort_values('Value_Difference_Euro', ascending=False).head(50)

undervalued['PD_Guncel'] = undervalued['PD_Guncel'].apply(lambda x: f'{x:,.0f} €')
undervalued['AI_Predicted_PD'] = undervalued['AI_Predicted_PD'].apply(lambda x: f'{x:,.0f} €')
undervalued['Value_Difference_Euro'] = undervalued['Value_Difference_Euro'].apply(lambda x: f'+{x:,.0f} €')

md_content = '# Yapay Zeka Tarafından Keşfedilen Piyasa Değerinin Altında Kalan (Under-Valued) Top 50 Oyuncu\n\n'
md_content += '| Sıra | Oyuncu İsim | Lig | Mevki | Mevcut TM Değeri | Yapay Zeka Tahmini | Fırsat/Fark |\n'
md_content += '|:---|:---|:---|:---|:---|:---|:---|\n'

rank = 1
for _, row in undervalued.iterrows():
    isim = row.get('İsim', 'Bilinmiyor')
    lig = row.get('League', '-')
    mevki = row.get('TM_Position', '-')
    pd_guncel = row.get('PD_Guncel', '-')
    ai_pd = row.get('AI_Predicted_PD', '-')
    fark = row.get('Value_Difference_Euro', '-')
    md_content += f"| **{rank}** | **{isim}** | {lig} | {mevki} | {pd_guncel} | {ai_pd} | **{fark}** |\n"
    rank += 1

artifact_path = r'C:\Users\onlyf\.gemini\antigravity\brain\da5ae64f-4f05-488f-8d1d-175dd91aca49\firsat_oyuncular_top50.md'
with open(artifact_path, 'w', encoding='utf-8') as f:
    f.write(md_content)

    
print("Tamamlandı.")
