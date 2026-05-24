FROM python:3.13-slim

WORKDIR /app

# Install Node.js for building the React frontend
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build the React frontend → frontend/dist/
WORKDIR /app/frontend
RUN npm ci && npm run build

WORKDIR /app

EXPOSE 10000

# Use Render's $PORT (defaults to 10000)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
