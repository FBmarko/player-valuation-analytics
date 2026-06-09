"""Train a lower-leakage market value model for offline web prediction export.

This script trains only in Python/model space. It does not modify frontend files,
generated JSON, or React imports.
"""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "processed" / "engineered_master_dataset_high_r2.csv"
OUTPUT_DIR = ROOT / "models" / "clean_v1"

TARGET_COLUMN = "PD_Guncel"
PLAYER_ID_COLUMN = "Oyuncu_ID"
PLAYER_NAME_COLUMN = "\u0130sim"

BASE_DROP_COLUMNS = {
    TARGET_COLUMN,
    PLAYER_ID_COLUMN,
    PLAYER_NAME_COLUMN,
    "id",
    "name",
    "first_name",
    "last_name",
    "url",
    "image_url",
    "current_club_name",
    "agent_name",
    "Takim_Adi",
    "Tak\u0131m",
}

LEAKAGE_DROP_COLUMNS = {
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
    "PD_hist_mean",
    "PD_hist_max",
    "PD_hist_min",
    "PD_hist_span",
    "PD_hist_std",
    "PD_delta_25y_24k",
    "PD_delta_24y_23y",
    "PD_ratio_25_23",
    "PD_accel_2step",
}

OBVIOUS_NON_FEATURE_PATTERNS = (
    "_url",
    "url",
    "image",
    "photo",
    "avatar",
)

RANDOM_STATE = 42
TEST_SIZE = 0.15


def module_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def dependency_status() -> dict[str, bool]:
    return {
        "pandas": module_available("pandas"),
        "numpy": module_available("numpy"),
        "joblib": module_available("joblib"),
        "sklearn": module_available("sklearn"),
        "catboost": module_available("catboost"),
        "xgboost": module_available("xgboost"),
        "lightgbm": module_available("lightgbm"),
    }


def fail_for_missing_dependencies(status: dict[str, bool]) -> None:
    required = ["pandas", "numpy", "joblib", "sklearn"]
    missing = [name for name in required if not status.get(name)]
    if not missing:
        return
    print(
        json.dumps(
            {
                "status": "missing_dependencies",
                "missingRequiredDependencies": missing,
                "availableDependencies": status,
                "message": "Training was not run and no model artifacts were written.",
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    sys.exit(2)


def is_obvious_non_feature(column: str) -> bool:
    lower = column.lower()
    if lower in {"id", "player_id", "sofascore_id"}:
        return True
    if lower.endswith("_id") and column not in {"Team", "League"}:
        return True
    return any(pattern in lower for pattern in OBVIOUS_NON_FEATURE_PATTERNS)


def clean_feature_frame(df, pd, np):
    target = pd.to_numeric(df[TARGET_COLUMN], errors="coerce")
    valid = target.notna() & (target > 0)
    df = df.loc[valid].copy()
    y = target.loc[valid].astype(float)

    drop_columns = {
        column
        for column in df.columns
        if column in BASE_DROP_COLUMNS or column in LEAKAGE_DROP_COLUMNS or is_obvious_non_feature(column)
    }
    X = df.drop(columns=sorted(drop_columns), errors="ignore")
    X = X.replace([np.inf, -np.inf], np.nan)

    categorical_columns = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()
    numeric_columns = [column for column in X.columns if column not in categorical_columns]

    return df, X, y, sorted(drop_columns), categorical_columns, numeric_columns


def make_preprocessor(categorical_columns: list[str], numeric_columns: list[str]):
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OrdinalEncoder

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
            ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, categorical_columns),
            ("num", numeric_transformer, numeric_columns),
        ],
        remainder="drop",
    )


