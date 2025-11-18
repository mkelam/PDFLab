# 🤖 Elite Health Guardian Agent - Deployment Guide

**Agent**: Level 5 Autonomous Health Management System
**Created**: 2025-11-16
**Owner**: mmkela@gmail.com
**Status**: Ready for Deployment

---

## 📋 Quick Overview

The **Elite Health Guardian Agent** is your 24/7 autonomous infrastructure manager that:

✅ Monitors all PDFLab components (Frontend, Backend, Database, Redis, Workers, Storage, SSL)
✅ Auto-restarts unhealthy containers
✅ Clears caches when memory is high
✅ Cleans up disk space automatically
✅ Optimizes database weekly
✅ Rolls back bad deployments
✅ Sends email alerts to mmkela@gmail.com
✅ Operates with Level 5 intelligence (predictive maintenance)
✅ Consults you only for resource scaling decisions

---

## 🚀 Installation (15 minutes)

### Prerequisites

✅ VPS access: 141.136.44.168
✅ Monitoring database tables created
✅ SMTP email configured (support@pdflab.pro)
✅ Docker containers running with healthchecks

### Step 1: Upload Scripts to VPS

```bash
# From your local machine
cd c:\Users\Mac\OneDrive\Desktop\Projects\PDFLab

# Upload main agent script
scp scripts/elite-health-guardian.sh root@141.136.44.168:/var/pdflab/scripts/

# Upload email alerting script
scp scripts/send-alert-email.sh root@141.136.44.168:/var/pdflab/scripts/
```

### Step 2: SSH into VPS and Configure

```bash
ssh root@141.136.44.168

# Create logs directory
mkdir -p /var/pdflab/logs
mkdir -p /var/pdflab/storage/temp
mkdir -p /var/pdflab/storage/outputs

# Make scripts executable
chmod +x /var/pdflab/scripts/elite-health-guardian.sh
chmod +x /var/pdflab/scripts/send-alert-email.sh

# Create monitoring configuration
cat > /var/pdflab/.env.monitoring << 'EOF'
# Elite Health Guardian Configuration
ALERT_EMAIL=mmkela@gmail.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=support@pdflab.pro
SMTP_PASSWORD=YOUR_SMTP_PASSWORD_HERE
FROM_EMAIL=support@pdflab.pro
EOF

# Secure the config file
chmod 600 /var/pdflab/.env.monitoring
```

### Step 3: Install bc (for math calculations)

```bash
apt-get update && apt-get install -y bc
```

### Step 4: Test Email Alerts

```bash
# Send test email
bash /var/pdflab/scripts/send-alert-email.sh "INFO" "Agent Test" "Elite Health Guardian installed successfully!"

# Check if email was received at mmkela@gmail.com
```

### Step 5: Test Health Checks

```bash
# Run agent manually once
bash /var/pdflab/scripts/elite-health-guardian.sh

# Check logs
tail -f /var/pdflab/logs/health-guardian.log

# Should see output like:
# [2025-11-16 14:00:00] 🤖 Elite Health Guardian - Running health checks
# [2025-11-16 14:00:01] ✅ Health check cycle complete
```

### Step 6: Set Up Automated Cron Jobs

```bash
# Edit crontab
crontab -e

# Add these lines:

# Elite Health Guardian - Runs every 30 seconds
* * * * * /var/pdflab/scripts/elite-health-guardian.sh
* * * * * sleep 30; /var/pdflab/scripts/elite-health-guardian.sh

# Daily backup at 3 AM UTC
0 3 * * * /var/pdflab/scripts/auto-backup.sh

# Weekly database optimization (Sunday 2 AM)
0 2 * * 0 /var/pdflab/scripts/auto-optimize-database.sh

# Weekly health report (Monday 9 AM)
0 9 * * 1 /var/pdflab/scripts/weekly-health-report.sh

# Save and exit (:wq in vim, Ctrl+X in nano)
```

### Step 7: Verify Cron Jobs

```bash
# List cron jobs
crontab -l

# Check cron is running
systemctl status cron

# Wait 30 seconds and check logs
sleep 30 && tail /var/pdflab/logs/health-guardian.log
```

---

## ✅ Verification Checklist

After installation, verify these items:

### Immediate Tests (First 5 minutes)

- [ ] Agent script runs without errors
- [ ] Log file created: `/var/pdflab/logs/health-guardian.log`
- [ ] Test email received at mmkela@gmail.com
- [ ] Cron jobs listed in `crontab -l`
- [ ] Database monitoring tables populated

```bash
# Check database has new health checks
docker exec 57d5d601930a_pdflab-mysql-prod mysql -updflab -p***REMOVED*** pdflab_production -e "SELECT * FROM health_checks ORDER BY timestamp DESC LIMIT 5;"
```

### Container Health Test (10 minutes)

- [ ] Stop a container and verify auto-restart:

