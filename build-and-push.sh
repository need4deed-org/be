#!/bin/bash

# AWS ECR Build and Push Script
# Usage: ./build-and-push.sh [AWS_REGION] [ECR_REPOSITORY_NAME] [IMAGE_TAG]

set -e

# Default values
AWS_REGION="eu-central-1"
ECR_REPOSITORY_NAME="be"
IMAGE_TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AWS ECR build and push process${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Get AWS account ID
echo -e "${YELLOW}📋 Getting AWS account information...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS account ID. Please check your AWS credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS Account ID: $AWS_ACCOUNT_ID${NC}"

# ECR repository URI
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"

echo -e "${YELLOW}🔧 Configuration:${NC}"
echo -e "  AWS Region: ${AWS_REGION}"
echo -e "  Repository: ${ECR_REPOSITORY_NAME}"
echo -e "  Image Tag: ${IMAGE_TAG}"
echo -e "  ECR URI: ${ECR_URI}"

# Create ECR repository if it doesn't exist
echo -e "${YELLOW}📦 Checking if ECR repository exists...${NC}"
if ! aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --region $AWS_REGION &> /dev/null; then
    echo -e "${YELLOW}📦 Creating ECR repository: $ECR_REPOSITORY_NAME${NC}"
    aws ecr create-repository --repository-name $ECR_REPOSITORY_NAME --region $AWS_REGION
    echo -e "${GREEN}✅ ECR repository created successfully${NC}"
else
    echo -e "${GREEN}✅ ECR repository already exists${NC}"
fi

# Login to ECR
echo -e "${YELLOW}🔐 Logging into AWS ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully logged into ECR${NC}"
else
    echo -e "${RED}❌ Failed to login to ECR${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${YELLOW}🏗️  Building Docker image...${NC}"
docker build -t $ECR_REPOSITORY_NAME:$IMAGE_TAG .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    exit 1
fi

# Tag the image for ECR
echo -e "${YELLOW}🏷️  Tagging image for ECR...${NC}"
docker tag $ECR_REPOSITORY_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG

# Push the image to ECR
echo -e "${YELLOW}📤 Pushing image to ECR...${NC}"
docker push $ECR_URI:$IMAGE_TAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pushed successfully to ECR${NC}"
    echo -e "${GREEN}🎉 Complete! Image available at: ${ECR_URI}:${IMAGE_TAG}${NC}"
else
    echo -e "${RED}❌ Failed to push image to ECR${NC}"
    exit 1
fi

# Optional: Clean up local images to save space
read -p "Do you want to clean up local Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Cleaning up local images...${NC}"
    docker rmi $ECR_REPOSITORY_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
    echo -e "${GREEN}✅ Local images cleaned up${NC}"
fi

echo -e "${GREEN}🎉 Build and push process completed successfully!${NC}"