def candidate_estimators(status: dict[str, bool]) -> list[tuple[str, object, dict[str, object]]]:
    candidates: list[tuple[str, object, dict[str, object]]] = []

    if status.get("catboost"):
        from catboost import CatBoostRegressor

        params = {
            "iterations": 900,
            "learning_rate": 0.045,
            "depth": 7,
            "loss_function": "RMSE",
            "random_seed": RANDOM_STATE,
            "verbose": False,
            "allow_writing_files": False,
        }
        candidates.append(("catboost", CatBoostRegressor(**params), params))

    if status.get("xgboost"):
        import xgboost as xgb

        params = {
            "n_estimators": 900,
            "learning_rate": 0.045,
            "max_depth": 7,
            "subsample": 0.9,
            "colsample_bytree": 0.9,
            "reg_lambda": 2.0,
            "reg_alpha": 0.1,
            "tree_method": "hist",
            "random_state": RANDOM_STATE,
            "n_jobs": 1,
        }
        candidates.append(("xgboost", xgb.XGBRegressor(**params), params))

    if status.get("lightgbm"):
        import lightgbm as lgb

        params = {
            "n_estimators": 900,
            "learning_rate": 0.045,
            "num_leaves": 96,
            "subsample": 0.9,
            "colsample_bytree": 0.9,
            "reg_lambda": 2.0,
            "reg_alpha": 0.1,
            "random_state": RANDOM_STATE,
            "verbose": -1,
        }
        candidates.append(("lightgbm", lgb.LGBMRegressor(**params), params))

    from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor

    hgb_params = {
        "learning_rate": 0.055,
        "max_iter": 600,
        "max_leaf_nodes": 63,
        "l2_regularization": 0.05,
        "random_state": RANDOM_STATE,
    }
    candidates.append(("hist_gradient_boosting", HistGradientBoostingRegressor(**hgb_params), hgb_params))

    rf_params = {
        "n_estimators": 300,
        "min_samples_leaf": 2,
        "max_features": "sqrt",
        "random_state": RANDOM_STATE,
        "n_jobs": -1,
    }
    candidates.append(("random_forest", RandomForestRegressor(**rf_params), rf_params))

    return candidates


def metrics(y_true, y_pred, np, pd) -> dict[str, float]:
    from sklearn.metrics import mean_absolute_error, median_absolute_error, r2_score

    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)
    abs_error = np.abs(y_true_arr - y_pred_arr)
    denom = np.maximum(np.abs(y_true_arr), 1.0)
    smape_denom = np.maximum((np.abs(y_true_arr) + np.abs(y_pred_arr)) / 2.0, 1.0)
    rmse = math.sqrt(float(np.mean((y_true_arr - y_pred_arr) ** 2)))
    return {
        "mae": float(mean_absolute_error(y_true_arr, y_pred_arr)),
        "rmse": rmse,
        "r2": float(r2_score(y_true_arr, y_pred_arr)),
        "mape": float(np.mean(abs_error / denom) * 100),
        "smape": float(np.mean(abs_error / smape_denom) * 100),
        "medianAbsoluteError": float(median_absolute_error(y_true_arr, y_pred_arr)),
    }


def bucket_errors(y_true, y_pred, np, pd) -> list[dict[str, object]]:
    frame = pd.DataFrame({"actual": y_true, "predicted": y_pred})
    frame["abs_error"] = (frame["actual"] - frame["predicted"]).abs()
    frame["smape"] = frame["abs_error"] / np.maximum((frame["actual"].abs() + frame["predicted"].abs()) / 2.0, 1.0) * 100
    bins = [0, 1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, np.inf]
    labels = ["0-1M", "1-5M", "5-10M", "10-25M", "25-50M", "50M+"]
    frame["bucket"] = pd.cut(frame["actual"], bins=bins, labels=labels, include_lowest=True)
    rows = []
    for bucket, group in frame.groupby("bucket", observed=False):
        if len(group) == 0:
            continue
        rows.append(
            {
                "bucket": str(bucket),
                "count": int(len(group)),
                "mae": float(group["abs_error"].mean()),
                "medianAbsoluteError": float(group["abs_error"].median()),
                "smape": float(group["smape"].mean()),
            }
        )
    return rows


