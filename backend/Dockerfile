# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install CPU-only torch first (avoids pulling 2GB of CUDA libraries)
RUN pip install --no-cache-dir torch==2.1.2+cpu torchvision==0.16.2+cpu --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Download model from HuggingFace Hub
ARG HF_TOKEN
RUN pip install --no-cache-dir huggingface_hub && \
    HF_TOKEN="$HF_TOKEN" python -c "import os; from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='Sameer121/ConvNext_Food_Classifier', filename='SehatGuru_ConvNeXt_Final.pth', local_dir='/app/model', token=os.environ.get('HF_TOKEN'))"

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "main.py"]