```bash
# Stop backend container
docker stop pdflab-backend-prod

# Wait 2-3 minutes
sleep 180

# Check if agent restarted it
docker ps | grep pdflab-backend-prod

# Check email - you should receive:
# "🟢 SUCCESS: pdflab-backend-prod Auto-Restart Successful"
```

### Disk Cleanup Test

- [ ] Create temp files and verify cleanup:

```bash
# Create old temp files
touch -d "8 days ago" /var/pdflab/storage/temp/old-file-1.txt
touch -d "8 days ago" /var/pdflab/storage/temp/old-file-2.txt

# Run agent
bash /var/pdflab/scripts/elite-health-guardian.sh

# Verify files deleted
ls /var/pdflab/storage/temp/
```

### Email Alert Levels Test

- [ ] Test all severity levels:

```bash
# Test CRITICAL alert
bash /var/pdflab/scripts/send-alert-email.sh "CRITICAL" "Test Critical Alert" "This is a critical test"

# Test WARNING alert
bash /var/pdflab/scripts/send-alert-email.sh "WARNING" "Test Warning Alert" "This is a warning test"

# Test SUCCESS alert
bash /var/pdflab/scripts/send-alert-email.sh "SUCCESS" "Test Success Alert" "This is a success test"

# Test INFO alert
bash /var/pdflab/scripts/send-alert-email.sh "INFO" "Test Info Alert" "This is an info test"

# Check inbox - should receive 4 emails with different colors
```

---

## 📧 What Emails to Expect

### Initial Deployment
- ✅ **Test Alert**: "Agent Test - Elite Health Guardian installed successfully!"

### Daily Operations
- 🔵 **Daily Summary** (9 AM UTC): Health report with metrics
- 🟢 **Success Alerts**: Auto-remediations completed
- 🟡 **Warning Alerts**: High memory, disk space issues
- 🔴 **Critical Alerts**: Database down, containers unhealthy

### Example Email Subjects:
```
🔴 CRITICAL: MySQL Database DOWN - PDFLab Production
🟡 WARNING: Backend High Memory Usage - PDFLab Production
🟢 SUCCESS: pdflab-backend-prod Auto-Restart Successful - PDFLab Production
🔵 INFO: PDFLab Daily Health Report - PDFLab Production
```

---

## 🎛️ Agent Management

### Check Agent Status

```bash
# Check if running
ps aux | grep elite-health-guardian

# Check recent activity
tail -50 /var/pdflab/logs/health-guardian.log

# Check monitoring dashboard
curl -s https://pdflab.pro/api/monitoring/dashboard | jq .
```

### Pause Agent (Emergency)

```bash
# Pause all auto-remediation
touch /var/pdflab/.guardian-paused

# Agent will stop all actions but continue logging

# Resume agent
rm /var/pdflab/.guardian-paused
```

### View Logs

```bash
# Real-time monitoring
tail -f /var/pdflab/logs/health-guardian.log

# Last 100 lines
tail -100 /var/pdflab/logs/health-guardian.log

# Search for errors
grep "ERROR\|CRITICAL" /var/pdflab/logs/health-guardian.log

# Search for auto-restarts
grep "Auto-restarting" /var/pdflab/logs/health-guardian.log
```

### Manual Triggers

```bash
# Run health check manually
bash /var/pdflab/scripts/elite-health-guardian.sh

# Force disk cleanup
bash /var/pdflab/scripts/elite-health-guardian.sh --cleanup-disk

# Force database optimization
bash /var/pdflab/scripts/elite-health-guardian.sh --optimize-db
```

---

## 📊 Monitoring Dashboard Integration

### View Agent Activity

Visit: **https://pdflab.pro/admin/monitoring**

**You'll see:**
- Real-time health status
- Auto-remediation history
- Alert log
- Performance metrics
- Drift detection results

### Database Queries

```sql
-- Recent health checks
SELECT * FROM health_checks
ORDER BY timestamp DESC
LIMIT 10;

-- Recent alerts sent
SELECT * FROM monitoring_alerts
ORDER BY timestamp DESC
LIMIT 10;

-- Auto-remediation success rate (last 7 days)
SELECT
    COUNT(*) as total_alerts,
    SUM(CASE WHEN severity = 'success' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
FROM monitoring_alerts
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

---

## 🔧 Troubleshooting

### Agent Not Running

**Problem**: No logs being generated

**Solution**:
```bash
# Check cron is running
systemctl status cron

# Check crontab
crontab -l

# Run manually to see errors
bash -x /var/pdflab/scripts/elite-health-guardian.sh
```

### Emails Not Sending

**Problem**: No email alerts received

**Solution**:
```bash
# Check SMTP configuration
cat /var/pdflab/.env.monitoring

# Test email directly
bash /var/pdflab/scripts/send-alert-email.sh "INFO" "Test" "Testing email"

# Check email logs
tail /var/pdflab/logs/email-alerts.log

# Verify SMTP password is correct
# Update in /var/pdflab/.env.monitoring
```

### Container Not Restarting

**Problem**: Agent detects unhealthy but doesn't restart

**Solution**:
```bash
# Check agent has Docker permissions
docker ps

