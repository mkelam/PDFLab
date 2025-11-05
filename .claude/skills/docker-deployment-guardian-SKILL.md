---
name: docker-deployment-guardian
description: Offensive Docker deployment optimization and pre-flight validation. Triggered when reviewing Dockerfiles, docker-compose.yml, container configurations, or preparing for production deployments. Scans for architecture issues, missing static assets, native module problems, environment misconfigurations, and resource optimization opportunities. Produces auto-scan reports with actionable improvements.
---

# Docker Deployment Guardian

**Mission:** Prevent Docker deployment failures through proactive architecture scanning and optimization. This skill operates in **offensive mode** - seeking opportunities to improve, not just catch errors.

## Activation Triggers

- User mentions Docker setup review
- Code review for deployments
- Pre-production validation
- Performance optimization requests
- Dockerfile or docker-compose.yml analysis

## Scan Methodology

### 1. Initial Context Gathering

**Ask if not provided:**
- "Show me your Dockerfile and docker-compose.yml"
- "What's your application stack?" (Node.js/Python/etc.)
- "Are you using native modules?" (bcrypt, node-gyp, etc.)
- "What static assets need to be served?" (views, templates, public files)

### 2. Critical Architecture Scan

Execute ALL checks in this section. Each is based on real production incidents.

#### 🔴 CRITICAL: Static Asset Copying
**Historical Failure:** Missing views folder caused 100% production outage

**Scan for:**
- [ ] Explicit COPY commands for ALL static directories (views, templates, public, uploads, etc.)
- [ ] Build output verification - does TypeScript/Webpack output get copied?
- [ ] Template engine requirements (EJS, Pug, Handlebars) vs copied files

**Red flags:**
- Only copying `package.json` and `src/` without templates
- Relying on implicit copying from build tools
- No verification step that files exist in container

**Optimization:**
```dockerfile
# ❌ RISKY - May miss templates
COPY src/ /app/src/

# ✅ EXPLICIT - Guarantees presence
COPY src/ /app/src/
COPY views/ /app/views/
COPY public/ /app/public/
RUN ls -la /app/views /app/public  # Verification
```

#### 🔴 CRITICAL: Native Module Build Process
**Historical Failure:** bcrypt native bindings failed in container

**Scan for:**
- [ ] Native modules in package.json (bcrypt, node-gyp, sharp, sqlite3, etc.)
- [ ] Post-install rebuild commands
- [ ] Build tools in base image (python, make, g++)
- [ ] Architecture matching (ARM vs x64)

**Red flags:**
- Native modules without rebuild step
- Missing build dependencies in Dockerfile
- No platform-specific build instructions

**Optimization:**
```dockerfile
# ✅ COMPLETE - Native module handling
FROM node:18-alpine
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
RUN npm rebuild bcrypt --build-from-source
```

#### 🟡 HIGH: Environment Variable Validation
**Historical Failure:** MySQL config mismatch between dev and prod

**Scan for:**
- [ ] All required ENV vars documented
- [ ] Default values provided in Dockerfile or docker-compose
- [ ] Sensitive data handled via secrets/volumes
- [ ] Port consistency across services

**Red flags:**
- Hard-coded database hosts
- Missing ENV validation logic
- Port conflicts (multiple services on 3306, etc.)
- No .env.example file

**Optimization:**
```yaml
# ✅ CLEAR - Explicit env management
services:
  api:
    environment:
      - DATABASE_HOST=${DB_HOST:-mysql}  # Default fallback
      - DATABASE_PORT=${DB_PORT:-3306}
      - NODE_ENV=${NODE_ENV:-production}
    env_file:
      - .env
```

#### 🟡 HIGH: Container Health & Lifecycle
**Historical Failure:** Worker container in restart loop consuming resources

**Scan for:**
- [ ] Health checks defined for all services
- [ ] Restart policies appropriate for service type
- [ ] Startup/readiness probes
- [ ] Graceful shutdown handling

