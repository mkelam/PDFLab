# 🚀 Quick Start: Elite Health Guardian

**Total Time**: 45 minutes
**Skill Level**: Intermediate
**Prerequisites**: SSH access to VPS (141.136.44.168)

---

## 📋 What You'll Get

After completing this guide, you'll have:

✅ **External Monitoring**
- Sentry error tracking (frontend + backend)
- UptimeRobot monitoring (99.9% uptime alerts)

✅ **Autonomous Agent**
- Elite Health Guardian running every 30 seconds
- Auto-restart unhealthy containers
- Auto-clear Redis cache (>80%)
- Auto-cleanup disk (>85%)
- Auto-optimize database weekly
- Daily backups at 3 AM UTC

✅ **Email Alerts**
- 🔴 CRITICAL: Immediate alerts
- 🟡 WARNING: Within 1 hour
- 🟢 SUCCESS: Confirmations
- 🔵 INFO: Daily reports

---

## Part 1: External Monitoring (15 minutes)

### Sentry Setup (10 min)

**1. Create Account**
```
Visit: https://sentry.io
Sign up with: mmkela@gmail.com
```

**2. Create Projects**
```
Project 1: "PDFLab-Backend" (Node.js/Express)
Project 2: "PDFLab-Frontend" (Next.js)

Copy both DSN keys
```

**3. Configure Production**
```bash
# SSH to VPS
ssh root@141.136.44.168

# Backend
nano /var/www/pdflab/backend/.env
# Uncomment and set:
SENTRY_DSN=https://YOUR_BACKEND_DSN_HERE
# Save: Ctrl+O, Enter, Ctrl+X

# Frontend
nano /var/www/pdflab/.env.local
# Add:
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_FRONTEND_DSN_HERE
# Save

# Restart services
docker restart pdflab-backend-prod
cd /var/www/pdflab && docker-compose -f docker-compose.production.yml up -d --build frontend
```

**4. Test**
```bash
# Trigger test error
curl https://pdflab.pro/api/debug-sentry

# Check Sentry dashboard (should see error within 60 seconds)
```

### UptimeRobot Setup (5 min)

**1. Create Account**
```
Visit: https://uptimerobot.com
Sign up with: mmkela@gmail.com
Free tier: 50 monitors, 5-min intervals
```

**2. Add Monitors**
```
Monitor 1:
  Type: HTTP(s)
  Name: PDFLab Production
  URL: https://pdflab.pro
  Interval: 5 minutes
  Keyword: "PDFLab"

Monitor 2:
  Type: HTTP(s)
  Name: PDFLab API Health
  URL: https://pdflab.pro/health
  Interval: 5 minutes
  Keyword: "OK"
```

**3. Configure Alerts**
```
Email: mmkela@gmail.com
Alert when: Down, Up, Slow (>5s)
Wait: 2 failures (10 min)
```

**4. Test (Optional)**
```bash
# Stop backend
docker stop pdflab-backend-prod

# Wait 10 minutes for alert email

# Restart
docker start pdflab-backend-prod

# Wait for "Up" alert
```

✅ **Part 1 Complete** - You now have external monitoring!

---

## Part 2: Deploy Elite Guardian (20 minutes)

### Automated Deployment

**1. Run Deployment Script**
```bash
# On your local machine (Git Bash or WSL)
cd /c/Users/Mac/OneDrive/Desktop/Projects/PDFLab
chmod +x scripts/deploy-elite-guardian-to-vps.sh
./scripts/deploy-elite-guardian-to-vps.sh
```

**2. When Prompted, Enter:**
```
Email: mmkela@gmail.com
SMTP Host: smtp.hostinger.com
SMTP User: support@pdflab.pro
SMTP Password: [Your Hostinger email password]
```

**3. Wait for Deployment**
```
The script will:
- Upload all scripts to VPS
- Configure email alerts
- Set up cron jobs
- Start monitoring
- Send test email
```

**4. Verify**
```bash
# Check guardian is running
ssh root@141.136.44.168 'tail -20 /var/log/guardian.log'

# Should see:
=== Starting monitoring cycle ===
✓ Frontend: healthy
✓ Backend: healthy
✓ MySQL: healthy
✓ Redis: healthy
=== Monitoring cycle completed ===
```

✅ **Part 2 Complete** - Elite Guardian is now running!

---

## Part 3: Verification (10 minutes)

### Test Auto-Remediation

**1. Test Container Restart**
```bash
ssh root@141.136.44.168

# Stop backend
docker stop pdflab-backend-prod

# Wait 60 seconds - Guardian should detect and restart
# Check logs
tail -f /var/log/guardian.log

# Should see:
# "Container pdflab-backend-prod is unhealthy - initiating restart"
# "Container pdflab-backend-prod restarted successfully"

# Check email for SUCCESS alert
```

