#!/bin/bash

################################################################################
# PDFLab Environment Setup Script
################################################################################
# This interactive script helps you create a production .env file
# Usage: bash setup-env.sh
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/opt/pdflab"
ENV_FILE="$APP_DIR/.env"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}PDFLab Environment Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Create directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Creating application directory: $APP_DIR${NC}"
    sudo mkdir -p "$APP_DIR"
fi

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: .env file already exists at $ENV_FILE${NC}"
    read -p "Do you want to overwrite it? (yes/no): " OVERWRITE
    if [ "$OVERWRITE" != "yes" ]; then
        echo "Aborting setup."
        exit 0
    fi
    # Backup existing file
    sudo cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}Backup created${NC}"
fi

echo ""
echo -e "${BLUE}This script will guide you through creating your production .env file.${NC}"
echo -e "${BLUE}Press Enter to use default values shown in [brackets].${NC}"
echo ""

# Helper function to generate random passwords
generate_password() {
    openssl rand -base64 $1 | tr -d "=+/" | cut -c1-$1
}

################################################################################
# Collect Information
################################################################################

# Server Configuration
echo -e "${GREEN}=== Server Configuration ===${NC}"
read -p "API URL (e.g., https://api.pdflab.com): " API_URL
while [ -z "$API_URL" ]; do
    echo -e "${RED}API URL is required!${NC}"
    read -p "API URL: " API_URL
done

# Database Configuration
echo ""
echo -e "${GREEN}=== Database Configuration ===${NC}"
read -p "Database user [pdflab_prod]: " DB_USER
DB_USER=${DB_USER:-pdflab_prod}

echo -e "${YELLOW}Generating secure database password...${NC}"
DB_PASSWORD=$(generate_password 32)
echo -e "${GREEN}Database password generated: ${DB_PASSWORD}${NC}"
echo -e "${YELLOW}IMPORTANT: Save this password securely!${NC}"

read -p "Database name [pdflab]: " DB_NAME
DB_NAME=${DB_NAME:-pdflab}

# Redis Configuration
echo ""
echo -e "${GREEN}=== Redis Configuration ===${NC}"
echo -e "${YELLOW}Generating secure Redis password...${NC}"
REDIS_PASSWORD=$(generate_password 32)
echo -e "${GREEN}Redis password generated: ${REDIS_PASSWORD}${NC}"

# CloudConvert API
echo ""
echo -e "${GREEN}=== CloudConvert API ===${NC}"
echo "Get your API key from: https://cloudconvert.com/dashboard/api/v2/keys"
read -p "CloudConvert API Key: " CLOUDCONVERT_API_KEY
while [ -z "$CLOUDCONVERT_API_KEY" ]; do
    echo -e "${RED}CloudConvert API Key is required!${NC}"
    read -p "CloudConvert API Key: " CLOUDCONVERT_API_KEY
done

# JWT Configuration
echo ""
echo -e "${GREEN}=== JWT Authentication ===${NC}"
echo -e "${YELLOW}Generating JWT secret...${NC}"
JWT_SECRET=$(generate_password 64)
echo -e "${GREEN}JWT secret generated${NC}"

# CORS Configuration
echo ""
echo -e "${GREEN}=== CORS Configuration ===${NC}"
echo "Enter your frontend domain(s), comma-separated"
echo "Example: https://pdflab.com,https://www.pdflab.com"
read -p "CORS Origins: " CORS_ORIGIN
while [ -z "$CORS_ORIGIN" ]; do
    echo -e "${RED}CORS Origin is required!${NC}"
    read -p "CORS Origins: " CORS_ORIGIN
done

# PayFast Configuration
echo ""
echo -e "${GREEN}=== PayFast Payment Gateway ===${NC}"
echo "Get credentials from: https://www.payfast.io/"
read -p "PayFast Merchant ID: " PAYFAST_MERCHANT_ID
while [ -z "$PAYFAST_MERCHANT_ID" ]; do
    echo -e "${RED}PayFast Merchant ID is required!${NC}"
    read -p "PayFast Merchant ID: " PAYFAST_MERCHANT_ID
done

read -p "PayFast Merchant Key: " PAYFAST_MERCHANT_KEY
while [ -z "$PAYFAST_MERCHANT_KEY" ]; do
    echo -e "${RED}PayFast Merchant Key is required!${NC}"
    read -p "PayFast Merchant Key: " PAYFAST_MERCHANT_KEY
