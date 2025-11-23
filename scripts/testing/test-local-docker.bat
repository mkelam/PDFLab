@echo off
REM PDFLab Local Docker Testing Script
REM Tests v1.1.0 images locally before production deployment

echo ========================================
echo PDFLab v1.1.0 Local Testing
echo ========================================
echo.

REM Stop existing containers
echo [1/6] Stopping existing containers...
docker stop pdflab-backend pdflab-frontend 2>nul
docker rm pdflab-backend pdflab-frontend 2>nul
echo.

REM Ensure database and Redis are running
echo [2/6] Starting MySQL and Redis containers...
docker start pdflab-mysql pdflab-redis 2>nul
if errorlevel 1 (
    echo ERROR: MySQL or Redis containers not found!
    echo Please run: docker-compose up -d mysql redis
    pause
    exit /b 1
)
timeout /t 5 /nobreak > nul
echo.

REM Run database migration
echo [3/6] Running database migration...
echo.
cd backend\src\migrations
mysql -h localhost -P 3306 -u pdflab -p***REMOVED*** pdflab < 001_add_batch_processing.sql
if errorlevel 1 (
    echo ERROR: Migration failed!
    cd ..\..\..
    pause
    exit /b 1
)
cd ..\..\..
echo Migration completed successfully!
echo.

REM Start backend container
echo [4/6] Starting backend container (v1.1.0)...
docker run -d ^
  --name pdflab-backend ^
  --network bridge ^
  -p 3006:3006 ^
  -e NODE_ENV=development ^
  -e DB_HOST=host.docker.internal ^
  -e REDIS_HOST=host.docker.internal ^
  -v "%CD%\backend\storage":/app/storage ^
  --env-file backend/.env ^
  mkelam/pdflab-backend:v1.1.0

if errorlevel 1 (
    echo ERROR: Failed to start backend!
    pause
    exit /b 1
)
echo Backend started successfully!
echo.

REM Wait for backend to be ready
echo [5/6] Waiting for backend to initialize (30 seconds)...
timeout /t 30 /nobreak > nul
echo.

REM Check backend health
echo Checking backend health...
curl -s http://localhost:3006/health
echo.
echo.

REM Start frontend container
echo [6/6] Starting frontend container (v1.1.0)...
docker run -d ^
  --name pdflab-frontend ^
  --network bridge ^
  -p 3000:3000 ^
  -e NEXT_PUBLIC_API_URL=http://localhost:3006 ^
  mkelam/pdflab-frontend:v1.1.0

if errorlevel 1 (
    echo ERROR: Failed to start frontend!
    pause
    exit /b 1
)
echo Frontend started successfully!
echo.

echo ========================================
echo Docker Containers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:3006
echo Frontend: http://localhost:3000
echo.
echo Container Status:
docker ps --filter "name=pdflab" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo ========================================
echo Testing Checklist:
echo ========================================
echo [ ] 1. Test batch processing (Pro user: mmkela@gmail.com)
echo [ ] 2. Test PDF compression feature
echo [ ] 3. Test enhanced OCR (text should be editable)
echo [ ] 4. Check Sentry error tracking (if DSN configured)
echo [ ] 5. Verify all existing features work
echo [ ] 6. Check admin panel functionality
echo.
echo To view logs:
echo   Backend:  docker logs -f pdflab-backend
echo   Frontend: docker logs -f pdflab-frontend
echo.
echo To stop containers:
echo   docker stop pdflab-backend pdflab-frontend
echo.
pause
