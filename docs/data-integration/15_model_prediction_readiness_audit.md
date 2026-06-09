# Model Prediction Readiness Audit

## Summary

This is an audit/readiness pass only. No React UI files, generated JSON files, `export_web_ready_generated.py`, frontend imports, backend/API code, or existing model/data files were modified.

An offline inspection script was added:

```text
Model/scripts/inspect_prediction_model.py
```

The script is model-side/offline only. It does not write prediction output into frontend JSON.

High-level result:

- Offline prediction export appears technically feasible for the active 500 generated players.
- The strongest candidate model is `Model/models/elite_stacking_model_high_r2.pkl` because it was trained on `engineered_master_dataset_high_r2.csv`, which is the current main dataset.
- Output scale is clear from the training script: `TransformedTargetRegressor` trains with `log1p(PD_Guncel)` and returns predictions through `expm1`, so `.predict()` should output raw EUR.
- All reconstructed high-R² feature columns are present in the main dataset.
- The model has important leakage/benchmark risk because it uses historical market-value columns and derived historical market-value features.
- Recommendation: `RETRAIN_RECOMMENDED` before using this as a user-facing web prediction signal.

## Model Files Found

| Model file | Present | Size | Notes |
| --- | --- | ---: | --- |
| `Model/models/elite_stacking_model.pkl` | Yes | 4,472,050 bytes | Original/honest model trained on `engineered_master_dataset.csv`; historical PD columns are dropped. |
| `Model/models/elite_stacking_model_high_r2.pkl` | Yes | 108,102,117 bytes | Benchmark/high-R² model trained on `engineered_master_dataset_high_r2.csv`; historical PD columns are kept and used. |

## Training Scripts Found

| Script | Present | Purpose |
| --- | --- | --- |
| `Model/src/model/train_stacking_model.py` | Yes | Trains `elite_stacking_model.pkl` on `engineered_master_dataset.csv`; drops target and historical PD columns. |
| `Model/src/model/train_stacking_model_high_r2.py` | Yes | Trains `elite_stacking_model_high_r2.pkl` on `engineered_master_dataset_high_r2.csv`; wraps the stack in `TransformedTargetRegressor(log1p/expm1)`. |
| `Model/src/model/generate_presentation_bundle.py` | Yes | Evaluates honest and benchmark models and writes presentation/report artifacts. |
| `Model/src/model/export_undervalued.py` | Yes | Uses the original model to rank undervalued players; not suitable as the new web export pipeline by itself. |
| `Model/src/data/feature_engineering_high_r2.py` | Yes | Creates the high-R² benchmark dataset and intentionally keeps/adds historical PD features. |
| `Model/src/data/feature_engineering.py` | Yes | Creates the lower-leakage engineered dataset and drops historical PD columns. |

## Selected Candidate Model

Recommended candidate for a technical offline prediction export test:

```text
Model/models/elite_stacking_model_high_r2.pkl
```

Reason:

- It matches the current main dataset:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

- Its reconstructed training feature count is 132.
- The current main dataset has all 132 reconstructed feature columns.
- The active generated 500 players all map back to the high-R² dataset by `Oyuncu_ID`.

Important caveat:

This is a benchmark/high-R² model, not a clean future-value forecasting model. It should not be presented as a reliable independent scouting forecast without retraining or relabeling.

## Model Type And Structure

The local runtime used for this audit has `pandas` and `numpy`, but does not have:

```text
joblib
scikit-learn
xgboost
catboost
lightgbm
```

Because those packages are required to unpickle and instantiate the models, full `.pkl` loading could not be completed in the current runtime.

Static pickle token probing and training-script review show:

