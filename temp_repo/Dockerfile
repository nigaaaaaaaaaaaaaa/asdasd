# artifacts/render-worker/Dockerfile
FROM python:3.11-slim-bookworm

# Install dependencies
RUN apt-get update && apt-get install -y \
    blender \
    ffmpeg \
    libgl1-mesa-dri \
    libegl1 \
    libopengl0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy worker code
COPY src /app/src

# Set environment
ENV BLENDER_PATH=/usr/bin/blender
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Entrypoint to run tests or worker
ENTRYPOINT ["python", "src/runner.py"]
