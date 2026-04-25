# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies, Node.js, and Playwright dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the entire repository into the container
COPY . .

# 1. Setup Python AI Engine
WORKDIR /app/ai-engine
RUN pip install --no-cache-dir -r requirements.txt

# 2. Setup Next.js Frontend
WORKDIR /app
# Install frontend dependencies
RUN npm install

# Install Playwright and its Chromium dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# Build the Next.js app for production
RUN npm run build

# Make the start script executable
RUN chmod +x /app/start.sh

# Expose the port Hugging Face Spaces expects (7860)
EXPOSE 7860

# Command to run both the FastAPI server and Next.js frontend
CMD ["/app/start.sh"]
