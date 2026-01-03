# ========================================
# STAGE 1: Builder
# ========================================
FROM python:3.10-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    cmake \
    gcc \
    g++ \
    libc-dev \
    libffi-dev \
    postgresql-dev \
    musl-dev \
    linux-headers \
    python3-dev \
    jpeg-dev \
    zlib-dev \
    openblas-dev \
    libstdc++ \
    libx11 \
    libxrender \
    libxext \
    mesa-gl \
    curl \
    git

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ========================================
# STAGE 2: Runtime
# ========================================
FROM python:3.10-alpine

WORKDIR /app

# Install runtime dependencies ONLY (no build tools)
RUN apk add --no-cache \
    libstdc++ \
    libx11 \
    libxrender \
    libxext \
    mesa-gl \
    libpq \
    openblas \
    jpeg \
    zlib

# Create non-root user
RUN adduser -D -u 1001 appuser

# Copy installed packages from builder
COPY --from=builder /install /usr/local

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
    PYTHONPATH=/usr/local/lib/python3.10/site-packages

EXPOSE 5000

CMD ["python", "app/main.py"]
