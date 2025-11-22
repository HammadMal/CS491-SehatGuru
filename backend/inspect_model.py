"""Inspect the model structure to understand the architecture"""
import torch
import sys

model_path = "C:/Users/Hammad/Documents/github/CS491-SehatGuru/model/final_effnet_enhanced.pth"

print("Loading model checkpoint...")
checkpoint = torch.load(model_path, map_location='cpu')

print(f"\nCheckpoint type: {type(checkpoint)}")

if isinstance(checkpoint, dict):
    print(f"\nCheckpoint keys: {list(checkpoint.keys())}")

    # Get the state dict
    if 'state_dict' in checkpoint:
        state_dict = checkpoint['state_dict']
        print("\nUsing checkpoint['state_dict']")
    elif 'model' in checkpoint:
        model = checkpoint['model']
        print(f"\nCheckpoint contains full model: {type(model)}")
        print(f"Model class: {model.__class__.__name__}")
        sys.exit(0)
    else:
        state_dict = checkpoint
        print("\nUsing checkpoint directly as state_dict")

    # Print first 20 keys
    print(f"\nTotal parameters: {len(state_dict)}")
    print("\nFirst 20 keys:")
    for i, key in enumerate(list(state_dict.keys())[:20]):
        shape = state_dict[key].shape if hasattr(state_dict[key], 'shape') else 'N/A'
        print(f"  {i+1}. {key}: {shape}")

    # Print last 10 keys (usually classifier/head)
    print("\nLast 10 keys (head/classifier):")
    for i, key in enumerate(list(state_dict.keys())[-10:]):
        shape = state_dict[key].shape if hasattr(state_dict[key], 'shape') else 'N/A'
        print(f"  {key}: {shape}")

    # Check for classifier output size
    for key in state_dict.keys():
        if 'head' in key.lower() and 'weight' in key and 'bn' not in key.lower():
            print(f"\nFound head layer: {key}")
            print(f"  Shape: {state_dict[key].shape}")
            if len(state_dict[key].shape) == 2:
                print(f"  Output classes: {state_dict[key].shape[0]}")
else:
    print("\nCheckpoint is a full model object")
    print(f"Model type: {type(checkpoint)}")
    print(f"Model class: {checkpoint.__class__.__name__}")
