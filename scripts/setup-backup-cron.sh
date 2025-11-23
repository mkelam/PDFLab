#!/bin/bash
# Setup daily backup cron job

CRON_SCHEDULE="0 2 * * *"  # 2 AM daily
SCRIPT_PATH="/var/pdflab/scripts/backup-production.sh"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE $SCRIPT_PATH") | crontab -

echo "Backup cron job installed:"
echo "$CRON_SCHEDULE $SCRIPT_PATH"
echo ""
echo "To verify: crontab -l"
echo "To view logs: tail -f /var/pdflab/backups/backup.log"
