$ErrorActionPreference = "Stop"

$DOCKER_USERNAME = "suryaa112003"
$TAG = "latest"

Write-Host "Building and pushing images for Hospital Management System..." -ForegroundColor Cyan

# Build images
Write-Host "1/6 Building frontend..."
docker build -t "$DOCKER_USERNAME/frontend:$TAG" ./frontend

Write-Host "2/6 Building api-gateway..."
docker build -t "$DOCKER_USERNAME/api-gateway:$TAG" ./services/api-gateway

Write-Host "3/6 Building auth-service..."
docker build -t "$DOCKER_USERNAME/auth-service:$TAG" ./services/auth-service

Write-Host "4/6 Building user-service..."
docker build -t "$DOCKER_USERNAME/user-service:$TAG" ./services/user-service

Write-Host "5/6 Building appointment-service..."
docker build -t "$DOCKER_USERNAME/appointment-service:$TAG" ./services/appointment-service

Write-Host "6/6 Building notification-service..."
docker build -t "$DOCKER_USERNAME/notification-service:$TAG" ./services/notification-service

# Push images
Write-Host "Pushing images to Docker Hub..." -ForegroundColor Cyan
docker push "$DOCKER_USERNAME/frontend:$TAG"
docker push "$DOCKER_USERNAME/api-gateway:$TAG"
docker push "$DOCKER_USERNAME/auth-service:$TAG"
docker push "$DOCKER_USERNAME/user-service:$TAG"
docker push "$DOCKER_USERNAME/appointment-service:$TAG"
docker push "$DOCKER_USERNAME/notification-service:$TAG"

Write-Host "All images built and pushed successfully!" -ForegroundColor Green
Write-Host "Don't forget to run 'kubectl rollout restart deployment' if applying changes to an existing cluster." -ForegroundColor Yellow
