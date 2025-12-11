"""Food Detection Service using PyTorch EfficientNet"""
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


class CustomEfficientNetWithHead(nn.Module):
    """
    Custom EfficientNet wrapper that properly connects backbone and head
    This handles models saved with 'backbone.' and 'head.' prefixes
    """

    def __init__(self, state_dict: dict, num_classes: int):
        super().__init__()

        self.num_classes = num_classes
        logger.info(f"Creating custom model with {num_classes} classes")

        # Load backbone using timm
        try:
            if TIMM_AVAILABLE:
                # Create EfficientNet backbone
                self.backbone = timm.create_model('efficientnet_b0', pretrained=False, num_classes=0)

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


class FlexibleEfficientNet(nn.Module):
    """
    Flexible wrapper for loading EfficientNet models with custom architectures
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
            "FlexibleEfficientNet forward pass not implemented. "
            "Please install timm library: pip install timm"
        )


class FoodDetector:
    """Food detection service using EfficientNet model"""

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
        # Standard EfficientNet preprocessing
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

                    if has_backbone and has_head:
                        logger.info("Detected custom EfficientNet with 'backbone' and 'head' structure")
                        model = self._load_custom_efficientnet(state_dict)
                    else:
                        logger.info("Detected standard architecture, using torchvision")
                        model = self._load_torchvision_efficientnet(state_dict)
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

    def _load_custom_efficientnet(self, state_dict: dict) -> nn.Module:
        """Load custom EfficientNet model with backbone/head structure"""
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

        logger.info(f"Loading custom EfficientNet with {num_classes} classes")

        # Use custom wrapper that properly handles backbone + head
        try:
            model = CustomEfficientNetWithHead(state_dict, num_classes)
            logger.info("Successfully created custom model with backbone and head")
            return model
        except Exception as e:
            logger.error(f"Failed to create custom model: {str(e)}")
            raise

    def _load_torchvision_efficientnet(self, state_dict: dict) -> nn.Module:
        """Load standard torchvision EfficientNet"""
        from torchvision import models

        num_classes = 21
        for key in state_dict.keys():
            if 'classifier' in key and 'weight' in key:
                num_classes = state_dict[key].shape[0]
                logger.info(f"Detected {num_classes} output classes")
                break

        model = models.efficientnet_b0(weights=None)
        num_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_features, num_classes)
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

    def predict(self, image: Image.Image, top_k: int = 1) -> list:
        """
        Predict food class from image

        Args:
            image: PIL Image
            top_k: Number of top predictions to return

        Returns:
            List of tuples (class_name, confidence) sorted by confidence
        """
        try:
            with torch.no_grad():
                # Preprocess
                input_tensor = self.preprocess_image(image)
                print(f"[DEBUG] Input tensor shape: {input_tensor.shape}")
                logger.info(f"Input tensor shape: {input_tensor.shape}")

                # Run inference
                outputs = self.model(input_tensor)
                print(f"[DEBUG] Raw outputs type: {type(outputs)}")
                print(f"[DEBUG] Raw outputs shape: {outputs.shape if hasattr(outputs, 'shape') else 'N/A'}")
                logger.info(f"Raw outputs type: {type(outputs)}, shape: {outputs.shape if hasattr(outputs, 'shape') else 'N/A'}")

                # Handle different output formats
                if isinstance(outputs, tuple):
                    # Model returns tuple (logits, aux_outputs)
                    logits = outputs[0]
                    print(f"[DEBUG] Model returned tuple, using first element")
                elif torch.is_tensor(outputs):
                    # Model returns tensor directly
                    logits = outputs
                    print(f"[DEBUG] Model returned tensor directly")
                else:
                    raise ValueError(f"Unexpected output type: {type(outputs)}")

                print(f"[DEBUG] Logits shape before squeeze: {logits.shape}")
                print(f"[DEBUG] Number of class names: {len(self.class_names)}")

                # Remove batch dimension if present
                if len(logits.shape) > 1:
                    logits = logits.squeeze(0)

                print(f"[DEBUG] Logits shape after squeeze: {logits.shape}")
                logger.info(f"Logits shape after processing: {logits.shape}")

                # Get probabilities
                probabilities = torch.nn.functional.softmax(logits, dim=0)
                print(f"[DEBUG] Probabilities shape: {probabilities.shape}")
                logger.info(f"Probabilities shape: {probabilities.shape}")

                # Get top k predictions
                top_k_count = min(top_k, len(self.class_names), len(probabilities))
                print(f"[DEBUG] Getting top {top_k_count} predictions")
                top_probs, top_indices = torch.topk(probabilities, top_k_count)

                print(f"[DEBUG] Top indices: {top_indices}")
                print(f"[DEBUG] Top probs: {top_probs}")

                # Format results
                results = []
                for prob, idx in zip(top_probs, top_indices):
                    idx_val = idx.item()
                    print(f"[DEBUG] Processing index {idx_val}, prob {prob.item():.4f}")
                    print(f"[DEBUG] Class names length: {len(self.class_names)}")

                    if idx_val < len(self.class_names):
                        class_name = self.class_names[idx_val]
                        confidence = prob.item()
                        results.append((class_name, confidence))
                        print(f"[DEBUG] Added prediction: {class_name} ({confidence:.4f})")
                        logger.info(f"Prediction: {class_name} ({confidence:.4f})")
                    else:
                        print(f"[DEBUG] WARNING: Index {idx_val} out of range!")
                        logger.warning(f"Index {idx_val} out of range for class_names (len={len(self.class_names)})")

                print(f"[DEBUG] Total results: {len(results)}")

                if not results:
                    logger.error("No valid predictions generated")
                    raise ValueError("Model produced no valid predictions")

                return results

        except Exception as e:
            logger.error(f"Error in predict method: {str(e)}", exc_info=True)
            raise

    def predict_from_bytes(self, image_bytes: bytes, top_k: int = 1) -> list:
        """
        Predict food class from image bytes

        Args:
            image_bytes: Image file bytes
            top_k: Number of top predictions to return

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
