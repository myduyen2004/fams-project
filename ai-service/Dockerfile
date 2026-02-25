# ========================================
# UPDATED BUILD: Full Python base for ONNX compatibility
# ========================================
FROM python:3.10

WORKDIR /app

# Enable bytecode compilation and unbuffered output
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    gcc \
    g++ \
    curl \
    git \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Install core scientific stack
RUN uv pip install --system numpy==1.26.3 pandas==2.1.4 scikit-learn==1.4.0

# Install CV and MediaPipe
RUN uv pip install --system opencv-python-headless==4.11.0.86 mediapipe==0.10.9

# Install Face Recognition models
RUN git clone https://github.com/ageitgey/face_recognition_models /tmp/models && \
    uv pip install --system /tmp/models && \
    rm -rf /tmp/models
RUN uv pip install --system face-recognition==1.3.0

# Install remaining requirements
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

# Create non-root user
RUN useradd -m -u 1001 appuser

# Create required folders
RUN mkdir -p data/faces/registered data/faces/temp data/temp data/logs \
    app/models/anti_spoof && \
    chown -R appuser:appuser /app

# Download anti-spoof V2 model (Verified Release Binary)
RUN curl -L -o app/models/anti_spoof/MiniFASNetV2.onnx \
    https://github.com/yakhyo/face-anti-spoofing/releases/download/weights/MiniFASNetV2.onnx || \
    echo "Warning: Failed to download model"

# Copy source code
COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 5000
CMD ["python", "-m", "app.main"]
