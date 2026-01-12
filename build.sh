#!/bin/bash

# Build script for Render.com deployment

echo "🚀 Starting build process..."

# Build client
echo "📦 Building client..."
cd client
npm ci --only=production
npm run build
cd ..

# Build server (if needed)
echo "🔧 Preparing server..."
cd server
npm ci --only=production
cd ..

echo "✅ Build completed successfully!"