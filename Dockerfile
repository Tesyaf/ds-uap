FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files into container
COPY . .

# Declare build arguments (Railway passes variables during build as ARGs)
ARG DAGSHUB_REPO
ARG DAGSHUB_TOKEN
ARG MLFLOW_TRACKING_PASSWORD

# Set as environment variables for download script
ENV DAGSHUB_REPO=$DAGSHUB_REPO
ENV DAGSHUB_TOKEN=$DAGSHUB_TOKEN
ENV MLFLOW_TRACKING_PASSWORD=$MLFLOW_TRACKING_PASSWORD

# Download DVC-tracked assets from DagsHub at build time
RUN python utils/download_assets.py

# Set dynamic port binding matching Railway
ENV PORT=5000
ENV FLASK_APP=app.py

EXPOSE 5000

# Start app using gunicorn with shell formatting to support Railway's port injection
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120"]
