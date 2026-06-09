"""
Benchmark stacking — maksimum R² için güçlendirilmiş sürüm:

- Hedef: log1p(PD) ile eğitim (TransformedTargetRegressor), tahmin otomatik EUR.
- Taban: CatBoost + XGBoost + LightGBM, meta: Ridge.
- Girdi: engineered_master_dataset_high_r2.csv (PD türev özellikleri dahil).
- Çıktı: models/elite_stacking_model_high_r2.pkl

Uyarı: Güçlü yakınsama için eğitim süresi uzar. Ana dürüst model ayrıdır.
"""

from __future__ import annotations

import json
import os
import sys
import warnings
from pathlib import Path

import numpy as np

warnings.filterwarnings("ignore")

import joblib
import lightgbm as lgb
import pandas as pd
import xgboost as xgb
from catboost import CatBoostRegressor
from sklearn.compose import ColumnTransformer
from sklearn.compose import TransformedTargetRegressor
from sklearn.ensemble import StackingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

DATA_PATH = ROOT / "data/processed/engineered_master_dataset_high_r2.csv"
MODEL_PATH = ROOT / "models/elite_stacking_model_high_r2.pkl"
METRICS_PATH = ROOT / "reports" / "presentation" / "benchmark_train_metrics.json"

print("\N{ROCKET} Benchmark stacking (max-R² güçlü sürüm)...")
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)

if not DATA_PATH.is_file():
    print("Önce çalıştır: python src/data/feature_engineering_high_r2.py")
    sys.exit(1)

df = pd.read_csv(DATA_PATH, low_memory=False)

target_col = "PD_Guncel"
drop_cols = [
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
    target_col,
]

X = df.drop(columns=[col for col in drop_cols if col in df.columns])
y = pd.to_numeric(df[target_col], errors="coerce")
groups = df["Oyuncu_ID"].astype(float)

bad = y.isna() | (y <= 0)
if bad.any():
    X = X.loc[~bad].reset_index(drop=True)
    y = y.loc[~bad].reset_index(drop=True)
    groups = groups.loc[~bad].reset_index(drop=True)

actual_cat_features = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()
for col in actual_cat_features:
    X[col] = X[col].fillna("Unknown").astype(str)

gss = GroupShuffleSplit(n_splits=1, test_size=0.15, random_state=42)
idx_train, idx_test = next(gss.split(X, y, groups=groups))
X_train, X_test = X.iloc[idx_train], X.iloc[idx_test]
y_train, y_test = y.iloc[idx_train], y.iloc[idx_test]

cat_transformer = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
preprocessor = ColumnTransformer(
    transformers=[("cat", cat_transformer, actual_cat_features)],
    remainder="passthrough",
)

cat_model = Pipeline(
    [
        ("preprocessor", preprocessor),
        (
            "regressor",
            CatBoostRegressor(
                iterations=2600,
                learning_rate=0.022,
                depth=10,
                l2_leaf_reg=2.8,
                min_data_in_leaf=6,
                subsample=0.88,
                random_strength=0.85,
                bagging_temperature=0.35,
                loss_function="RMSE",
                verbose=400,
                random_seed=42,
                allow_writing_files=False,
            ),
        ),
    ]
)

xgb_model = Pipeline(
    [
        ("preprocessor", preprocessor),
        (
            "regressor",
            xgb.XGBRegressor(
                n_estimators=2600,
                learning_rate=0.022,
                max_depth=10,
                min_child_weight=2,
                subsample=0.88,
                colsample_bytree=0.88,
                gamma=0.06,
                reg_lambda=2.5,
                reg_alpha=0.15,
                tree_method="hist",
                random_state=42,
            ),
        ),
    ]
)

lgb_model = Pipeline(
    [
        ("preprocessor", preprocessor),
        (
            "regressor",
            lgb.LGBMRegressor(
                n_estimators=2600,
                learning_rate=0.022,
                num_leaves=255,
                max_depth=-1,
                min_child_samples=12,
                subsample=0.88,
                colsample_bytree=0.88,
                reg_lambda=2.0,
                reg_alpha=0.1,
                random_state=42,
                verbose=-1,
                force_row_wise=True,
            ),
        ),
    ]
)

meta_learner = Ridge(alpha=1.75)

stacking_model = StackingRegressor(
    estimators=[
        ("CatBoost", cat_model),
        ("XGBoost", xgb_model),
        ("LightGBM", lgb_model),
    ],
    final_estimator=meta_learner,
    cv=5,
    n_jobs=1,
)

wrapped = TransformedTargetRegressor(
    regressor=stacking_model,
    func=np.log1p,
    inverse_func=np.expm1,
)

print("Eğitim başlıyor (süre: veri boyutuna göre uzun olabilir)...")
wrapped.fit(X_train, y_train)

y_pred = wrapped.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
r2_log = r2_score(np.log1p(y_test.values), np.log1p(np.maximum(y_pred, 0.0)))

print(f"[Benchmark güçlü] R² (EUR uzayı test): {r2 * 100:.2f}%")
print(f"[Benchmark güçlü] R² (log uzayı uyum): {r2_log * 100:.2f}%")
print(f"[Benchmark güçlü] MAE: {mae:,.0f} €")

joblib.dump(wrapped, MODEL_PATH)
print("Kaydedildi:", MODEL_PATH.relative_to(ROOT))

try:
    rep = {
        "model": str(MODEL_PATH.relative_to(ROOT)),
        "r2_pct_eur": round(float(r2) * 100, 3),
        "r2_pct_log_aligned": round(float(r2_log) * 100, 3),
        "mae_eur": float(mae),
        "n_train": int(len(idx_train)),
        "n_test": int(len(idx_test)),
        "n_features": int(X.shape[1]),
        "stacking_note": "log1p hedef + CB+XGB+LGB + Ridge meta",
    }
    METRICS_PATH.write_text(json.dumps(rep, indent=2), encoding="utf-8")
except OSError:
    pass
