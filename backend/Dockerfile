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

# Install Python dependencies (cache enabled for faster rebuilds)
RUN pip install -r requirements.txt

# Copy application code
COPY backend/ .

# Copy model file
COPY model/SehatGuru_ConvNeXt_Final.pth /app/model/SehatGuru_ConvNeXt_Final.pth

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "main.py"]