**2. Test Disk Cleanup (Optional)**
```bash
# Manual trigger
/var/pdflab/scripts/auto-cleanup-disk.sh

# Check email for completion alert
```

**3. Check Monitoring Dashboard**
```
Visit: https://pdflab.pro/admin/monitoring

Login with admin credentials

You should see:
- Recent health checks
- Active alerts (if any)
- Service management controls
```

✅ **Part 3 Complete** - Verification successful!

---

## What Happens Next?

### Automated Actions (No Manual Intervention)

**Every 30 Seconds**
- Health checks on all containers
- Resource usage monitoring
- Alert detection

**When Issues Detected**
- 🔴 Container unhealthy → Auto-restart
- 🔴 Redis >80% → Auto-clear cache
- 🔴 Disk >85% → Auto-cleanup
- 🟡 Memory high → Alert email

**Daily (3 AM UTC)**
- MySQL backup
- Redis backup
- Uploads backup
- Old backup cleanup

**Daily (4 AM UTC)**
- Database table optimization

**Weekly (Sunday 2 AM UTC)**
- Comprehensive health audit
- Email report with recommendations

### Email Alerts You'll Receive

**🔴 CRITICAL (Immediate)**
- Site down (from UptimeRobot)
- Container restart loop detected
- Backup failed
- Disk >95%

**🟡 WARNING (Within 1 Hour)**
- Container unhealthy (before auto-restart)
- Disk >85%
- Memory >80%
- SSL cert <30 days

**🟢 SUCCESS (Confirmation)**
- Container restarted successfully
- Cache cleared successfully
- Backup completed
- Cleanup completed

**🔵 INFO (Daily)**
- Daily health summary (9 AM UTC)
- Weekly audit report (Sunday)
- Database optimization complete

---

## Troubleshooting

### Guardian Not Running

```bash
# Check cron jobs
crontab -l

# Check logs
tail -f /var/log/guardian.log

# Run manually
/var/pdflab/scripts/elite-health-guardian.sh
```

### No Email Alerts

```bash
# Test email
/var/pdflab/scripts/send-alert-email.sh "TEST" "Test message"

# Check configuration
cat /var/pdflab/.env.monitoring

# Verify SMTP credentials in Hostinger
```

### Sentry Not Capturing Errors

```bash
# Check DSN configured
ssh root@141.136.44.168
grep SENTRY /var/www/pdflab/backend/.env

# Test error
curl https://pdflab.pro/api/debug-sentry

# Check Sentry dashboard
```

---

## Quick Reference

### Important Commands

```bash
# SSH to VPS
ssh root@141.136.44.168

# View guardian logs
tail -f /var/log/guardian.log

# View backup logs
tail -f /var/log/backup.log

# Manual backup
/var/pdflab/scripts/auto-backup.sh

# Manual health check
/var/pdflab/scripts/elite-health-guardian.sh

# Restart container manually
docker restart pdflab-backend-prod

# Check all containers
docker ps
```

### Important URLs

- **Monitoring Dashboard**: https://pdflab.pro/admin/monitoring
- **System Health**: https://pdflab.pro/admin/system
- **Sentry**: https://sentry.io
- **UptimeRobot**: https://uptimerobot.com

### Support Contacts

- **Email**: mmkela@gmail.com
- **Logs**: `/var/log/guardian.log`
- **Config**: `/var/pdflab/.env.monitoring`

---

## Success Metrics (After 7 Days)

Check these after 1 week of operation:

```bash
# SSH to VPS
ssh root@141.136.44.168

# Auto-remediations count
grep "SUCCESS" /var/log/auto-remediation.log | wc -l

# Backups count
ls -1 /var/pdflab/backups/mysql_*.sql.gz | wc -l

# Containers restarted
grep "restarted successfully" /var/log/guardian.log | wc -l

# Alerts sent
grep "ALERT" /var/log/guardian.log | wc -l
```

**Expected Results:**
- ✅ Uptime: >99.9%
- ✅ Auto-remediations: 5-20
- ✅ Successful backups: 7
- ✅ Manual interventions: 0-2
- ✅ Mean time to recovery: <5 min

---

## Next Steps

After successful deployment:

1. **Monitor for 7 days** - Let the system learn normal patterns
2. **Adjust thresholds** - Fine-tune based on your traffic
3. **Add SSL monitoring** - Auto-renew Let's Encrypt certs
4. **Add security scanning** - Trivy for container vulnerabilities
5. **Implement predictive maintenance** - ML-based anomaly detection

---

**🎉 Congratulations!**

You now have enterprise-grade autonomous monitoring protecting PDFLab 24/7!

**Questions?** Check the full guide: `ELITE_GUARDIAN_DEPLOYMENT_GUIDE.md`