def train_and_evaluate() -> dict[str, object]:
    import joblib
    import numpy as np
    import pandas as pd
    from sklearn.compose import TransformedTargetRegressor
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.pipeline import Pipeline

    status = dependency_status()
    df = pd.read_csv(DATA_PATH, low_memory=False)
    prepared_df, X, y, dropped_columns, categorical_columns, numeric_columns = clean_feature_frame(df, pd, np)

    groups = prepared_df[PLAYER_ID_COLUMN].astype(float)
    splitter = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
    train_idx, valid_idx = next(splitter.split(X, y, groups=groups))
    X_train, X_valid = X.iloc[train_idx], X.iloc[valid_idx]
    y_train, y_valid = y.iloc[train_idx], y.iloc[valid_idx]

    candidate_results = []
    trained_models: dict[str, object] = {}
    candidate_params: dict[str, dict[str, object]] = {}

    for name, estimator, params in candidate_estimators(status):
        preprocessor = make_preprocessor(categorical_columns, numeric_columns)
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("regressor", estimator),
            ]
        )
        model = TransformedTargetRegressor(
            regressor=pipeline,
            func=np.log1p,
            inverse_func=np.expm1,
        )
        model.fit(X_train, y_train)
        predictions = np.maximum(model.predict(X_valid), 0.0)
        result = {
            "model": name,
            **metrics(y_valid, predictions, np, pd),
            "errorByValueBucket": bucket_errors(y_valid, predictions, np, pd),
        }
        candidate_results.append(result)
        trained_models[name] = model
        candidate_params[name] = params

    if not candidate_results:
        raise RuntimeError("No model candidates were available.")

    selected = sorted(candidate_results, key=lambda item: (item["mae"], -item["r2"]))[0]
    selected_name = str(selected["model"])
    selected_model = trained_models[selected_name]
    selected_predictions = np.maximum(selected_model.predict(X_valid), 0.0)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    model_path = OUTPUT_DIR / "clean_market_value_model_v1.pkl"
    feature_path = OUTPUT_DIR / "feature_columns.json"
    config_path = OUTPUT_DIR / "training_config.json"
    metrics_path = OUTPUT_DIR / "metrics.json"
    predictions_path = OUTPUT_DIR / "validation_predictions.csv"

    joblib.dump(selected_model, model_path)

    feature_payload = {
        "featureColumns": X.columns.tolist(),
        "categoricalColumns": categorical_columns,
        "numericColumns": numeric_columns,
        "droppedColumns": dropped_columns,
    }
    feature_path.write_text(json.dumps(feature_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    config_payload = {
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "dataset": str(DATA_PATH.relative_to(ROOT)).replace("\\", "/"),
        "target": TARGET_COLUMN,
        "split": {
            "method": "GroupShuffleSplit",
            "group": PLAYER_ID_COLUMN,
            "testSize": TEST_SIZE,
            "randomState": RANDOM_STATE,
        },
        "targetTransform": {
            "train": "log1p",
            "predict": "expm1",
            "outputScale": "raw_eur",
        },
        "candidateParams": candidate_params,
        "selectedModel": selected_name,
        "dependencyStatus": status,
        "leakagePolicy": {
            "droppedHistoricalPlayerMarketValueColumns": sorted(LEAKAGE_DROP_COLUMNS),
            "keptAggregateMarketContextColumns": [
                column for column in ["Lig_Ort_Pd", "Kulup_Ort_Pd", "Lig_Guc_0_100", "Kulup_Guc_0_100"] if column in X.columns
            ],
        },
    }
    config_path.write_text(json.dumps(config_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    metrics_payload = {
        "selectedModel": selected_name,
        "candidates": candidate_results,
        "selectedMetrics": selected,
        "rows": {
            "read": int(len(df)),
            "eligible": int(len(prepared_df)),
            "train": int(len(train_idx)),
            "validation": int(len(valid_idx)),
        },
        "featureCount": int(X.shape[1]),
        "categoricalFeatureCount": len(categorical_columns),
        "numericFeatureCount": len(numeric_columns),
    }
    metrics_path.write_text(json.dumps(metrics_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    validation = prepared_df.iloc[valid_idx][
        [column for column in [PLAYER_ID_COLUMN, PLAYER_NAME_COLUMN, "League", "Team", "TM_Position", TARGET_COLUMN] if column in prepared_df.columns]
    ].copy()
    validation["predictedMarketValueEur"] = selected_predictions
    validation["absoluteErrorEur"] = (y_valid.to_numpy() - selected_predictions).astype(float)
    validation["absoluteErrorEur"] = validation["absoluteErrorEur"].abs()
    validation["absoluteErrorPct"] = validation["absoluteErrorEur"] / np.maximum(np.abs(y_valid.to_numpy(dtype=float)), 1.0) * 100
    validation.to_csv(predictions_path, index=False, encoding="utf-8-sig")

    return {
        "status": "trained",
        "outputDir": str(OUTPUT_DIR.relative_to(ROOT)).replace("\\", "/"),
        "selectedModel": selected_name,
        "selectedMetrics": selected,
        "featureCount": int(X.shape[1]),
        "categoricalFeatureCount": len(categorical_columns),
        "numericFeatureCount": len(numeric_columns),
        "filesWritten": [
            str(model_path.relative_to(ROOT)).replace("\\", "/"),
            str(feature_path.relative_to(ROOT)).replace("\\", "/"),
            str(config_path.relative_to(ROOT)).replace("\\", "/"),
            str(metrics_path.relative_to(ROOT)).replace("\\", "/"),
            str(predictions_path.relative_to(ROOT)).replace("\\", "/"),
        ],
    }


def main() -> None:
    status = dependency_status()
    fail_for_missing_dependencies(status)
    result = train_and_evaluate()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
