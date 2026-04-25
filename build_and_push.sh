#!/bin/bash

# Exit on any error
set -e

DOCKER_USERNAME="suryaa112003"
TAG="latest"

echo "Building and pushing images for Hospital Management System..."

# Build images
echo "1/6 Building frontend..."
docker build -t ${DOCKER_USERNAME}/frontend:${TAG} ./frontend

echo "2/6 Building api-gateway..."
docker build -t ${DOCKER_USERNAME}/api-gateway:${TAG} ./services/api-gateway

echo "3/6 Building auth-service..."
docker build -t ${DOCKER_USERNAME}/auth-service:${TAG} ./services/auth-service

echo "4/6 Building user-service..."
docker build -t ${DOCKER_USERNAME}/user-service:${TAG} ./services/user-service

echo "5/6 Building appointment-service..."
docker build -t ${DOCKER_USERNAME}/appointment-service:${TAG} ./services/appointment-service

echo "6/6 Building notification-service..."
docker build -t ${DOCKER_USERNAME}/notification-service:${TAG} ./services/notification-service

# Push images
echo "Pushing images to Docker Hub..."
docker push ${DOCKER_USERNAME}/frontend:${TAG}
docker push ${DOCKER_USERNAME}/api-gateway:${TAG}
docker push ${DOCKER_USERNAME}/auth-service:${TAG}
docker push ${DOCKER_USERNAME}/user-service:${TAG}
docker push ${DOCKER_USERNAME}/appointment-service:${TAG}
docker push ${DOCKER_USERNAME}/notification-service:${TAG}

echo "All images built and pushed successfully! Don't forget to run 'kubectl rollout restart deployment' if applying changes to an existing cluster."
