"""Food Detection Service using PyTorch ConvNeXt Tiny"""
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import os
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


# Try importing timm (PyTorch Image Models) - common for custom EfficientNet
try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False
    logger.warning("timm library not available, will try alternative loading methods")


class CustomConvNeXtWithHead(nn.Module):
    """
    Custom ConvNeXt wrapper that properly connects backbone and head
    This handles models saved with 'backbone.' and 'head.' prefixes
    """

    def __init__(self, state_dict: dict, num_classes: int):
        super().__init__()

        self.num_classes = num_classes
        logger.info(f"Creating custom model with {num_classes} classes")

        # Load backbone using timm
        try:
            if TIMM_AVAILABLE:
                # Create ConvNeXt Tiny backbone
                self.backbone = timm.create_model('convnext_tiny', pretrained=False, num_classes=0)

                # Load backbone weights
                backbone_state = {}
                for key, value in state_dict.items():
                    if key.startswith('backbone.'):
                        new_key = key.replace('backbone.', '')
                        backbone_state[new_key] = value

                # Load with strict=False to handle any mismatches
                self.backbone.load_state_dict(backbone_state, strict=False)
                logger.info(f"Loaded backbone with {len(backbone_state)} parameters")

                # Get the feature dimension from backbone
                with torch.no_grad():
                    dummy_input = torch.randn(1, 3, 224, 224)
                    features = self.backbone(dummy_input)
                    feature_dim = features.shape[1]
                logger.info(f"Backbone output dimension: {feature_dim}")

                # Create classification head
                head_state = {}
                for key, value in state_dict.items():
                    if key.startswith('head.'):
                        new_key = key.replace('head.', '')
                        head_state[new_key] = value

                if head_state:
                    # Build head from state dict
                    logger.info(f"Building head with {len(head_state)} parameters")
                    self.head = self._build_head_from_state(head_state, feature_dim, num_classes)
                else:
                    # Create simple head
                    logger.info(f"Creating simple linear head: {feature_dim} -> {num_classes}")
                    self.head = nn.Linear(feature_dim, num_classes)

                logger.info("Model created successfully")
            else:
                raise ImportError("timm library required but not available")

        except Exception as e:
            logger.error(f"Error creating model: {str(e)}")
            raise

    def _build_head_from_state(self, head_state: dict, in_features: int, out_features: int):
        """Build classification head from state dict"""
        # Analyze head structure
        layers = []

        # Get all layer indices
        layer_indices = set()
        for key in head_state.keys():
            try:
                idx = int(key.split('.')[0])
                layer_indices.add(idx)
            except (ValueError, IndexError):
                pass

        logger.info(f"Found head layer indices: {sorted(layer_indices)}")

        # Build layers in order
        for layer_idx in sorted(layer_indices):
            weight_key = f'{layer_idx}.weight'
            if weight_key not in head_state:
                continue

            weight = head_state[weight_key]

            if len(weight.shape) == 2:
                # Linear layer
                out_dim, in_dim = weight.shape
                linear = nn.Linear(in_dim, out_dim)
                linear.weight.data = weight
                if f'{layer_idx}.bias' in head_state:
                    linear.bias.data = head_state[f'{layer_idx}.bias']
                layers.append(linear)
                logger.info(f"  Layer {layer_idx}: Linear({in_dim} -> {out_dim})")

            elif len(weight.shape) == 1:
                # BatchNorm1d
                num_features = weight.shape[0]
                bn = nn.BatchNorm1d(num_features)
                bn.weight.data = weight
                if f'{layer_idx}.bias' in head_state:
                    bn.bias.data = head_state[f'{layer_idx}.bias']
                if f'{layer_idx}.running_mean' in head_state:
                    bn.running_mean.data = head_state[f'{layer_idx}.running_mean']
                if f'{layer_idx}.running_var' in head_state:
                    bn.running_var.data = head_state[f'{layer_idx}.running_var']
                layers.append(bn)
                logger.info(f"  Layer {layer_idx}: BatchNorm1d({num_features})")

                # Add ReLU after BatchNorm (common pattern)
                layers.append(nn.ReLU(inplace=True))
                logger.info(f"  Layer {layer_idx}+: ReLU")

        if layers:
            logger.info(f"Built head with {len(layers)} layers (final output: {out_features})")
            return nn.Sequential(*layers)
        else:
            # Fallback to simple linear
            logger.info(f"Using fallback linear head: {in_features} -> {out_features}")
            return nn.Linear(in_features, out_features)

    def forward(self, x):
        """Forward pass through backbone and head"""
        features = self.backbone(x)
        logits = self.head(features)
        return logits