# Check logs for errors
grep "Failed to restart" /var/pdflab/logs/health-guardian.log

# Manually restart to test
docker restart pdflab-backend-prod
```

### High False Alert Rate

**Problem**: Too many alerts for non-issues

**Solution**:
```bash
# Adjust thresholds in elite-health-guardian.sh

# For memory warnings, increase from 80% to 85%:
# Change: if (( $(echo "$memory > 80" | bc -l) ))
# To:     if (( $(echo "$memory > 85" | bc -l) ))

# For disk space, increase from 85% to 90%:
# Change: elif [ $usage -gt 85 ]
# To:     elif [ $usage -gt 90 ]
```

---

## 🎯 Performance Metrics

### Target KPIs (After 30 Days)

| Metric | Target | How to Check |
|--------|--------|--------------|
| Uptime | 99.9% | Monitoring dashboard |
| Auto-remediation Success | >95% | Database query |
| Mean Time to Recovery | <5 min | Alert timestamps |
| False Alert Rate | <5% | Email review |
| Disk Space Saved | >10 GB | df -h comparison |

### Monthly Report

```bash
# Generate monthly stats
mysql -updflab -p***REMOVED*** pdflab_production << 'EOF'
SELECT
    DATE_FORMAT(timestamp, '%Y-%m') as month,
    COUNT(*) as total_alerts,
    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_alerts,
    SUM(CASE WHEN severity = 'success' THEN 1 ELSE 0 END) as successful_remediations,
    ROUND(SUM(CASE WHEN severity = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as success_rate
FROM monitoring_alerts
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
GROUP BY DATE_FORMAT(timestamp, '%Y-%m')
ORDER BY month DESC;
EOF
```

---

## 🔐 Security Best Practices

### Protect Configuration

```bash
# Ensure .env.monitoring is secured
chmod 600 /var/pdflab/.env.monitoring
chown root:root /var/pdflab/.env.monitoring

# Never commit passwords to git
echo "/var/pdflab/.env.monitoring" >> /var/pdflab/.gitignore
```

### Audit Logging

```bash
# All agent actions are logged to database
# Review audit trail
SELECT * FROM monitoring_alerts
WHERE alert_type = 'system'
ORDER BY timestamp DESC
LIMIT 50;
```

### Rate Limiting

The agent has built-in safeguards:
- Max 5 container restarts per hour
- 5-minute cooldown between same actions
- Rollback protection (max 3 per hour)

---

## 📞 Support & Escalation

### Contact Information
- **Email**: mmkela@gmail.com
- **Alert Frequency**: Real-time for CRITICAL, Daily digest for INFO
- **Response Time**: Within 24 hours for escalations

### Emergency Procedures

**If agent misbehaves:**
```bash
# 1. Pause immediately
touch /var/pdflab/.guardian-paused

# 2. Check what happened
tail -200 /var/pdflab/logs/health-guardian.log

# 3. Email yourself the issue
bash /var/pdflab/scripts/send-alert-email.sh "CRITICAL" "Agent Paused" "Paused due to: [reason]"

# 4. Fix and resume
rm /var/pdflab/.guardian-paused
```

---

## 🚀 Next Steps After Deployment

### Week 1: Monitor and Tune
- Review daily email reports
- Check false alert rate
- Adjust thresholds if needed
- Verify auto-remediations work

### Week 2: Optimize
- Analyze most common alerts
- Fine-tune memory thresholds
- Optimize database queries
- Review disk cleanup effectiveness

### Month 1: Expand
- Add predictive analytics
- Implement cost tracking
- Create custom playbooks
- Set up Slack integration (optional)

---

## 📄 Files Created

**Core Scripts:**
- `.claude/skills/ELITE_HEALTH_GUARDIAN_AGENT.SKILL.md` - Agent specification
- `scripts/elite-health-guardian.sh` - Main agent script
- `scripts/send-alert-email.sh` - Email alerting system

**Configuration:**
- `/var/pdflab/.env.monitoring` - Agent configuration (on VPS)
- `/var/pdflab/.guardian-paused` - Pause file (create to pause)

**Logs:**
- `/var/pdflab/logs/health-guardian.log` - Agent activity log
- `/var/pdflab/logs/email-alerts.log` - Email delivery log

---

## ✅ Deployment Checklist

- [ ] Scripts uploaded to VPS
- [ ] Scripts made executable
- [ ] Configuration file created with SMTP password
- [ ] `bc` package installed
- [ ] Test email sent and received
- [ ] Cron jobs configured
- [ ] Agent running successfully
- [ ] Container restart test passed
- [ ] Monitoring dashboard showing data
- [ ] Email alerts working for all severity levels

---

**Agent Status**: 🟢 READY FOR DEPLOYMENT
**Estimated Setup Time**: 15 minutes
**Maintenance Required**: None (fully autonomous)
**Support**: mmkela@gmail.com

🤖 **Deploy the Elite Health Guardian and sleep peacefully knowing your infrastructure is protected 24/7!**
