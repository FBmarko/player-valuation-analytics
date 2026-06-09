import pandas as pd
import os

from dataset_version import EXCLUDED_LEAGUES_FROM_DATASET_VERSION
from column_normalization import normalize_team_columns
from season_enrichment import enrich_sealed_with_raw_leagues
from sofa_metrics_drop import drop_sofa_extension_columns

print("\N{ROCKET} Master derleniyor... Biraz sürebilir.")
print("Piyasa değerleri (sadece son kayıt — TM current yoksa yedek)...")
try:
    val_df = pd.read_csv('data/raw/player_valuations.csv')
    val_df['date'] = pd.to_datetime(val_df['date'])
    val_df = val_df.sort_values('date')
    history_last = {}
    for pid, group in val_df.groupby('player_id'):
        history_last[pid] = (
            float(group.iloc[-1]['market_value_in_eur']) if len(group) else 0.0
        )
except Exception as e:
    print("Uyarı: player_valuations.csv atlandı.", e)
    history_last = {}

print("Transfermarkt...")
tm_base = 'data/structured/transfermarkt'
tm_data = []

for league in os.listdir(tm_base):
    l_dir = os.path.join(tm_base, league)
    if not os.path.isdir(l_dir): continue
    for file in os.listdir(l_dir):
        if not file.endswith('.csv'): continue
        t_path = os.path.join(l_dir, file)
        tdf = pd.read_csv(t_path)
        
        if 'sofascore_id' in tdf.columns:
            tdf = tdf[tdf['sofascore_id'].notna()]
            
            for _, row in tdf.iterrows():
                pid = row['player_id']
                s_id = row['sofascore_id']
                
                foot = row.get('foot', '')
                height = row.get('height_in_cm', None)
                position = row.get('position', '')
                sub_pos = row.get('sub_position', '')
                dob = row.get('date_of_birth', '')
                current_mv = row.get('market_value_in_eur', 0)
                
                last_mv = history_last.get(pid, 0.0)
                cmv = float(current_mv) if pd.notna(current_mv) else 0.0
                final_current = cmv if cmv > 0 else last_mv

                tm_data.append({
                    'Oyuncu_ID': s_id,
                    'TM_Foot': foot,
                    'TM_Height_cm': height,
                    'TM_Position': position,
                    'TM_Sub_Position': sub_pos,
                    'TM_Date_Of_Birth': dob,
                    'PD_Guncel': final_current
                })

tm_df = pd.DataFrame(tm_data)
tm_df = tm_df.drop_duplicates(subset=['Oyuncu_ID'], keep='last')

print("Sofascore...")
sofa_base = 'data/structured/sofascore'
sofa_parts = []

for league in os.listdir(sofa_base):
    l_dir = os.path.join(sofa_base, league)
    if league in EXCLUDED_LEAGUES_FROM_DATASET_VERSION:
        print(f"Sofa klasörü atlandı (version filtresi): {league}")
        continue
    if not os.path.isdir(l_dir): continue
    for file in os.listdir(l_dir):
        if not file.endswith('.csv'): continue
        s_path = os.path.join(l_dir, file)
        sdf = pd.read_csv(s_path)
        
        sdf['League'] = league
        sdf['Team'] = file.replace('.csv', '')
        sofa_parts.append(sdf)

if len(sofa_parts) > 0:
    sofa_master = pd.concat(sofa_parts, ignore_index=True)
else:
    print("Sofascore verisi yok.")
    exit(1)

try:
    sofa_master['Oyuncu_ID'] = sofa_master['Oyuncu_ID'].astype(float)
    tm_df['Oyuncu_ID'] = tm_df['Oyuncu_ID'].astype(float)
except:
    pass

final_df = pd.merge(sofa_master, tm_df, on='Oyuncu_ID', how='left')

clean_df = final_df[final_df['PD_Guncel'].notna()]

for col in ['highest_market_value', 'highest_market_value_in_eur']:
    if col in clean_df.columns:
        clean_df = clean_df.drop(columns=[col])

print("Sezonlar...")
_before = len(clean_df)
clean_df = enrich_sealed_with_raw_leagues(clean_df, league_dir='data/raw/leagues', verbose=False)

clean_df = normalize_team_columns(clean_df)

clean_df = drop_sofa_extension_columns(clean_df)

out_path = 'data/processed/sealed_master_dataset.csv'
clean_df.to_csv(out_path, index=False, encoding='utf-8')
print("Tamamlandı:", out_path)
