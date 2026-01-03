# ========================================
# STAGE 1: Builder
# ========================================
FROM python:3.10-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    gcc \
    g++ \
    curl \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv (Fast Pip replacement)
RUN pip install uv

# Create Virtual Environment
RUN uv venv /venv

# Install Heavy Dependencies (Split for caching & timeout prevention)
# 1. Scientific Stack
RUN uv pip install --python /venv numpy==1.26.3 pandas==2.1.4 scikit-learn==1.4.0

# 2. Computer Vision (Heavy download)
RUN uv pip install --python /venv opencv-python-headless==4.11.0.86 mediapipe==0.10.9

# 3. Face Recognition (Might require compilation)
RUN uv pip install --python /venv face-recognition==1.3.0

# 4. Install remaining dependencies
COPY requirements.txt .
RUN uv pip install --python /venv -r requirements.txt

# ========================================
# STAGE 2: Runtime
# ========================================
FROM python:3.10-slim

WORKDIR /app

# Install runtime dependencies ONLY
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 appuser

# Copy virtual environment from builder
COPY --from=builder /venv /venv

# Copy source code
COPY --chown=appuser:appuser . .

# Create required folders
RUN mkdir -p data/faces/registered data/faces/temp data/temp data/logs \
    ml_models/pretrained ml_models/trained && \
    chown -R appuser:appuser data ml_models

# Switch to non-root user
USER appuser

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH"

EXPOSE 5000

CMD ["python", "app/main.py"]