done

echo -e "${YELLOW}Generating PayFast passphrase...${NC}"
PAYFAST_PASSPHRASE=$(generate_password 24)
echo -e "${GREEN}PayFast passphrase generated: ${PAYFAST_PASSPHRASE}${NC}"
echo -e "${YELLOW}IMPORTANT: Add this passphrase to your PayFast account settings!${NC}"

################################################################################
# Create .env File
################################################################################

echo ""
echo -e "${GREEN}Creating .env file...${NC}"

sudo tee "$ENV_FILE" > /dev/null <<EOF
# ========================================
# PDFLab Production Environment Variables
# Generated: $(date)
# ========================================

# ========================================
# SERVER CONFIGURATION
# ========================================
NODE_ENV=production
PORT=3006
API_URL=$API_URL

# ========================================
# DATABASE CONFIGURATION (MySQL)
# ========================================
DB_HOST=mysql
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# ========================================
# REDIS CONFIGURATION
# ========================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# ========================================
# CLOUDCONVERT API
# ========================================
CLOUDCONVERT_API_KEY=$CLOUDCONVERT_API_KEY
CLOUDCONVERT_SANDBOX=false

# ========================================
# JWT AUTHENTICATION
# ========================================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# ========================================
# STORAGE
# ========================================
STORAGE_PATH=./storage

# ========================================
# FILE UPLOAD LIMITS (bytes)
# ========================================
MAX_FILE_SIZE_FREE=10485760
MAX_FILE_SIZE_STARTER=26214400
MAX_FILE_SIZE_PRO=104857600
MAX_FILE_SIZE_ENTERPRISE=524288000

# ========================================
# CONVERSION LIMITS
# ========================================
CONVERSIONS_LIMIT_FREE=3
CONVERSIONS_LIMIT_STARTER=100
CONVERSIONS_LIMIT_PRO=-1
CONVERSIONS_LIMIT_ENTERPRISE=-1

# ========================================
# CORS CONFIGURATION
# ========================================
CORS_ORIGIN=$CORS_ORIGIN

# ========================================
# RATE LIMITING
# ========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# PAYFAST PAYMENT GATEWAY
# ========================================
PAYFAST_MERCHANT_ID=$PAYFAST_MERCHANT_ID
PAYFAST_MERCHANT_KEY=$PAYFAST_MERCHANT_KEY
PAYFAST_PASSPHRASE=$PAYFAST_PASSPHRASE
PAYFAST_MODE=production
EOF

# Set proper permissions
sudo chmod 600 "$ENV_FILE"

echo -e "${GREEN}.env file created successfully at $ENV_FILE${NC}"
echo ""

################################################################################
# Create Credentials Summary
################################################################################

CREDENTIALS_FILE="$APP_DIR/credentials.txt"
sudo tee "$CREDENTIALS_FILE" > /dev/null <<EOF
PDFLab Production Credentials
Generated: $(date)

IMPORTANT: Store these credentials securely and delete this file after saving them!

Database Password: $DB_PASSWORD
Redis Password: $REDIS_PASSWORD
JWT Secret: $JWT_SECRET
PayFast Passphrase: $PAYFAST_PASSPHRASE

PayFast Configuration:
- Login to https://www.payfast.io/
- Go to Settings ’ Integration
- Add this passphrase: $PAYFAST_PASSPHRASE
- Save and test the integration

API URL: $API_URL
CORS Origins: $CORS_ORIGIN
EOF

sudo chmod 600 "$CREDENTIALS_FILE"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. All credentials saved to: $CREDENTIALS_FILE"
echo "   ${RED}View them with: sudo cat $CREDENTIALS_FILE${NC}"
echo ""
echo "2. Add PayFast passphrase to your PayFast account:"
echo "   - Login to https://www.payfast.io/"
echo "   - Go to Settings ’ Integration"
echo "   - Enter passphrase: $PAYFAST_PASSPHRASE"
echo ""
echo "3. After saving credentials, delete the credentials file:"
echo "   ${YELLOW}sudo rm $CREDENTIALS_FILE${NC}"
echo ""
echo "4. Verify .env file:"
echo "   ${BLUE}sudo cat $ENV_FILE${NC}"
echo ""
echo "5. Run deployment script:"
echo "   ${BLUE}sudo bash /opt/pdflab/deploy-vps.sh${NC}"
echo ""
