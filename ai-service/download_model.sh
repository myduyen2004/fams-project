#!/bin/bash
# Script to download MiniFASNetV2 ONNX model for anti-spoofing

MODEL_DIR="app/models/anti_spoof"
MODEL_URL="https://github.com/yakhyo/face-anti-spoofing/raw/main/weights/MiniFASNetV2.onnx"
MODEL_FILE="$MODEL_DIR/MiniFASNetV2.onnx"

echo "Creating model directory..."
mkdir -p "$MODEL_DIR"

echo "Downloading MiniFASNetV2 ONNX model..."
wget -O "$MODEL_FILE" "$MODEL_URL" || curl -L -o "$MODEL_FILE" "$MODEL_URL"

if [ -f "$MODEL_FILE" ]; then
    echo "Model downloaded successfully to $MODEL_FILE"
    ls -lh "$MODEL_FILE"
else
    echo "ERROR: Failed to download model"
    exit 1
fi
