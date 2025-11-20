#!/bin/bash

# ============================================
# Elite Health Guardian - Email Alert System
# ============================================
# Sends formatted email alerts via SMTP
# Created: 2025-11-16
# ============================================

SEVERITY="$1"
TITLE="$2"
MESSAGE="$3"

# Email configuration
TO_EMAIL="mmkela@gmail.com"
FROM_EMAIL="support@pdflab.pro"
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="support@pdflab.pro"
SMTP_PASS="${SMTP_PASSWORD:-}"  # Set via environment variable

# Load credentials if available
if [ -f "/var/pdflab/.env.monitoring" ]; then
    source /var/pdflab/.env.monitoring
fi

# Severity-based subject prefix and color
case "$SEVERITY" in
    CRITICAL)
        SUBJECT_PREFIX="🔴 CRITICAL"
        COLOR="#ff4444"
        ;;
    WARNING)
        SUBJECT_PREFIX="🟡 WARNING"
        COLOR="#ffaa00"
        ;;
    SUCCESS)
        SUBJECT_PREFIX="🟢 SUCCESS"
        COLOR="#00cc66"
        ;;
    INFO)
        SUBJECT_PREFIX="🔵 INFO"
        COLOR="#0099ff"
        ;;
    *)
        SUBJECT_PREFIX="ℹ️  NOTICE"
        COLOR="#999999"
        ;;
esac

SUBJECT="$SUBJECT_PREFIX: $TITLE - PDFLab Production"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')

# HTML Email Template
EMAIL_BODY=$(cat <<EOF
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: $COLOR; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .alert-box { background: #f9f9f9; border-left: 4px solid $COLOR; padding: 15px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; background: $COLOR; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .meta { color: #666; font-size: 14px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>$SUBJECT_PREFIX</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Elite Health Guardian Alert</p>
        </div>

        <div class="content">
            <h2 style="color: #333; margin-top: 0;">$TITLE</h2>

            <div class="alert-box">
                <p style="margin: 0; white-space: pre-wrap;">$MESSAGE</p>
            </div>

            <div class="meta">
                <strong>Timestamp:</strong> $TIMESTAMP<br>
                <strong>Environment:</strong> Production (pdflab.pro)<br>
                <strong>Alert Level:</strong> $SEVERITY
            </div>

            <a href="https://pdflab.pro/admin/monitoring" class="button">View Monitoring Dashboard →</a>
        </div>

        <div class="footer">
            <p>This is an automated alert from PDFLab Elite Health Guardian Agent</p>
            <p>To pause the agent, create file: /var/pdflab/.guardian-paused</p>
            <p>&copy; 2025 PDFLab | <a href="https://pdflab.pro">pdflab.pro</a></p>
        </div>
    </div>
</body>
</html>
EOF
)

# Send email using sendmail (if available) or curl with SMTP
if command -v sendmail &> /dev/null; then
    # Method 1: Using sendmail
    echo "To: $TO_EMAIL
From: PDFLab Health Guardian <$FROM_EMAIL>
Subject: $SUBJECT
Content-Type: text/html; charset=UTF-8

$EMAIL_BODY" | sendmail -t

elif command -v curl &> /dev/null && [ -n "$SMTP_PASS" ]; then
    # Method 2: Using curl with SMTP
    echo "$EMAIL_BODY" | curl --url "smtp://$SMTP_HOST:$SMTP_PORT" \
        --mail-from "$FROM_EMAIL" \
        --mail-rcpt "$TO_EMAIL" \
        --upload-file - \
        --user "$SMTP_USER:$SMTP_PASS" \
        --ssl-reqd \
        -H "Subject: $SUBJECT" \
        -H "Content-Type: text/html; charset=UTF-8"

else
    # Fallback: Log to file
    echo "[$(date)] Email alert (no SMTP configured): $SUBJECT - $MESSAGE" >> /var/pdflab/logs/email-alerts.log
fi

# Log to database
mysql -updflab -p***REMOVED*** pdflab_production -e "
    INSERT INTO monitoring_alerts (id, alert_type, severity, environment, title, message, timestamp)
    VALUES (UUID(), 'system', LOWER('$SEVERITY'), 'prod', '$TITLE', '$MESSAGE', NOW());
" 2>/dev/null

echo "Alert sent: $SUBJECT"
