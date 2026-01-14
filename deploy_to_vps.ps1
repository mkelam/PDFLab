# deploy_to_vps.ps1

Write-Host "Starting PDFLab Deployment Build Process..." -ForegroundColor Green

# Configuration
$Version = "latest"
$Registry = "mkelam"

# 1. Backend
Write-Host "`n[1/3] Building Backend..." -ForegroundColor Cyan
docker build -t $Registry/pdflab-backend:$Version -f backend/Dockerfile backend
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }

Write-Host "Pushing Backend..."
docker push $Registry/pdflab-backend:$Version
if ($LASTEXITCODE -ne 0) { Write-Error "Backend push failed"; exit 1 }

# 2. Frontend
Write-Host "`n[2/3] Building Frontend..." -ForegroundColor Cyan
docker build -t $Registry/pdflab-frontend:$Version -f Dockerfile.frontend .
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

Write-Host "Pushing Frontend..."
docker push $Registry/pdflab-frontend:$Version
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend push failed"; exit 1 }

# 3. Partners Portal
Write-Host "`n[3/3] Building Partners Portal..." -ForegroundColor Cyan
docker build -t $Registry/pdflab-partners:$Version -f partners-portal/Dockerfile partners-portal
if ($LASTEXITCODE -ne 0) { Write-Error "Partners Portal build failed"; exit 1 }

Write-Host "Pushing Partners Portal..."
docker push $Registry/pdflab-partners:$Version
if ($LASTEXITCODE -ne 0) { Write-Error "Partners Portal push failed"; exit 1 }

Write-Host "`nBuild and Push Complete!" -ForegroundColor Green
Write-Host "You can now pull these images on your VPS."