| Model | Type/structure from training script and pickle probe | Preprocessing included? | `feature_names_in_` evidence |
| --- | --- | --- | --- |
| `elite_stacking_model.pkl` | `StackingRegressor` with CatBoost + XGBoost base models and `LinearRegression(positive=True)` meta learner | Yes. Each base estimator is a `Pipeline` containing a `ColumnTransformer` with `OrdinalEncoder` for categorical features. | Pickle bytes contain `feature_names_in_` and `n_features_in_`; full attribute read requires ML dependencies. |
| `elite_stacking_model_high_r2.pkl` | `TransformedTargetRegressor` wrapping `StackingRegressor` with CatBoost + XGBoost + LightGBM base models and `Ridge` meta learner | Yes. Each base estimator is a `Pipeline` containing a `ColumnTransformer` with `OrdinalEncoder` for categorical features. | Pickle bytes contain `feature_names_in_` and `n_features_in_`; full attribute read requires ML dependencies. |

The high-R² pickle also contains tokens for:

```text
TransformedTargetRegressor
StackingRegressor
CatBoostRegressor
XGBRegressor
LGBMRegressor
Ridge
log1p
expm1
```

## Feature Requirements

Feature lists were reconstructed from the training scripts and current dataset headers.

### High-R² Candidate

Training script:

```text
Model/src/model/train_stacking_model_high_r2.py
```

Dataset:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

Target:

```text
PD_Guncel
```

Dropped columns:

```text
Oyuncu_ID
id
İsim
name
first_name
last_name
url
image_url
current_club_name
agent_name
Takim_Adi
Takım
PD_Guncel
```

Reconstructed feature count:

```text
132
```

Categorical features inferred by training script:

```text
Sezon
Turnuva_Ligi
League
Team
TM_Foot
TM_Position
TM_Sub_Position
TM_Date_Of_Birth
```

Historical/current market-value-like features included:

```text
PD_23_Yaz
PD_23_Kis
PD_24_Yaz
PD_24_Kis
PD_25_Yaz
Lig_Ort_Pd
Kulup_Ort_Pd
PD_hist_mean
PD_hist_max
PD_hist_min
PD_hist_span
PD_hist_std
PD_delta_25y_24k
PD_delta_24y_23y
PD_ratio_25_23
PD_accel_2step
```

### Original/Honest Model

Training script:

```text
Model/src/model/train_stacking_model.py
```

Dataset:

```text
Model/data/processed/engineered_master_dataset.csv
```

Target:

```text
PD_Guncel
```

Reconstructed current feature count:

```text
118
```

Historical PD columns are explicitly dropped:

```text
PD_23_Yaz
PD_23_Kis
PD_24_Yaz
PD_24_Kis
PD_25_Yaz
PD_Guncel_History
```

Leakage-like features still present:

```text
Lig_Ort_Pd
Kulup_Ort_Pd
```

These are aggregate league/club market-value strength features rather than direct player target history, but they should still be documented.

## Feature Availability In Main Dataset

Main dataset inspected:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

| Check | Result |
| --- | --- |
| Dataset rows | 20,744 |
| Dataset columns | 136 |
| Reconstructed high-R² required features | 132 |
| Missing reconstructed high-R² features | 0 |
| Active generated players found in high-R² dataset by `Oyuncu_ID` | 500/500 |

Conclusion:

The current main dataset has enough columns to prepare feature input for the high-R² candidate model.

## Target And Output Scale

Target column in both training scripts:

```text
PD_Guncel
```

Original model:

- Trained directly on `PD_Guncel`.
- No target transform is used.
- Output should be raw EUR.

High-R² model:

- Uses `TransformedTargetRegressor`.
- Training transform:

```text
func=np.log1p
```

- Prediction inverse transform:

```text
inverse_func=np.expm1
```

Therefore, if the saved wrapper is used directly:

```text
model.predict(X)
```

should output raw EUR, not log values and not EUR millions.

Frontend/web export should convert to EUR millions only after prediction, using the existing frontend/generated-data convention:

```text
prediction_eur / 1,000,000
```

## Prediction Test Result

The inspection script was run with:

```text
C:\Users\onlyf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe Model/scripts/inspect_prediction_model.py
```

Result:

- Script ran successfully.
- Full pickle loading was not attempted because required ML packages are not installed in the current runtime.
- Static inspection and feature reconstruction succeeded.
- No prediction samples were generated in this environment.

Unavailable modules in the current runtime:

```text
joblib
sklearn
xgboost
catboost
lightgbm
```

