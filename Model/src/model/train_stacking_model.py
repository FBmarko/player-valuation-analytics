import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import os
import joblib

from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.ensemble import StackingRegressor

import xgboost as xgb
import catboost as cb

HISTORICAL_PD_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
]

print("\N{BRAIN} Stacking model eğitimi...")
os.makedirs('models', exist_ok=True)

df = pd.read_csv('data/processed/engineered_master_dataset.csv')

target_col = 'PD_Guncel'
drop_cols = [
    'Oyuncu_ID', 'id', 'İsim', 'name', 'first_name', 'last_name', 'url', 'image_url',
    'current_club_name', 'agent_name', 'Takim_Adi', 'Takım', target_col,
]

X = df.drop(columns=[col for col in drop_cols if col in df.columns])
X = X.drop(columns=[c for c in HISTORICAL_PD_COLUMNS if c in X.columns], errors="ignore")
y = df[target_col]
groups = df['Oyuncu_ID'].astype(float)

actual_cat_features = X.select_dtypes(include=['object', 'string', 'category']).columns.tolist()

for col in actual_cat_features:
    X[col] = X[col].fillna('Unknown').astype(str)

gss = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
idx_train, idx_test = next(gss.split(X, y, groups=groups))
X_train, X_test = X.iloc[idx_train], X.iloc[idx_test]
y_train, y_test = y.iloc[idx_train], y.iloc[idx_test]

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder

cat_transformer = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
preprocessor = ColumnTransformer(
    transformers=[
        ('cat', cat_transformer, actual_cat_features)
    ],
    remainder='passthrough'
)

cat_model = Pipeline([
    ('preprocessor', preprocessor),
    ('regressor', cb.CatBoostRegressor(iterations=800, learning_rate=0.08, depth=6, verbose=100, random_seed=42))
])

xgb_model = Pipeline([
    ('preprocessor', preprocessor),
    ('regressor', xgb.XGBRegressor(n_estimators=800, learning_rate=0.08, max_depth=6, tree_method='hist', random_state=42))
])

from sklearn.linear_model import LinearRegression
meta_learner = LinearRegression(positive=True)

stacking_model = StackingRegressor(
    estimators=[
        ('CatBoost', cat_model),
        ('XGBoost', xgb_model)
    ],
    final_estimator=meta_learner,
    cv=5,
    n_jobs=1
)

print("\N{ROCKET} Eğitim başlıyor... Bu biraz zaman alabilir.")
stacking_model.fit(X_train, y_train)

y_pred = stacking_model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"R² {r2 * 100:.1f}% | MAE {mae:,.0f} €")

model_path = 'models/elite_stacking_model.pkl'
joblib.dump(stacking_model, model_path)
print("Tamamlandı:", model_path)
