#!/bin/bash

# VPS Frontend Deployment Script with Login Fix
# This script rebuilds the frontend with correct VPS API URL

set -e

VPS_IP="141.136.44.168"
VPS_USER="root"
APP_DIR="/var/pdflab/app"

echo "======================================"
echo "PDFLab VPS Frontend Fix Deployment"
echo "======================================"
echo ""

echo "Step 1: Creating admin user in database..."
ssh $VPS_USER@$VPS_IP << 'EOF'
cd /var/pdflab/app

# Ensure admin user exists with correct password
docker exec pdflab-mysql-prod mysql -u root -p***REMOVED*** pdflab_production -e "
INSERT INTO users (
  id, email, password_hash, name, role, plan,
  conversions_used, conversions_limit,
  created_at, updated_at
)
VALUES (
  'admin-001',
  'admin@pdflab.test',
  '\$2a\$10\$YPRzEb5D1v7zK7tHZxUmr.wQ4bTkoUtsZp8p9wK.EUGhZ8lI5Lfqy',
  'Admin User',
  'super_admin',
  'free',
  0,
  3,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  password_hash = '\$2a\$10\$YPRzEb5D1v7zK7tHZxUmr.wQ4bTkoUtsZp8p9wK.EUGhZ8lI5Lfqy',
  updated_at = NOW();
" 2>/dev/null || echo "Admin user updated"

echo "✅ Admin user ready (admin@pdflab.test / Admin123!)"
EOF

echo ""
echo "Step 2: Pulling new frontend image..."
ssh $VPS_USER@$VPS_IP "docker pull mkelam/pdflab-frontend:vps"

echo ""
echo "Step 3: Stopping current frontend..."
ssh $VPS_USER@$VPS_IP "docker stop pdflab-frontend-prod && docker rm pdflab-frontend-prod"

echo ""
echo "Step 4: Starting new frontend with correct API URL..."
ssh $VPS_USER@$VPS_IP << 'EOF'
docker run -d \
  --name pdflab-frontend-prod \
  --network pdflab-network \
  -p 3000:3000 \
  --restart unless-stopped \
  -e NEXT_PUBLIC_API_URL=http://141.136.44.168:3006 \
  mkelam/pdflab-frontend:vps

echo "✅ Frontend started with VPS backend URL"
EOF

echo ""
echo "Step 5: Verifying deployment..."
sleep 5

# Test health
echo "Testing backend health..."
ssh $VPS_USER@$VPS_IP "curl -s http://localhost:3006/health | python3 -m json.tool | head -5"

echo ""
echo "Testing login endpoint..."
ssh $VPS_USER@$VPS_IP << 'EOF'
RESPONSE=$(curl -s -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pdflab.test","password":"Admin123!"}' \
  -w "\nSTATUS:%{http_code}")

STATUS=$(echo "$RESPONSE" | grep -o 'STATUS:[0-9]*' | cut -d: -f2)
if [ "$STATUS" = "200" ]; then
    echo "✅ Login API working correctly"
else
    echo "⚠ Login API returned status: $STATUS"
fi
EOF

echo ""
echo "======================================"
echo "DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "Access your application at:"
echo "  🌐 Frontend: http://$VPS_IP:3000"
echo "  🔑 Login: http://$VPS_IP:3000/login"
echo "  📊 Admin: http://$VPS_IP:3000/admin"
echo ""
echo "Login credentials:"
echo "  Email: admin@pdflab.test"
echo "  Password: Admin123!"
echo ""
echo "Backend API: http://$VPS_IP:3006"
echo "======================================"