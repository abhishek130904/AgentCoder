#!/usr/bin/env bash
# build.sh — Render build script
# Set this as the "Build Command" in Render dashboard.

set -o errexit  # Exit on error

# 1. Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 2. Build the React frontend
cd frontend
npm ci
npm run build
cd ..

echo "✅ Build complete — frontend/dist/ ready"
