@echo off
REM URGENT: Force backend to reload passphrase
REM This script completely recreates the container

echo ==========================================
echo URGENT: Force Backend Passphrase Reload
echo ==========================================
echo.

echo Step 1: Verify passphrase in .env file
echo ----------------------------------------
ssh root@141.136.44.168 "cat /var/pdflab/app/backend/.env.production | findstr PAYFAST_PASSPHRASE"
echo.

echo Step 2: Stop current backend container
echo ----------------------------------------
ssh root@141.136.44.168 "docker stop pdflab-backend-prod"
echo.

echo Step 3: Remove old container completely
echo ----------------------------------------
ssh root@141.136.44.168 "docker rm pdflab-backend-prod"
echo.

echo Step 4: Create NEW container with fresh environment
echo ----------------------------------------
ssh root@141.136.44.168 "docker run -d --name pdflab-backend-prod --restart unless-stopped -p 3006:3006 --network app_pdflab-network --env-file /var/pdflab/app/backend/.env.production -e NODE_ENV=production -e DB_HOST=8731b5f977d0_pdflab-mysql-prod -e REDIS_HOST=f18c830e3d31_pdflab-redis-prod -v /var/pdflab/storage:/app/storage -v /var/pdflab/logs:/app/logs mkelam/pdflab-backend:latest"
echo.

echo Step 5: Wait for container to start...
echo ----------------------------------------
timeout /t 15 /nobreak
echo.

echo Step 6: Check container status
echo ----------------------------------------
ssh root@141.136.44.168 "docker ps | findstr pdflab-backend"
echo.

echo Step 7: Verify passphrase loaded in container
echo ----------------------------------------
ssh root@141.136.44.168 "docker exec pdflab-backend-prod printenv | findstr PAYFAST_PASSPHRASE"
echo.

echo Step 8: Check backend logs
echo ----------------------------------------
ssh root@141.136.44.168 "docker logs pdflab-backend-prod --tail 30"
echo.

echo ==========================================
echo Done! Backend should now have passphrase
echo ==========================================
echo.
echo Next: Test payment at https://pdflab.pro/pricing
echo.

pause
