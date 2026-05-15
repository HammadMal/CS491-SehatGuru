"""Food image classification service for SehatGuru."""
from __future__ import annotations

from io import BytesIO
import logging
import os
from typing import Any, Optional

import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms

try:
    import timm
except ImportError as exc:  # pragma: no cover - surfaced clearly at startup
    timm = None
    _TIMM_IMPORT_ERROR = exc
else:
    _TIMM_IMPORT_ERROR = None

logger = logging.getLogger(__name__)

ENSEMBLE_WATCHLIST = {
    "Aloo Sabzi",
    "Chapli Kebab",
    "Chicken Biryani",
    "Chicken Karahi",
    "Chicken Pulao",
    "Haleem",
    "Nihari",
    "Paya",
    "Saag",
    "Sajji",
    "Seekh Kebab",
    "Shami Kebab",
}


DEFAULT_CLASS_NAMES = [
    "Aloo Gobi",
    "Aloo Keema",
    "Aloo Sabzi",
    "Aloo Samosa",
    "Bhindi Masala",
    "Boiled Eggs",
    "Bun Kebab",
    "Burger",
    "Chai",
    "Chana Chaat",
    "Chana Masala",
    "Chapli Kebab",
    "Charga",
    "Chicken Biryani",
    "Chicken Karahi",
    "Chicken Pulao",
    "Chicken Roll",
    "Chocolate Cake",
    "Daal Chawal",
    "Dahi Baray",
    "Falooda",
    "Fried Chicken",
    "Fries",
    "Gajar ka Halwa",
    "Gulaab Jamun",
    "Haleem",
    "Ice Cream",
    "Jalebi",
    "Kheer",
    "Kulfi",
    "Lassi",
    "Naan",
    "Nihari",
    "Pakistani Omelette",
    "Pakora",
    "Palak Paneer",
    "Pani Puri",
    "Paratha",
    "Pasta",
    "Paya",
    "Pizza",
    "Saag",
    "Sajji",
    "Sandwich",
    "Seekh Kebab",
    "Shami Kebab",
    "Sheer Khurma",
    "Steak",
    "Tandoori Chicken",
    "Zarda",
]

LEGACY_20_CLASS_NAMES = [
    "Aloo Samosa",
    "Chana Chaat",
    "Chapli Kebab",
    "Chicken Biryani",
    "Chicken Karahi",
    "Dahi Baray",
    "Gajar ka Halwa",
    "Gulaab Jamun",
    "Haleem",
    "Jalebi",
    "Kheer",
    "Kulfi",
    "Nihari",
    "Pakora",
    "Paratha",
    "Saag",
    "Sajji",
    "Seekh Kebab",
    "White Chicken Pulao",
    "Zarda",
]


