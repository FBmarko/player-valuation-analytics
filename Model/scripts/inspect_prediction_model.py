"""Inspect trained prediction models for offline web export readiness.

This script is intentionally offline-only model code. It does not write frontend
JSON and does not import anything into React.
"""

from __future__ import annotations

import csv
import json
import math
import re
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[1]

MODEL_SPECS = [
    {
        "key": "honest",
        "model_path": ROOT / "models" / "elite_stacking_model.pkl",
        "data_path": ROOT / "data" / "processed" / "engineered_master_dataset.csv",
        "training_script": ROOT / "src" / "model" / "train_stacking_model.py",
        "keep_historical_pd": False,
        "expected_type": "sklearn.ensemble.StackingRegressor",
        "output_scale": "raw EUR",
    },
    {
        "key": "high_r2",
        "model_path": ROOT / "models" / "elite_stacking_model_high_r2.pkl",
        "data_path": ROOT / "data" / "processed" / "engineered_master_dataset_high_r2.csv",
        "training_script": ROOT / "src" / "model" / "train_stacking_model_high_r2.py",
        "keep_historical_pd": True,
        "expected_type": "sklearn.compose.TransformedTargetRegressor wrapping StackingRegressor",
        "output_scale": "raw EUR from predict(); target trained with log1p and inverse expm1",
    },
]

DROP_COLS = [
    "Oyuncu_ID",
    "id",
    "\u0130sim",
    "name",
    "first_name",
    "last_name",
    "url",
    "image_url",
    "current_club_name",
    "agent_name",
    "Takim_Adi",
    "Tak\u0131m",
    "PD_Guncel",
]

HISTORICAL_PD_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel_History",
]

LEAKAGE_PATTERNS = [
    re.compile(r"^PD_"),
    re.compile(r"^PD_hist"),
    re.compile(r"^PD_delta"),
    re.compile(r"^PD_ratio"),
    re.compile(r"^PD_accel"),
]
LEAKAGE_EXACT = {"Lig_Ort_Pd", "Kulup_Ort_Pd", "Lig_Toplam_PD", "Kulup_Toplam_PD"}


def read_header(path: Path) -> list[str]:
    if not path.is_file():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.reader(file)
        return next(reader, [])


def row_count(path: Path) -> int | None:
    if not path.is_file():
        return None
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return max(0, sum(1 for _ in csv.reader(file)) - 1)


def reconstruct_features(data_path: Path, keep_historical_pd: bool) -> list[str]:
    features = [column for column in read_header(data_path) if column not in DROP_COLS]
    if not keep_historical_pd:
        features = [column for column in features if column not in HISTORICAL_PD_COLUMNS]
    return features


def leakage_like_features(features: list[str]) -> list[str]:
    return [
        feature
        for feature in features
        if feature in LEAKAGE_EXACT or any(pattern.search(feature) for pattern in LEAKAGE_PATTERNS)
    ]


def pickle_string_probe(path: Path) -> dict[str, object]:
    if not path.is_file():
        return {"exists": False}
    data = path.read_bytes()
    tokens = [
        "TransformedTargetRegressor",
        "StackingRegressor",
        "Pipeline",
        "ColumnTransformer",
        "OrdinalEncoder",
        "CatBoostRegressor",
        "XGBRegressor",
        "LGBMRegressor",
        "LinearRegression",
        "Ridge",
        "feature_names_in_",
        "n_features_in_",
        "log1p",
        "expm1",
    ]
    return {
        "exists": True,
        "sizeBytes": len(data),
        "tokensFound": [token for token in tokens if token.encode("utf-8") in data],
    }


def import_optional_modules() -> tuple[dict[str, bool], dict[str, object]]:
    modules: dict[str, bool] = {}
    loaded: dict[str, object] = {}
    for name in ["numpy", "pandas", "joblib", "sklearn", "xgboost", "catboost", "lightgbm"]:
        try:
            module = __import__(name)
        except Exception:
            modules[name] = False
        else:
            modules[name] = True
            loaded[name] = module
    return modules, loaded


def finite_prediction_summary(values: object) -> dict[str, object]:
    numbers = [float(value) for value in values if value is not None and math.isfinite(float(value))]
    if not numbers:
        return {"count": 0}
    return {
        "count": len(numbers),
        "min": min(numbers),
        "max": max(numbers),
        "mean": mean(numbers),
    }


