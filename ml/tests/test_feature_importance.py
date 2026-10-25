import json

import numpy as np

from predisched_ml import registry
from predisched_ml.models import ExecTimeModel
from predisched_ml.prediction_server import ModelSet
from test_server import save_models


def test_save_exports_exact_weights_from_fitted_execution_model(tmp_path):
    fitted = save_models(tmp_path)
    report = json.loads((tmp_path / "m1/v1/feature-importance.json").read_text())
    assert report["method"] == "absolute_standardized_coefficient"
    actual = {item["feature"]: item["importance"] for item in report["features"]}
    estimator = fitted.model.estimator.steps[-1][1]
    expected = dict(zip(fitted.model.importances().index, fitted.model.importances().values))
    assert actual == expected
    assert sorted(actual.values()) == sorted(np.abs(estimator.coef_).tolist())
    assert not (tmp_path / "m2/v1/feature-importance.json").exists()


def test_loading_legacy_models_backfills_weights_without_changing_versions(tmp_path):
    save_models(tmp_path)
    for path in tmp_path.glob("*/v*/feature-importance.json"):
        path.unlink()
    before = registry.load_registry(tmp_path)
    loaded = ModelSet.load(tmp_path)
    assert loaded.versions["m1"] == 1
    assert (tmp_path / "m1/v1/feature-importance.json").exists()
    assert registry.load_registry(tmp_path) == before


def test_each_version_keeps_its_own_weights(tmp_path):
    fitted = save_models(tmp_path)
    registry.save("m1", fitted, {"kept": {}}, root=tmp_path, status="shadow")
    first = (tmp_path / "m1/v1/feature-importance.json").read_text()
    second = (tmp_path / "m1/v2/feature-importance.json").read_text()
    assert first == second
    assert registry.load_registry(tmp_path)["models"]["m1"]["live"] == 1