class FlexibleConvNeXt(nn.Module):
    """
    Flexible wrapper for loading ConvNeXt models with custom architectures
    This class can load models with non-standard layer names
    """

    def __init__(self, state_dict: dict, num_classes: int):
        super().__init__()

        # Store the state dict directly
        self._state_dict = state_dict
        self.num_classes = num_classes

        # Create parameter dict from state_dict
        for name, param in state_dict.items():
            # Register as buffer or parameter
            if 'running' in name or 'num_batches' in name:
                self.register_buffer(name.replace('.', '_'), param)
            else:
                self.register_parameter(name.replace('.', '_'), nn.Parameter(param))

        logger.info(f"Created flexible model with {len(state_dict)} parameters")

    def forward(self, x):
        """
        Forward pass - this needs to be implemented based on the actual architecture
        For now, this is a placeholder that will be replaced by timm loading
        """
        raise NotImplementedError(
            "FlexibleConvNeXt forward pass not implemented. "
            "Please install timm library: pip install timm"
        )


class SafeFoodPredictor:
    """Safety-layered predictor that wraps a model and enforces checks before confirming."""

    def __init__(self, model: nn.Module, class_names: list, device: Optional[str] = None):
        self.model = model
        self.class_names = class_names
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # Safety Thresholds (adjusted to reduce false positives)
        self.confidence_threshold = 60.0  # Lowered from 75% - catches truly low confidence
        self.ambiguity_gap = 10.0  # Only trigger when predictions are VERY close
        self.color_confidence_min = 50.0  # Grayscale must be confident to matter

    def preprocess(self, image: Image.Image) -> torch.Tensor:
        transform = transforms.Compose([
            transforms.Resize((292, 292)),
            transforms.CenterCrop(260),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        return transform(image).unsqueeze(0).to(self.device)

    def _forward(self, input_tensor: torch.Tensor) -> torch.Tensor:
        outputs = self.model(input_tensor)
        if isinstance(outputs, tuple):
            logits = outputs[0]
        elif torch.is_tensor(outputs):
            logits = outputs
        else:
            raise ValueError(f"Unexpected model output type: {type(outputs)}")
        return logits

    def predict_with_safeguards(self, original_image: Image.Image, top_k: int = 3) -> dict:
        # PHASE 1: RGB prediction
        input_rgb = self.preprocess(original_image)
        with torch.no_grad():
            logits = self._forward(input_rgb)
            probs = torch.softmax(logits, dim=1)

            # Get top_k predictions (ensure we don't exceed available classes)
            k = min(top_k, len(self.class_names))
            topk = torch.topk(probs, k, dim=1)
            topk_probs = topk.values[0]
            topk_idx = topk.indices[0]

            # Extract top predictions and their confidences
            all_predictions = []
            for i in range(k):
                raw_prob = float(topk_probs[i].item())
                conf_pct = raw_prob * 100.0
                all_predictions.append({
                    "dish": self.class_names[topk_idx[i].item()],
                    "confidence": conf_pct
                })
                logger.info(f"SafePredictor: DEBUG pred[{i}] raw={raw_prob:.6f}, pct={conf_pct:.2f}")
            
            # For safety checks, we need at least top 2
            conf_1 = all_predictions[0]["confidence"]
            dish_1 = all_predictions[0]["dish"]
            conf_2 = all_predictions[1]["confidence"] if len(all_predictions) > 1 else 0.0
            dish_2 = all_predictions[1]["dish"] if len(all_predictions) > 1 else ""

        logger.info(f"SafePredictor: Top predictions: 1={dish_1} ({conf_1:.2f}%), 2={dish_2} ({conf_2:.2f}%)")

        # Run all safety checks and count failures
        failed_checks = []
        
        # CHECK 1: Ambiguity trap - predictions too close
        gap = conf_1 - conf_2
        logger.info(f"SafePredictor: CHECK 1 - Ambiguity gap: {gap:.2f}% (threshold: {self.ambiguity_gap}%)")
        if gap < self.ambiguity_gap:
            failed_checks.append("Ambiguous")
            logger.info(f"SafePredictor: CHECK 1 FAILED - Predictions too close")
        else:
            logger.info(f"SafePredictor: CHECK 1 PASSED")

        # CHECK 2: Confidence threshold
        logger.info(f"SafePredictor: CHECK 2 - Confidence {conf_1:.2f}% vs threshold {self.confidence_threshold}%")
        if conf_1 < self.confidence_threshold:
            failed_checks.append("Low Confidence")
            logger.info(f"SafePredictor: CHECK 2 FAILED - Below confidence threshold")
        else:
            logger.info(f"SafePredictor: CHECK 2 PASSED")

        # CHECK 3: Color Stress Test (RGB vs Grayscale)
        img_bw = original_image.convert("L").convert("RGB")
        input_bw = self.preprocess(img_bw)
        with torch.no_grad():
            logits_bw = self._forward(input_bw)
            probs_bw = torch.softmax(logits_bw, dim=1)
            idx_bw = torch.argmax(probs_bw, dim=1)[0].item()
            conf_bw = float(probs_bw[0][idx_bw].item() * 100.0)
            dish_bw = self.class_names[idx_bw]

        logger.info(f"SafePredictor: CHECK 3 - Color test: RGB={dish_1}, Grayscale={dish_bw} ({conf_bw:.2f}%)")
        # Only count as failure if grayscale is confident AND different
        if dish_1 != dish_bw and conf_bw > self.color_confidence_min:
            failed_checks.append("Color Bias")
            logger.info(f"SafePredictor: CHECK 3 FAILED - Significant color bias detected")
        else:
            logger.info(f"SafePredictor: CHECK 3 PASSED")

        # CHECK 4: Second prediction too high (viable alternative exists)
        second_pred_threshold = 20.0  # If 2nd prediction > 20%, there's real ambiguity
        logger.info(f"SafePredictor: CHECK 4 - Second prediction confidence: {conf_2:.2f}% (threshold: {second_pred_threshold}%)")
        if conf_2 > second_pred_threshold:
            failed_checks.append("Viable Alternative")
            logger.info(f"SafePredictor: CHECK 4 FAILED - Second option has significant confidence")
        else:
            logger.info(f"SafePredictor: CHECK 4 PASSED")

        # DECISION: Only ASK_USER if 2+ checks failed (consensus approach)
        if len(failed_checks) >= 2:
            reason = " + ".join(failed_checks)
            logger.info(f"SafePredictor: FINAL DECISION - ASK_USER ({len(failed_checks)} checks failed: {reason})")
            return {
                "status": "ASK_USER",
                "reason": reason,
                "message": f"I see multiple possibilities. Please confirm.",
                "predictions": all_predictions,
                "confidence": conf_1,
            }

        # SUCCESS - high confidence or only 1 minor concern
        logger.info(f"SafePredictor: FINAL DECISION - CONFIRMED (passed {4 - len(failed_checks)}/4 checks)")
        return {
            "status": "CONFIRMED",
            "dish": dish_1,
            "confidence": conf_1,
            "predictions": all_predictions
        }


class FoodDetector:
    """Food detection service using ConvNeXt Tiny model"""

    def __init__(self, model_path: str, device: Optional[str] = None):
        """
        Initialize the food detector

        Args:
            model_path: Path to the .pth model file
            device: Device to run inference on ('cpu', 'cuda', or None for auto-detect)
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")

        # Load the model
        self.model = self._load_model(model_path)
        self.model.eval()

        # Define image transformations
        # Standard ConvNeXt preprocessing (uses ImageNet normalization)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],  # ImageNet means
                std=[0.229, 0.224, 0.225]     # ImageNet stds
            )
        ])

        # TODO: Load actual class names from your training
        # This is a placeholder - you'll need to replace with actual food classes
        self.class_names = self._load_class_names()

        logger.info(f"Food detector initialized with {len(self.class_names)} classes")

    def _load_model(self, model_path: str) -> nn.Module:
        """Load the PyTorch model from file"""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")

        try:
            # Load the checkpoint
            checkpoint = torch.load(model_path, map_location=self.device)

            # Check if it's a state dict or full model
            if isinstance(checkpoint, dict):
                # If it's a dictionary, it might contain 'model' or 'state_dict' key
                if 'model' in checkpoint:
                    model = checkpoint['model']
                    logger.info("Loaded full model from checkpoint['model']")
                else:
                    # It's a state_dict, need to reconstruct architecture
                    logger.info("Detected state_dict format, analyzing structure...")

                    # Get the state_dict
                    if 'state_dict' in checkpoint:
                        state_dict = checkpoint['state_dict']
                    else:
                        state_dict = checkpoint

                    # Check if this is a custom architecture with 'backbone' and 'head'
                    has_backbone = any('backbone' in key for key in state_dict.keys())
                    has_head = any('head' in key for key in state_dict.keys())
                    has_model_prefix = any('model.stem' in key or 'model.stages' in key for key in state_dict.keys())

                    if has_backbone and has_head:
                        logger.info("Detected custom ConvNeXt with 'backbone' and 'head' structure")
                        model = self._load_custom_convnext(state_dict)
                    elif has_model_prefix and has_head:
                        logger.info("Detected timm-based ConvNeXt with 'model.' prefix")
                        model = self._load_timm_convnext(state_dict)
                    else:
                        logger.info("Detected standard architecture, using torchvision ConvNeXt")
                        model = self._load_torchvision_convnext(state_dict)
            else:
                # It's the full model
                model = checkpoint
                logger.info("Loaded full model directly")

            model = model.to(self.device)
            model.eval()
            logger.info("Model loaded successfully and set to eval mode")
            return model

        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise

    def _load_custom_convnext(self, state_dict: dict) -> nn.Module:
        """Load custom ConvNeXt model with backbone/head structure"""
        # Try to determine number of classes from head - find the LAST linear layer
        num_classes = 21  # Default
        head_layers = {}

        # Collect all head layers
        for key in state_dict.keys():
            if 'head' in key and 'weight' in key and 'bn' not in key.lower():
                shape = state_dict[key].shape
                if len(shape) == 2:  # Linear layer
                    # Extract layer number
                    try:
                        layer_num = int(key.split('.')[1])
                        head_layers[layer_num] = (key, shape[0])
                    except (ValueError, IndexError):
                        pass

        # Get the last linear layer (highest layer number)
        if head_layers:
            last_layer_num = max(head_layers.keys())
            key, num_classes = head_layers[last_layer_num]
            logger.info(f"Detected {num_classes} output classes from FINAL head layer: {key}")
        else:
            logger.warning(f"Could not detect output classes from head, using default: {num_classes}")

        logger.info(f"Loading custom ConvNeXt Tiny with {num_classes} classes")

        # Use custom wrapper that properly handles backbone + head
        try:
            model = CustomConvNeXtWithHead(state_dict, num_classes)
            logger.info("Successfully created custom ConvNeXt model with backbone and head")
            return model
        except Exception as e:
            logger.error(f"Failed to create custom model: {str(e)}")
            raise

    def _load_timm_convnext(self, state_dict: dict) -> nn.Module:
        """Load timm-based ConvNeXt with model.stem/stages structure"""
        # Detect number of classes from head
        num_classes = 20  # Default
        for key in state_dict.keys():
            if key.startswith('head.') and 'weight' in key and 'norm' not in key:
                shape = state_dict[key].shape
                if len(shape) == 2:  # Linear layer
                    num_classes = shape[0]
                    logger.info(f"Detected {num_classes} output classes from {key}")

        logger.info(f"Loading timm ConvNeXt Tiny with {num_classes} classes")

        if not TIMM_AVAILABLE:
            raise ImportError("timm library is required to load this model. Install with: pip install timm")

        # Create timm ConvNeXt model
        model = timm.create_model('convnext_tiny', pretrained=False, num_classes=0)
        
        # Separate model backbone and head weights
        model_state = {}
        head_state = {}
        
        for key, value in state_dict.items():
            if key.startswith('model.'):
                # Remove 'model.' prefix for timm model
                new_key = key.replace('model.', '')
                model_state[new_key] = value
            elif key.startswith('head.'):
                # Keep head weights separate
                head_state[key] = value
        
        # Load model weights (strict=False to handle any minor mismatches)
        model.load_state_dict(model_state, strict=False)
        logger.info(f"Loaded ConvNeXt backbone with {len(model_state)} parameters")
        
        # Build classification head
        # Get feature dimension from model
        with torch.no_grad():
            dummy_input = torch.randn(1, 3, 224, 224)
            features = model(dummy_input)
            feature_dim = features.shape[1]
        
        logger.info(f"Feature dimension: {feature_dim}")
        
        # Build head from state dict
        head_layers = []
        layer_indices = sorted(set(int(k.split('.')[1]) for k in head_state.keys() if k.count('.') >= 2 and k.split('.')[1].isdigit()))
        
        for idx in layer_indices:
            weight_key = f'head.{idx}.weight'
            if weight_key in head_state:
                weight = head_state[weight_key]
                if len(weight.shape) == 2:  # Linear layer
                    out_dim, in_dim = weight.shape
                    linear = nn.Linear(in_dim, out_dim)
                    linear.weight.data = weight
                    if f'head.{idx}.bias' in head_state:
                        linear.bias.data = head_state[f'head.{idx}.bias']
                    head_layers.append(linear)
                    logger.info(f"  Head layer {idx}: Linear({in_dim} -> {out_dim})")
                    
                    # Add ReLU after linear layers except the last one
                    if out_dim != num_classes:
                        head_layers.append(nn.ReLU(inplace=True))
                        logger.info(f"  Head layer {idx}+: ReLU")
        
        if not head_layers:
            # Fallback to simple linear head
            logger.info(f"No head layers found, creating simple linear head: {feature_dim} -> {num_classes}")
            head_layers = [nn.Linear(feature_dim, num_classes)]
        
        # Create complete model with backbone and head
        class ConvNeXtWithHead(nn.Module):
            def __init__(self, backbone, head):
                super().__init__()
                self.backbone = backbone
                self.head = head
            
            def forward(self, x):
                features = self.backbone(x)
                return self.head(features)
        
        complete_model = ConvNeXtWithHead(model, nn.Sequential(*head_layers))
        logger.info("Successfully created timm ConvNeXt model with custom head")
        return complete_model

    def _load_torchvision_convnext(self, state_dict: dict) -> nn.Module:
        """Load standard torchvision ConvNeXt"""
        from torchvision import models

        num_classes = 21
        for key in state_dict.keys():
            if 'classifier' in key and 'weight' in key:
                num_classes = state_dict[key].shape[0]
                logger.info(f"Detected {num_classes} output classes")
                break

        model = models.convnext_tiny(weights=None)
        num_features = model.classifier[2].in_features
        model.classifier[2] = nn.Linear(num_features, num_classes)
        model.load_state_dict(state_dict)
        return model

    def _load_class_names(self) -> list:
        """
        Load class names for the model.

        Returns the 20 Pakistani food classes in the specified order.
        """
        return [
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
            "Zarda" ]   


    def _get_num_classes(self) -> int:
        """Get number of output classes from the model"""
        # Try to infer from the last layer
        try:
            # Common patterns for classifier layers
            if hasattr(self.model, 'classifier'):
                last_layer = self.model.classifier
                if isinstance(last_layer, nn.Sequential):
                    last_layer = last_layer[-1]
                if hasattr(last_layer, 'out_features'):
                    return last_layer.out_features
            elif hasattr(self.model, 'fc'):
                if hasattr(self.model.fc, 'out_features'):
                    return self.model.fc.out_features

            # Default fallback - Pakistani food dataset
            logger.warning("Could not determine number of classes, using default")
            return 21  # Pakistani food dataset has 21 classes

        except Exception as e:
            logger.error(f"Error getting num_classes: {str(e)}")
            return 21

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """
        Preprocess image for model input

        Args:
            image: PIL Image

        Returns:
            Preprocessed tensor ready for model
        """
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Apply transformations
        tensor = self.transform(image)

        # Add batch dimension
        tensor = tensor.unsqueeze(0)

        return tensor.to(self.device)

    def predict(self, image: Image.Image, top_k: int = 3) -> list:
        """
        Predict food class from image

        Args:
            image: PIL Image
            top_k: Number of top predictions to return (default: 3)

        Returns:
            Dictionary with safety status and predictions
        """
        # Use SafeFoodPredictor to apply safety checks before confirming
        predictor = SafeFoodPredictor(self.model, self.class_names, device=self.device)
        return predictor.predict_with_safeguards(image, top_k=top_k)

    def predict_from_bytes(self, image_bytes: bytes, top_k: int = 3) -> list:
        """
        Predict food class from image bytes

        Args:
            image_bytes: Image file bytes
            top_k: Number of top predictions to return (default: 3)

        Returns:
            List of tuples (class_name, confidence) sorted by confidence
        """
        from io import BytesIO

        # Load image from bytes
        image = Image.open(BytesIO(image_bytes))

        return self.predict(image, top_k)


# Global detector instance
_detector: Optional[FoodDetector] = None


def get_detector() -> FoodDetector:
    """Get the global food detector instance"""
    global _detector
    if _detector is None:
        raise RuntimeError("Food detector not initialized. Call initialize_detector() first.")
    return _detector


def initialize_detector(model_path: str) -> None:
    """Initialize the global food detector"""
    global _detector
    _detector = FoodDetector(model_path)


def is_initialized() -> bool:
    """Check if detector is initialized"""
    return _detector is not None