**Red flags:**
- `restart: always` on job/worker containers
- No health checks on web services
- Missing SIGTERM handlers
- Unused containers still defined

**Optimization:**
```yaml
# ✅ ROBUST - Proper lifecycle management
services:
  api:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 🟠 MEDIUM: Resource Allocation
**Historical Finding:** 250MB RAM saved by removing unused worker

**Scan for:**
- [ ] Memory limits defined
- [ ] CPU constraints appropriate
- [ ] Unused services removed
- [ ] Resource monitoring planned

**Red flags:**
- No resource limits (unlimited potential)
- Identical limits for all services (not tuned)
- Development containers in production compose

**Optimization:**
```yaml
# ✅ TUNED - Based on actual usage
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
```

#### 🟢 LOW: Build Optimization
**Not failure-critical but improves performance**

**Scan for:**
- [ ] Multi-stage builds
- [ ] Layer caching strategy
- [ ] .dockerignore configured
- [ ] Minimal base images

**Optimization opportunities:**
- Switch alpine where possible (-70% image size)
- Copy package.json before source (better caching)
- Remove dev dependencies in production stage

### 3. Architecture Review

**Cross-cutting concerns:**

- **Service isolation:** Should worker be separate container?
- **Network segmentation:** Backend services exposed unnecessarily?
- **Secrets management:** Using Docker secrets vs ENV vars?
- **Logging strategy:** stdout/stderr vs volume mounts?
- **Backup procedures:** Volumes documented and backed up?

### 4. Production Readiness Checklist

Generate this checklist in the auto-scan report:

```
PRODUCTION READINESS SCORE: X/10

✅ Static assets explicitly copied
✅ Native modules rebuilt in container
✅ Environment variables validated
✅ Health checks configured
✅ Resource limits defined
⚠️  No monitoring solution specified
⚠️  Backup procedures not documented
❌ Missing: .dockerignore file
❌ Critical: No graceful shutdown handling
❌ Critical: Port conflicts detected

RISK LEVEL: [LOW/MEDIUM/HIGH/CRITICAL]
BLOCKERS: X critical issues must be resolved
RECOMMENDATIONS: Y optimizations suggested
```

## Output Format: Auto-Scan Report

```
═══════════════════════════════════════════════
🛡️  DOCKER DEPLOYMENT GUARDIAN - SCAN RESULTS
═══════════════════════════════════════════════

📊 SCAN SCOPE
• Dockerfile: [filename]
• Compose: [filename]
• Stack: [technology]
• Services: [count]

🚨 CRITICAL FINDINGS: [count]
[List each critical issue with:
 - What's wrong
 - Why it's dangerous (cite historical incident)
 - How to fix (code example)]

⚠️  HIGH PRIORITY: [count]
[Same format as critical]

💡 OPTIMIZATIONS: [count]
[Improvements that enhance but don't block]

═══════════════════════════════════════════════
FINAL VERDICT
═══════════════════════════════════════════════
Production Ready: [YES/NO/BLOCKED]
Risk Level: [LOW/MEDIUM/HIGH/CRITICAL]
Estimated Fix Time: [X hours]

NEXT ACTIONS:
1. [Most critical fix]
2. [Second priority]
3. [Optional optimization]

═══════════════════════════════════════════════
```

## Reference Materials

For detailed error patterns and historical incidents, see:
- `references/error-patterns.md` - Complete incident database with resolutions

## Advanced Scanning

**When to escalate:**
- User says "comprehensive audit"
- Production incident occurred
- Multiple services (>5 containers)
- Complex networking/volumes

**Escalation actions:**
- Read entire docker-compose including networks, volumes
- Scan for security issues (exposed ports, root user, etc.)
- Analyze resource usage patterns
- Review CI/CD integration points

## Key Principles

1. **Offensive mindset:** Don't just find errors, find improvements
2. **Evidence-based:** Every check maps to a real historical incident
3. **Actionable:** Every finding includes code example fix
4. **Honest:** Report actual risk, not theoretical worst-case
5. **Fast:** Complete scan in <2 minutes of LLM time
