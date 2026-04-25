#!/bin/bash

# Exit on error
set -e

echo "Starting SentinelQA Monolith (Hugging Face Space)..."

# 1. Start the Python AI Engine in the background
echo "Starting FastAPI backend..."
cd /app/ai-engine
export PORT=5000
export HOST=127.0.0.1
uvicorn server:app --host $HOST --port $PORT &
# Give the backend a few seconds to boot
sleep 3

# 2. Start the Next.js Frontend in the foreground
echo "Starting Next.js frontend..."
cd /app
# Hugging Face Spaces exposes port 7860 to the public
export PORT=7860
export AI_ENGINE_URL=http://127.0.0.1:5000
npm start