class SehatGuruTimmClassifier(nn.Module):
    """Timm backbone with the training-time SehatGuru classifier head."""

    def __init__(
        self,
        architecture: str,
        num_classes: int,
        head_layout: str = "sehatguru_50",
        img_size: Optional[int] = None,
    ):
        super().__init__()
        if timm is None:
            raise ImportError("timm is required for food vision inference") from _TIMM_IMPORT_ERROR

        self.architecture = architecture
        model_kwargs = {
            "pretrained": False,
            "num_classes": 0,
            "global_pool": "avg",
        }
        if img_size is not None and self._supports_img_size_arg(architecture):
            model_kwargs["img_size"] = img_size

        try:
            self.model = timm.create_model(architecture, **model_kwargs)
        except TypeError:
            model_kwargs.pop("global_pool", None)
            self.model = timm.create_model(
                architecture,
                **model_kwargs,
            )
        feature_dim = self.model.num_features
        if head_layout == "legacy_dropout_first":
            self.head = nn.Sequential(
                nn.LayerNorm(feature_dim, eps=1e-6),
                nn.Dropout(0.40),
                nn.Linear(feature_dim, 512),
                nn.GELU(),
                nn.Dropout(0.40),
                nn.Linear(512, num_classes),
            )
        else:
            self.head = nn.Sequential(
                nn.LayerNorm(feature_dim, eps=1e-6),
                nn.Linear(feature_dim, 512),
                nn.GELU(),
                nn.Dropout(0.40),
                nn.Linear(512, num_classes),
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.model(x)
        return self.head(features)

    @staticmethod
    def _supports_img_size_arg(architecture: str) -> bool:
        architecture = architecture.lower()
        return (
            architecture.startswith("vit_")
            or "dinov2" in architecture
            or architecture.startswith("deit_")
            or architecture.startswith("beit_")
        )


class SehatGuruConvNeXt(SehatGuruTimmClassifier):
    """Backward-compatible alias for older imports/tests."""

    def __init__(self, num_classes: int, head_layout: str = "sehatguru_50"):
        super().__init__(
            architecture="convnext_tiny",
            num_classes=num_classes,
            head_layout=head_layout,
        )


class FoodDetector:
    """Loads the trusted SehatGuru checkpoint and performs top-k inference."""

    def __init__(
        self,
        model_path: str,
        device: Optional[str] = None,
        low_confidence_threshold: float = 0.60,
        img_size_override: Optional[int] = None,
    ):
        self.model_path = model_path
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.low_confidence_threshold = low_confidence_threshold
        self.ambiguity_gap_threshold = 0.15
        self.viable_alternative_threshold = 0.15

        checkpoint = self._load_checkpoint(model_path)
        state_dict = self._extract_state_dict(checkpoint)
        self.class_names = self._extract_class_names(checkpoint, state_dict)
        self.img_size = int(img_size_override or self._metadata_value(checkpoint, "img_size", 260) or 260)
        self.metadata = self._extract_metadata(checkpoint)
        self.architecture = str(self._metadata_value(checkpoint, "architecture", "convnext_tiny") or "convnext_tiny")

        self.head_layout = self._detect_head_layout(state_dict)
        self.model = SehatGuruTimmClassifier(
            architecture=self.architecture,
            num_classes=len(self.class_names),
            head_layout=self.head_layout,
            img_size=self.img_size,
        )
        missing, unexpected = self.model.load_state_dict(state_dict, strict=False)
        if missing:
            logger.warning("Missing model weights while loading food detector: %s", missing)
        if unexpected:
            logger.warning("Unexpected model weights while loading food detector: %s", unexpected)

        self.model.to(self.device)
        self.model.eval()
        self.transform = transforms.Compose(
            [
                transforms.Resize(self.img_size + 32),
                transforms.CenterCrop(self.img_size),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        )

        logger.info(
            "Food detector loaded from %s with %s classes, architecture=%s, img_size=%s, head_layout=%s, device=%s",
            model_path,
            len(self.class_names),
            self.architecture,
            self.img_size,
            self.head_layout,
            self.device,
        )

    def _load_checkpoint(self, model_path: str) -> Any:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        try:
            return torch.load(model_path, map_location=self.device, weights_only=False)
        except TypeError:
            return torch.load(model_path, map_location=self.device)

    def _extract_state_dict(self, checkpoint: Any) -> dict[str, torch.Tensor]:
        if isinstance(checkpoint, dict):
            for key in ("model_state_dict", "state_dict"):
                value = checkpoint.get(key)
                if isinstance(value, dict):
                    return self._normalize_state_dict_keys(dict(value))
        if isinstance(checkpoint, dict):
            return self._normalize_state_dict_keys(dict(checkpoint))
        raise ValueError("Unsupported model checkpoint format")

    def _normalize_state_dict_keys(self, state_dict: dict[str, torch.Tensor]) -> dict[str, torch.Tensor]:
        """Accept both training wrappers: backbone.* and model.* for the timm backbone."""
        normalized = {}
        for key, value in state_dict.items():
            if key.startswith("backbone."):
                normalized[f"model.{key.removeprefix('backbone.')}"] = value
            else:
                normalized[key] = value
        return normalized

    def _extract_class_names(self, checkpoint: Any, state_dict: dict[str, torch.Tensor]) -> list[str]:
        class_names = self._metadata_value(checkpoint, "class_names")
        if class_names:
            return [str(name) for name in class_names]

        num_classes = self._infer_num_classes(state_dict)
        if num_classes == len(DEFAULT_CLASS_NAMES):
            logger.warning("Checkpoint has no class_names; using documented 50-class order")
            return DEFAULT_CLASS_NAMES.copy()
        if num_classes == len(LEGACY_20_CLASS_NAMES):
            logger.warning("Checkpoint has no class_names; using legacy 20-class order")
            return LEGACY_20_CLASS_NAMES.copy()

        logger.warning("Checkpoint has no class_names; using generic labels for %s classes", num_classes)
        return [f"class_{idx}" for idx in range(num_classes)]

    def _infer_num_classes(self, state_dict: dict[str, torch.Tensor]) -> int:
        for key in ("head.4.weight", "head.5.weight"):
            weight = state_dict.get(key)
            if weight is not None and len(weight.shape) == 2:
                return int(weight.shape[0])
        linear_weights = [
            value for key, value in state_dict.items()
            if key.startswith("head.") and key.endswith(".weight") and len(value.shape) == 2
        ]
        if linear_weights:
            return int(linear_weights[-1].shape[0])
        raise ValueError("Could not infer the number of food classes from the checkpoint")

    def _detect_head_layout(self, state_dict: dict[str, torch.Tensor]) -> str:
        if "head.1.weight" in state_dict and "head.4.weight" in state_dict:
            return "sehatguru_50"
        if "head.2.weight" in state_dict and "head.5.weight" in state_dict:
            return "legacy_dropout_first"
        return "sehatguru_50"

    def _metadata_value(self, checkpoint: Any, key: str, default: Any = None) -> Any:
        if isinstance(checkpoint, dict):
            return checkpoint.get(key, default)
        return default

    def _extract_metadata(self, checkpoint: Any) -> dict[str, Any]:
        if not isinstance(checkpoint, dict):
            return {}

        metadata: dict[str, Any] = {}
        for key in ("architecture", "created_at", "img_size"):
            if key in checkpoint:
                metadata[key] = checkpoint[key]
        metadata["num_classes"] = len(self.class_names)
        metadata["model_path"] = self.model_path
        return metadata

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        image = image.convert("RGB")
        return self.transform(image).unsqueeze(0).to(self.device)

    def predict(self, image: Image.Image, top_k: int = 5) -> dict[str, Any]:
        top_k = max(1, min(top_k, len(self.class_names)))
        probabilities = self.predict_probabilities(image)
        top_predictions = self._top_predictions_from_probabilities(probabilities, top_k)
        best = top_predictions[0]
        self._log_safety_diagnostics(top_predictions)

        return {
            "success": True,
            "predicted_class": best["class"],
            "confidence": best["confidence"],
            "low_confidence": best["confidence"] < self.low_confidence_threshold,
            "top5": top_predictions,
            "model": self.metadata,
        }

    def predict_probabilities(self, image: Image.Image) -> np.ndarray:
        input_tensor = self.preprocess_image(image)

        with torch.no_grad():
            logits = self.model(input_tensor)
            probabilities = torch.softmax(logits, dim=1).detach().cpu().numpy()

        return probabilities

    def _top_predictions_from_probabilities(
        self,
        probabilities: np.ndarray,
        top_k: int,
        class_names: Optional[list[str]] = None,
    ) -> list[dict[str, Any]]:
        names = class_names or self.class_names
        top_k = max(1, min(top_k, len(names)))
        row = probabilities[0]
        indices = np.argsort(row)[::-1][:top_k]
        top_predictions = [
            {
                "class": names[int(index)],
                "confidence": float(row[int(index)]),
            }
            for index in indices
        ]
        return top_predictions

    def _log_safety_diagnostics(self, top_predictions: list[dict[str, Any]]) -> None:
        """Log the old camera safety checks without changing the model result."""
        best = top_predictions[0]
        second = top_predictions[1] if len(top_predictions) > 1 else {"class": "", "confidence": 0.0}
        confidence = float(best["confidence"])
        second_confidence = float(second["confidence"])
        gap = confidence - second_confidence
        failed_checks = []

        logger.info(
            "SafePredictor: Top predictions: 1=%s (%.2f%%), 2=%s (%.2f%%)",
            best["class"],
            confidence * 100.0,
            second["class"],
            second_confidence * 100.0,
        )

        logger.info(
            "SafePredictor: CHECK 1 - Baseline Confidence: %.2f%% (threshold: %.2f%%)",
            confidence * 100.0,
            self.low_confidence_threshold * 100.0,
        )
        if confidence < self.low_confidence_threshold:
            failed_checks.append("Low Baseline Confidence")
            logger.info("SafePredictor: CHECK 1 FAILED - Below baseline threshold")
        else:
            logger.info("SafePredictor: CHECK 1 PASSED")

        logger.info(
            "SafePredictor: CHECK 2 - Ambiguity Gap: %.2f%% (threshold: %.2f%%)",
            gap * 100.0,
            self.ambiguity_gap_threshold * 100.0,
        )
        if gap < self.ambiguity_gap_threshold:
            failed_checks.append("Ambiguity Gap")
            logger.info("SafePredictor: CHECK 2 FAILED - Predictions too close")
        else:
            logger.info("SafePredictor: CHECK 2 PASSED")

        logger.info(
            "SafePredictor: CHECK 3 - Viable Alternative: %.2f%% (threshold: %.2f%%)",
            second_confidence * 100.0,
            self.viable_alternative_threshold * 100.0,
        )
        if second_confidence > self.viable_alternative_threshold:
            failed_checks.append("Viable Alternative")
            logger.info("SafePredictor: CHECK 3 FAILED - Second option too strong")
        else:
            logger.info("SafePredictor: CHECK 3 PASSED")

        logger.info("SafePredictor: CHECK 4 - Color Bias: SKIPPED (disabled)")

        for rank, prediction in enumerate(top_predictions, start=1):
            logger.info(
                "SafePredictor: pred[%d]=%s confidence=%.2f%%",
                rank,
                prediction["class"],
                float(prediction["confidence"]) * 100.0,
            )

        if failed_checks:
            logger.info(
                "SafePredictor: FINAL DECISION - LOW_CONFIDENCE (Failed checks: %s)",
                " + ".join(failed_checks),
            )
        else:
            logger.info("SafePredictor: FINAL DECISION - CONFIRMED (All diagnostic checks passed)")

    def predict_from_bytes(self, image_bytes: bytes, top_k: int = 5) -> dict[str, Any]:
        image = Image.open(BytesIO(image_bytes))
        return self.predict(image, top_k=top_k)


class EnsembleFoodDetector:
    """Cascading ConvNeXt + DINOv2 stacking ensemble."""

    def __init__(
        self,
        convnext_model_path: str,
        dinov2_model_path: str,
        blender_path: str,
        device: Optional[str] = None,
        low_confidence_threshold: float = 0.60,
        ensemble_low_confidence_threshold: float = 0.10,
        cascade_threshold: float = 0.92,
        dinov2_img_size: Optional[int] = None,
        watchlist: Optional[set[str]] = None,
    ):
        try:
            import joblib
        except ImportError as exc:
            raise ImportError("joblib is required for ensemble food detection") from exc

        self.convnext = FoodDetector(
            model_path=convnext_model_path,
            device=device,
            low_confidence_threshold=low_confidence_threshold,
        )
        self.dinov2 = FoodDetector(
            model_path=dinov2_model_path,
            device=self.convnext.device,
            low_confidence_threshold=low_confidence_threshold,
            img_size_override=dinov2_img_size,
        )
        self.device = self.convnext.device
        self.low_confidence_threshold = low_confidence_threshold
        self.ensemble_low_confidence_threshold = ensemble_low_confidence_threshold
        self.cascade_threshold = cascade_threshold
        self.watchlist = watchlist or ENSEMBLE_WATCHLIST

        if not os.path.exists(blender_path):
            raise FileNotFoundError(f"Stacking blender file not found: {blender_path}")

        try:
            payload = joblib.load(blender_path)
        except ModuleNotFoundError as exc:
            raise ImportError(
                "Could not load stacking blender. Install backend requirements so "
                "scikit-learn/joblib are available."
            ) from exc
        if not isinstance(payload, dict) or "model" not in payload or "class_names" not in payload:
            raise ValueError("Blender joblib must contain 'model' and 'class_names'")

        self.blender = payload["model"]
        self.class_names = [str(name) for name in payload["class_names"]]
        self.convnext_indices = self._build_class_index(self.convnext.class_names, "ConvNeXt")
        self.dinov2_indices = self._build_class_index(self.dinov2.class_names, "DINOv2")
        self.img_size = self.convnext.img_size
        self.metadata = {
            "architecture": "cascading_stacking_ensemble",
            "convnext": self.convnext.metadata,
            "dinov2": self.dinov2.metadata,
            "blender_path": blender_path,
            "cascade_threshold": cascade_threshold,
            "ensemble_low_confidence_threshold": ensemble_low_confidence_threshold,
            "watchlist": sorted(self.watchlist),
            "num_classes": len(self.class_names),
        }

        logger.info(
            "Ensemble food detector loaded with %s classes, cascade_threshold=%.2f, device=%s",
            len(self.class_names),
            self.cascade_threshold,
            self.device,
        )

    def _build_class_index(self, source_class_names: list[str], source_name: str) -> list[int]:
        missing = [name for name in self.class_names if name not in source_class_names]
        if missing:
            raise ValueError(
                f"{source_name} checkpoint is missing blender classes: {missing[:10]}"
            )
        return [source_class_names.index(name) for name in self.class_names]

    def _format_result(
        self,
        probabilities: np.ndarray,
        top_k: int,
        inference_path: str,
        low_confidence_threshold: float,
        extra_model_metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        top_k = max(1, min(top_k, len(self.class_names)))
        top_predictions = self.convnext._top_predictions_from_probabilities(
            probabilities,
            top_k,
            class_names=self.class_names,
        )
        best = top_predictions[0]
        model_metadata = {
            **self.metadata,
            "inference_path": inference_path,
        }
        if extra_model_metadata:
            model_metadata.update(extra_model_metadata)

        return {
            "success": True,
            "predicted_class": best["class"],
            "confidence": best["confidence"],
            "low_confidence": best["confidence"] < low_confidence_threshold,
            "top5": top_predictions,
            "model": model_metadata,
        }

    def predict(self, image: Image.Image, top_k: int = 5) -> dict[str, Any]:
        conv_probs_raw = self.convnext.predict_probabilities(image)
        conv_aligned = conv_probs_raw[:, self.convnext_indices]
        conv_pred_idx = int(np.argmax(conv_aligned[0]))
        conv_conf = float(conv_aligned[0, conv_pred_idx])
        conv_class = self.class_names[conv_pred_idx]

        if conv_conf >= self.cascade_threshold and conv_class not in self.watchlist:
            return self._format_result(
                conv_aligned,
                top_k,
                inference_path="convnext_fast_path",
                low_confidence_threshold=self.low_confidence_threshold,
                extra_model_metadata={
                    "convnext_confidence": conv_conf,
                    "convnext_class": conv_class,
                },
            )

        dino_probs_raw = self.dinov2.predict_probabilities(image)
        dino_aligned = dino_probs_raw[:, self.dinov2_indices]
        stacked_features = np.concatenate([conv_aligned, dino_aligned], axis=1)
        final_probs = self.blender.predict_proba(stacked_features)

        return self._format_result(
            final_probs,
            top_k,
            inference_path="dinov2_blender_path",
            low_confidence_threshold=self.ensemble_low_confidence_threshold,
            extra_model_metadata={
                "convnext_confidence": conv_conf,
                "convnext_class": conv_class,
            },
        )

    def predict_from_bytes(self, image_bytes: bytes, top_k: int = 5) -> dict[str, Any]:
        image = Image.open(BytesIO(image_bytes))
        return self.predict(image, top_k=top_k)


_detector: Optional[FoodDetector | EnsembleFoodDetector] = None


def get_detector() -> FoodDetector | EnsembleFoodDetector:
    if _detector is None:
        raise RuntimeError("Food detector not initialized. Call initialize_detector() first.")
    return _detector


def initialize_detector(
    model_path: str,
    device: Optional[str] = None,
    low_confidence_threshold: float = 0.60,
) -> None:
    global _detector
    _detector = FoodDetector(
        model_path=model_path,
        device=device,
        low_confidence_threshold=low_confidence_threshold,
    )


def initialize_ensemble_detector(
    convnext_model_path: str,
    dinov2_model_path: str,
    blender_path: str,
    device: Optional[str] = None,
    low_confidence_threshold: float = 0.60,
    ensemble_low_confidence_threshold: float = 0.10,
    cascade_threshold: float = 0.92,
    dinov2_img_size: Optional[int] = None,
) -> None:
    global _detector
    _detector = EnsembleFoodDetector(
        convnext_model_path=convnext_model_path,
        dinov2_model_path=dinov2_model_path,
        blender_path=blender_path,
        device=device,
        low_confidence_threshold=low_confidence_threshold,
        ensemble_low_confidence_threshold=ensemble_low_confidence_threshold,
        cascade_threshold=cascade_threshold,
        dinov2_img_size=dinov2_img_size,
    )


def is_initialized() -> bool:
    return _detector is not None
