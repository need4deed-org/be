#!/bin/bash

# Local Docker Build Script
# Usage: ./build-local.sh [IMAGE_TAG]

set -e

# Default values
IMAGE_TAG=${1:-"latest"}
IMAGE_NAME="n4d-be"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building Docker image locally${NC}"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${YELLOW}🏗️  Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"

# Build the Docker image
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
    echo -e "${GREEN}📦 Image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
    
    # Show image size
    echo -e "${YELLOW}📊 Image details:${NC}"
    docker images ${IMAGE_NAME}:${IMAGE_TAG}
    
    echo -e "${GREEN}🎉 Build completed! You can run it with:${NC}"
    echo -e "docker run -p 5000:5000 -e JWT_SECRET=your_secret_here ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    exit 1
fi