To run full offline prediction inspection, use a Python environment with `Model/requirements.txt` installed, then run:

```text
python Model/scripts/inspect_prediction_model.py
```

Expected full-inspection behavior:

- Load each `.pkl` with `joblib`.
- Read `feature_names_in_` if exposed.
- Prepare dataset features.
- Run sample predictions.
- Report prediction min/max/mean.
- Report any missing required features.

## Leakage Risk Review

The high-R² model has significant leakage/benchmark risk.

Reasons:

- `train_stacking_model_high_r2.py` explicitly describes the model as a benchmark/max-R² model.
- It keeps historical PD columns.
- `feature_engineering_high_r2.py` creates additional target-history-derived features.
- Presentation reports describe the benchmark model as:

```text
Tarihsel PD dahil (R² üst sınır)
```

Meaning:

```text
historical PD included / upper-bound R² benchmark
```

Risky features include:

| Feature group | Examples | Risk |
| --- | --- | --- |
| Historical player market values | `PD_23_Yaz`, `PD_23_Kis`, `PD_24_Yaz`, `PD_24_Kis`, `PD_25_Yaz` | Strongly related to `PD_Guncel`; not an independent performance-only prediction. |
| Derived historical player market values | `PD_hist_mean`, `PD_hist_max`, `PD_hist_min`, `PD_hist_span`, `PD_hist_std`, `PD_delta_*`, `PD_ratio_*`, `PD_accel_2step` | Directly derived from historical target-like values. |
| League/club market aggregates | `Lig_Ort_Pd`, `Kulup_Ort_Pd` | Not direct target leakage, but still market-value context. |

This does not mean the model is unusable for internal benchmarking. It does mean it should not be represented as a clean independent future scouting forecast.

## Recommended Prediction Export Format

When predictions are eventually exported offline, do not write them directly into existing frontend JSON until a separate task approves integration.

Recommended standalone export shape:

```json
{
  "generatedAt": "2026-06-09T00:00:00Z",
  "model": {
    "path": "Model/models/elite_stacking_model_high_r2.pkl",
    "type": "TransformedTargetRegressor(StackingRegressor)",
    "target": "PD_Guncel",
    "outputScale": "raw_eur",
    "riskLevel": "benchmark_historical_pd_leakage"
  },
  "sourceDataset": "Model/data/processed/engineered_master_dataset_high_r2.csv",
  "joinKey": "Oyuncu_ID",
  "predictions": [
    {
      "playerSourceId": "839956",
      "playerGeneratedId": "erling-haaland-839956",
      "name": "Erling Haaland",
      "teamId": "manchester-city",
      "predictedMarketValueEur": 0,
      "predictedMarketValueMillions": 0,
      "predictionType": "current_market_value_benchmark",
      "modelVersion": "elite_stacking_model_high_r2",
      "warnings": ["benchmark_model_uses_historical_market_value_features"]
    }
  ],
  "coverage": {
    "playersRequested": 500,
    "playersPredicted": 0,
    "playersMissingFeatures": 0
  }
}
```

Suggested path for a future task:

```text
src/data/generated/predictions.generated.json
```

Do not connect this file to React until a later approved integration task.

## Final Recommendation

Recommended next action:

```text
RETRAIN_RECOMMENDED
```

Why:

- The high-R² model is technically aligned with the active main dataset and likely can generate offline predictions once model dependencies are installed.
- Output scale is clear: raw EUR from `.predict()` on the high-R² wrapper.
- Required high-R² features are available in the main dataset.
- The active 500 generated players are all present in the high-R² dataset.
- However, the high-R² model is a benchmark model with historical market-value-derived features and should not be used as a clean user-facing scouting forecast.

Practical recommendation:

1. Use `elite_stacking_model_high_r2.pkl` only for an internal offline export smoke test or benchmark-labeled current market estimate.
2. Retrain or select a lower-leakage model before exposing predictions as real web/scouting intelligence.
3. If the next task proceeds with export anyway, keep predictions in a separate generated prediction JSON and include leakage/model-status warnings in metadata.
