# Clean Model v1 Training Report

## Summary

Created a new lower-leakage model training script:

```text
Model/scripts/train_clean_market_value_model_v1.py
```

This task did not modify React UI, `src/data/generatedData.js`, generated JSON, frontend imports, backend/API code, or existing benchmark models.

Training was attempted in the available Python runtime, but it did not run because required ML dependencies are missing. No clean model artifacts were written.

Final recommendation:

```text
TRAINING_FAILED
```

Reason: missing local Python dependencies, not a data/schema failure.

## Dataset Used

Configured dataset:

```text
Model/data/processed/engineered_master_dataset_high_r2.csv
```

Dataset inspection from the clean training script:

| Item | Count |
| --- | ---: |
| Rows read | 20,744 |
| Eligible rows after target filtering | 20,744 |
| Dataset columns | 136 |
| Clean feature count | 118 |
| Categorical features | 8 |
| Numeric features | 110 |

## Target

Target column:

```text
PD_Guncel
```

Training script filters out rows where the target is missing or `<= 0`.

## Dropped Leakage Columns

The clean v1 script explicitly drops historical player market-value columns and derived historical PD features:

```text
PD_23_Yaz
PD_23_Kis
PD_24_Yaz
PD_24_Kis
PD_25_Yaz
PD_Guncel_History
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

Historical leakage columns remaining after the clean feature selection:

```text
none
```

## Other Dropped Non-Feature Columns

The script also drops non-feature identity/display columns:

```text
PD_Guncel
Oyuncu_ID
İsim
Takim_Adi
id
name
first_name
last_name
url
image_url
current_club_name
agent_name
Takım
```

Only columns present in the dataset are dropped. In the current dataset, the actual dropped columns were:

```text
Oyuncu_ID
PD_23_Kis
PD_23_Yaz
PD_24_Kis
PD_24_Yaz
PD_25_Yaz
PD_Guncel
PD_accel_2step
PD_delta_24y_23y
PD_delta_25y_24k
PD_hist_max
PD_hist_mean
PD_hist_min
PD_hist_span
PD_hist_std
PD_ratio_25_23
Takim_Adi
İsim
```

## Kept Feature Types

The clean script keeps performance/statistical columns such as:

```text
goals
assists
expectedGoals
expectedAssists
minutesPlayed
Playmaking_Index
Defensive_Action_Volume_Per90
Duel_Dominance_Ratio
```

It also keeps aggregate league/team strength context because these are not direct player historical target values:

```text
Lig_Ort_Pd
Kulup_Ort_Pd
Lig_Guc_0_100
Kulup_Guc_0_100
```

These aggregate market-context fields should still be documented in prediction metadata later because they encode market environment.

## Categorical Columns

Detected categorical columns:

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

The planned preprocessing pipeline imputes missing categorical values with `Unknown` and encodes them with:

```text
OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
```

## Numeric Columns

Detected numeric feature count:

```text
110
```

The planned preprocessing pipeline imputes numeric columns with median values.

## Model Candidates Tested

The script is designed to test these candidates when dependencies are available:

| Candidate | Dependency | Status in current runtime |
| --- | --- | --- |
| `CatBoostRegressor` | `catboost` | Missing |
| `XGBRegressor` | `xgboost` | Missing |
| `LGBMRegressor` | `lightgbm` | Missing |
| `HistGradientBoostingRegressor` | `sklearn` | Missing because `sklearn` is missing |
| `RandomForestRegressor` | `sklearn` | Missing because `sklearn` is missing |

No candidates were actually trained in this runtime.

## Selected Model

No model was selected because training did not run.

Expected selection rule when training succeeds:

```text
lowest validation MAE, with R2 as secondary sort
```

## Target Transform And Prediction Output Scale

The clean v1 script is configured to use:

```text
TransformedTargetRegressor(func=np.log1p, inverse_func=np.expm1)
```

Expected prediction output from the saved model:

```text
raw EUR
```

Frontend/export conversion should later divide by `1,000,000` only when writing frontend-facing EUR millions.

## Metrics

Metrics planned by the script:

```text
MAE
RMSE
R2
MAPE
SMAPE
median absolute error
error by value bucket
```

Actual metrics:

```text
not available
```

Reason:

```text
training did not run because required dependencies are missing
```

## Required Outputs

When training succeeds, the script writes:

```text
Model/models/clean_v1/clean_market_value_model_v1.pkl
Model/models/clean_v1/feature_columns.json
Model/models/clean_v1/training_config.json
Model/models/clean_v1/metrics.json
Model/models/clean_v1/validation_predictions.csv
```

Current status:

| Output | Created? | Reason |
| --- | --- | --- |
| `Model/models/clean_v1/clean_market_value_model_v1.pkl` | No | Training did not run. |
| `Model/models/clean_v1/feature_columns.json` | No | Training did not run. |
| `Model/models/clean_v1/training_config.json` | No | Training did not run. |
| `Model/models/clean_v1/metrics.json` | No | Training did not run. |
| `Model/models/clean_v1/validation_predictions.csv` | No | Training did not run. |

Confirmed:

```text
Model/models/clean_v1 does not exist in the current workspace after the failed dependency check.
```

## Training Attempt Result

Command run:

```text
C:\Users\onlyf\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe Model/scripts/train_clean_market_value_model_v1.py
```

Script output:

```json
{
  "status": "missing_dependencies",
  "missingRequiredDependencies": [
    "joblib",
    "sklearn"
  ],
  "availableDependencies": {
    "pandas": true,
    "numpy": true,
    "joblib": false,
    "sklearn": false,
    "catboost": false,
    "xgboost": false,
    "lightgbm": false
  },
  "message": "Training was not run and no model artifacts were written."
}
```

## Known Limitations

- Training could not be executed in the current runtime because core ML dependencies are missing.
- No validation metrics exist yet for the clean v1 model.
- The script keeps aggregate league/team market context columns; these are safer than player historical market-value columns but should still be disclosed.
- The script uses ordinal encoding for categorical columns. This is simple and stable for tree models, but future tuning may compare target encoding or native categorical handling.
- Candidate hyperparameters are conservative first-pass values, not tuned.

## Safer Than High-R² Benchmark?

Design-wise, yes.

The old high-R² benchmark uses historical player market-value columns and derived historical PD features. Clean v1 explicitly removes those direct player historical target features before training.

However, because training did not run, there is not yet an empirical clean-v1 validation result.

## Ready For Offline Prediction Export?

Not yet.

The script is ready to run in an ML-capable Python environment, but no model artifact exists yet. Prediction export should wait until:

1. Dependencies are installed.
2. Training completes.
3. `metrics.json` is reviewed.
4. `validation_predictions.csv` is inspected for reasonableness.
5. The final recommendation is upgraded from `TRAINING_FAILED` to either `READY_FOR_OFFLINE_PREDICTION_EXPORT` or `NEEDS_MODEL_TUNING`.

## Final Recommendation

```text
TRAINING_FAILED
```

Required next action:

Install the missing model-training dependencies in the Python environment and rerun:

```text
python Model/scripts/train_clean_market_value_model_v1.py
```

At minimum, the environment needs:

```text
pandas
numpy
joblib
scikit-learn
```

Optional preferred model libraries:

```text
catboost
xgboost
lightgbm
```
