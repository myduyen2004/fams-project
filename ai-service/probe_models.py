import onnxruntime as ort
import numpy as np
import os

MODEL_PATH_V2 = '/app/app/models/anti_spoof/MiniFASNetV2.onnx'
MODEL_PATH_V1 = '/app/app/models/anti_spoof/MiniFASNetV1SE.onnx'

def probe(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    session = ort.InferenceSession(path)
    input_name = session.get_inputs()[0].name
    
    # Run dummy inference (all zeros)
    dummy_input = np.zeros((1, 3, 80, 80), dtype=np.float32)
    outputs = session.run(None, {input_name: dummy_input})
    logits = outputs[0][0]
    
    # Softmax
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)
    
    print(f"\nModel: {os.path.basename(path)}")
    print(f"Output shape: {logits.shape}")
    for i, p in enumerate(probs):
        print(f"  Index {i}: {p:.4f}")
    
    # Try to find metadata
    meta = session.get_modelmeta().custom_metadata_map
    print(f"Metadata: {meta}")

print("Probing models...")
probe(MODEL_PATH_V2)
probe(MODEL_PATH_V1)