def prepare_features_with_pandas(spec: dict[str, object], feature_names: list[str], pandas_module: object):
    data_path = spec["data_path"]
    df = pandas_module.read_csv(data_path, low_memory=False)
    if "PD_Guncel" in df.columns:
        target = pandas_module.to_numeric(df["PD_Guncel"], errors="coerce")
        df = df.loc[target.notna() & (target > 0)].reset_index(drop=True)
    X = df.drop(columns=[column for column in DROP_COLS if column in df.columns], errors="ignore")
    if not spec["keep_historical_pd"]:
        X = X.drop(columns=[column for column in HISTORICAL_PD_COLUMNS if column in X.columns], errors="ignore")
    if feature_names:
        missing = [column for column in feature_names if column not in X.columns]
        extra = [column for column in X.columns if column not in feature_names]
        if not missing:
            X = X[feature_names]
    else:
        missing = []
        extra = []
    categories = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()
    for column in categories:
        X[column] = X[column].fillna("Unknown").astype(str)
    return df, X, missing, extra


def inspect_model(spec: dict[str, object], modules: dict[str, bool], loaded: dict[str, object]) -> dict[str, object]:
    features = reconstruct_features(spec["data_path"], bool(spec["keep_historical_pd"]))
    result: dict[str, object] = {
        "key": spec["key"],
        "modelFilePath": str(Path(spec["model_path"]).relative_to(ROOT)),
        "modelFileExists": Path(spec["model_path"]).is_file(),
        "dataPath": str(Path(spec["data_path"]).relative_to(ROOT)),
        "dataFileExists": Path(spec["data_path"]).is_file(),
        "rowCount": row_count(spec["data_path"]),
        "expectedModelTypeFromTraining": spec["expected_type"],
        "expectedOutputScaleFromTraining": spec["output_scale"],
        "trainingScript": str(Path(spec["training_script"]).relative_to(ROOT)),
        "reconstructedFeatureCount": len(features),
        "reconstructedFeatures": features,
        "leakageLikeFeatures": leakage_like_features(features),
        "pickleProbe": pickle_string_probe(spec["model_path"]),
        "loadAttempted": False,
        "loadSucceeded": False,
        "errors": [],
    }

    if not all(modules.get(name) for name in ["pandas", "joblib", "sklearn"]):
        result["errors"].append("Required Python packages for pickle loading are unavailable.")
        result["availableModules"] = modules
        return result

    result["loadAttempted"] = True
    try:
        model = loaded["joblib"].load(spec["model_path"])
    except Exception as exc:
        result["errors"].append(f"Model load failed: {type(exc).__name__}: {exc}")
        result["availableModules"] = modules
        return result

    result["loadSucceeded"] = True
    result["modelType"] = f"{type(model).__module__}.{type(model).__name__}"
    interesting_attrs = [
        "feature_names_in_",
        "n_features_in_",
        "regressor_",
        "regressor",
        "estimators_",
        "final_estimator_",
        "transformer_",
        "func",
        "inverse_func",
    ]
    result["availableAttributes"] = [name for name in interesting_attrs if hasattr(model, name)]
    model_features = list(getattr(model, "feature_names_in_", []) or [])
    result["modelFeatureNames"] = model_features
    result["modelFeatureCount"] = len(model_features) if model_features else None

    feature_names = model_features or features
    try:
        df, X, missing, extra = prepare_features_with_pandas(spec, feature_names, loaded["pandas"])
        result["missingRequiredFeatures"] = missing
        result["extraPreparedFeatures"] = extra[:25]
        result["canPrepareMainDataset"] = not missing
        if missing:
            return result
        sample_pred = model.predict(X.head(5))
        all_pred = model.predict(X)
        result["samplePredictions"] = [
            {
                "rowIndex": int(index),
                "player": str(df.iloc[index].get("\u0130sim", "")),
                "prediction": float(value),
            }
            for index, value in enumerate(sample_pred)
        ]
        result["predictionSummary"] = finite_prediction_summary(all_pred)
    except Exception as exc:
        result["errors"].append(f"Prediction test failed: {type(exc).__name__}: {exc}")

    result["availableModules"] = modules
    return result


def main() -> None:
    modules, loaded = import_optional_modules()
    report = {
        "projectRoot": str(ROOT),
        "availableModules": modules,
        "models": [inspect_model(spec, modules, loaded) for spec in MODEL_SPECS],
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
