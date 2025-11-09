#!/bin/bash
# One-liner fix for VPS - removes passphrase and restarts container
echo "Backing up /root/backend.env..." && \
cp /root/backend.env /root/backend.env.backup.$(date +%Y%m%d_%H%M%S) && \
echo "Removing passphrase..." && \
sed -i 's/^PAYFAST_PASSPHRASE=.*/PAYFAST_PASSPHRASE=/' /root/backend.env && \
echo "Restarting container..." && \
docker stop pdflab-backend-prod && \
docker rm pdflab-backend-prod && \
docker run -d --name pdflab-backend-prod --network app_pdflab-network -p 3006:3006 -v /root/backend.env:/app/.env:ro --restart unless-stopped mkelam/pdflab-backend:latest && \
echo "Waiting 10 seconds..." && \
sleep 10 && \
echo "" && \
echo "✓ Fix applied! Container status:" && \
docker ps --filter name=pdflab-backend-prod --format "table {{.Names}}\t{{.Status}}" && \
echo "" && \
echo "✓ Recent logs:" && \
docker logs pdflab-backend-prod --tail 15 && \
echo "" && \
echo "✓ TEST NOW: https://pdflab.pro/pricing" && \
echo "✓ Expected: Redirect to PayFast (no signature error)"
