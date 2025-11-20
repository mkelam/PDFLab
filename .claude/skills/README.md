# PDFLab Claude Skills Library

This directory contains specialized skill files that provide Claude with deep expertise in specific domains. Each skill file is a markdown document with YAML frontmatter metadata that defines focused capabilities.

## Overview

**Total Skills**: 25
**Format**: `.SKILL.md` with YAML frontmatter
**Last Updated**: 2025-11-19

---

## Skill Categories

### Guardian Skills (Technical Safeguards)
High-priority skills that prevent production incidents and maintain system integrity.

| Skill | Priority | Purpose |
|-------|----------|---------|
| [typescript-build-guardian.SKILL.md](typescript-build-guardian.SKILL.md) | Critical | Monitors TypeScript builds, fixes compilation errors proactively |
| [elite-database-schema-architect.SKILL.md](elite-database-schema-architect.SKILL.md) | Critical | Top 0.1% DB architect for edge cases, migrations, and schema optimization |
| [production-monitoring-guardian.SKILL.md](production-monitoring-guardian.SKILL.md) | High | Real-time production health monitoring and alerting |
| [background-job-guardian.SKILL.md](background-job-guardian.SKILL.md) | High | Bull queue management, job processing, and failure recovery |
| [authentication-authorization-guardian.SKILL.md](authentication-authorization-guardian.SKILL.md) | High | JWT, OAuth, RBAC, and session management |
| [docker-deployment-guardian.SKILL.md](docker-deployment-guardian.SKILL.md) | High | Container orchestration, zero-downtime deployments |
| [database-migration-guardian.SKILL.md](database-migration-guardian.SKILL.md) | High | Safe database migrations with rollback strategies |
| [file-upload-processing-guardian.SKILL.md](file-upload-processing-guardian.SKILL.md) | High | File uploads, storage, and processing pipelines |
| [api-endpoint-guardian.SKILL.md](api-endpoint-guardian.SKILL.md) | High | RESTful API design, validation, error handling |
| [payment-integration-sentinel.SKILL.md](payment-integration-sentinel.SKILL.md) | High | Payment gateway integrations, webhooks, PCI compliance |
| [production-deployment-guardian.SKILL.md](production-deployment-guardian.SKILL.md) | High | Safe production deployments with health checks |
| [environment-configuration-guardian.SKILL.md](environment-configuration-guardian.SKILL.md) | High | Environment variables, secrets management |
| [external-api-integration-guardian.SKILL.md](external-api-integration-guardian.SKILL.md) | High | Third-party API integrations (CloudConvert, etc.) |
| [full-stack-integration-guardian.SKILL.md](full-stack-integration-guardian.SKILL.md) | High | Frontend-backend integration patterns |

---

### Frontend/Design Skills
Specialized skills for UI/UX and frontend architecture.

| Skill | Priority | Purpose |
|-------|----------|---------|
| [react-nextjs-component-guardian.SKILL.md](react-nextjs-component-guardian.SKILL.md) | High | React/Next.js component best practices |
| [motion-performance-expert.SKILL.md](motion-performance-expert.SKILL.md) | Medium | Framer Motion animations, performance optimization |
| [design-system-architect.SKILL.md](design-system-architect.SKILL.md) | Medium | Design system creation and maintenance |
| [ux-product-specialist.SKILL.md](ux-product-specialist.SKILL.md) | Medium | User experience, product design, usability |

---

### Monitoring & Diagnostics Skills
Skills for observability, error tracking, and system health.

| Skill | Priority | Purpose |
|-------|----------|---------|
| [sentry-monitoring-specialist.SKILL.md](sentry-monitoring-specialist.SKILL.md) | High | Expert-level Sentry error tracking and performance monitoring |
| [ELITE_HEALTH_GUARDIAN_AGENT.SKILL.md](ELITE_HEALTH_GUARDIAN_AGENT.SKILL.md) | Critical | Comprehensive system health monitoring and diagnostics |
| [ENVIRONMENT_DRIFT_DETECTION_SPECIALIST_ELITE.SKILL.md](ENVIRONMENT_DRIFT_DETECTION_SPECIALIST_ELITE.SKILL.md) | Critical | Detects configuration drift between staging/production |

---

### Strategy & Business Skills
Go-to-market, growth, and business strategy expertise.

| Skill | Priority | Purpose |
|-------|----------|---------|
| [hormozi-gtm-strategist.SKILL.md](hormozi-gtm-strategist.SKILL.md) | High | Alex Hormozi's $100M Offers/Leads frameworks for GTM |
| [gadzhi-personal-brand-gtm.SKILL.md](gadzhi-personal-brand-gtm.SKILL.md) | High | Iman Gadzhi's personal brand-first GTM for high-ticket B2B |
| [Strategic_Decision_Intelligence.SKILL.md](Strategic_Decision_Intelligence.SKILL.md) | High | Strategic decision-making and business intelligence |

---

### Domain-Specific Skills
Specialized knowledge for specific integrations and platforms.

| Skill | Priority | Purpose |
|-------|----------|---------|
| [payfast-integration.SKILL.md](payfast-integration.SKILL.md) | High | PayFast payment gateway integration (South Africa) |

---

## Skill File Format

All skills follow this standardized format:

```yaml
---
name: skill-name-kebab-case
description: Brief description of skill purpose and expertise
category: guardian|frontend|monitoring|strategy|domain-specific
priority: critical|high|medium|low
version: 1.0.0
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2, tag3]
dependencies: []
---

# Skill Title

Skill content in markdown...
```

### Frontmatter Fields

- **name**: Unique identifier (kebab-case)
- **description**: One-line summary of expertise
- **category**: Organizational grouping
- **priority**: Importance level (critical > high > medium > low)
- **version**: Semantic versioning (1.0.0)
- **created**: Original creation date
- **updated**: Last modification date
- **tags**: Searchable keywords
- **dependencies**: Other skills required (optional)

---

## Using Skills

### Invoking a Skill

Skills are automatically available when working on tasks that match their domain. Claude will proactively use relevant skills based on context.

### Manual Invocation

You can explicitly request a skill:
```
"Use the elite-database-schema-architect skill to review this migration"
"Apply the hormozi-gtm-strategist skill to our pricing strategy"
```

### Skill Combinations

Multiple skills can be used together for complex tasks:
```
"Use typescript-build-guardian + react-nextjs-component-guardian
to refactor the authentication components"
```

---

## Skill Development Guidelines

### Creating a New Skill

1. **Define Scope**: What specific problem does this skill solve?
2. **Create Frontmatter**: Follow the standard YAML format
3. **Write Content**: Structure with clear sections and examples
4. **Add to README**: Update this index with the new skill

### Skill Naming Convention

- **Format**: `kebab-case-name.SKILL.md`
- **Pattern**: `{domain}-{specialty}-{type}.SKILL.md`
- **Examples**:
  - `database-migration-guardian.SKILL.md`
  - `hormozi-gtm-strategist.SKILL.md`
  - `sentry-monitoring-specialist.SKILL.md`

### Skill Quality Checklist

- [ ] YAML frontmatter is complete and valid
- [ ] Description is clear and specific
- [ ] Content is well-structured with headers
- [ ] Examples and code snippets are included
- [ ] Edge cases and best practices are documented
- [ ] Version number follows semantic versioning
- [ ] Tags are relevant and searchable
- [ ] README is updated with new skill entry

---

## Priority Levels

### Critical (🔴)
- Prevents production incidents
- Protects data integrity
- Ensures security compliance
- Required for system stability

### High (🟡)
- Improves reliability significantly
- Enhances performance
- Reduces development friction
- Commonly used across codebase

### Medium (🟢)
- Nice-to-have expertise
- Specialized use cases
- Periodic usage
- Enhancement-focused

### Low (⚪)
- Rare use cases
- Experimental features
- Future considerations

---

## Skill Maintenance

### Regular Reviews
- **Quarterly**: Update skills with new patterns and lessons learned
- **After Incidents**: Document root causes and preventions
- **After Major Features**: Add new best practices

### Deprecation Process
1. Mark skill as deprecated in frontmatter
2. Add migration guide to content
3. Update README with replacement skill
4. Keep file for 6 months before deletion

### Version Updates
- **Patch (1.0.X)**: Minor corrections, typo fixes
- **Minor (1.X.0)**: New sections, expanded examples
- **Major (X.0.0)**: Restructure, paradigm shift, breaking changes

---

## Statistics

### Skills by Category
- **Guardian**: 14 skills (56%)
- **Frontend/Design**: 4 skills (16%)
- **Monitoring**: 3 skills (12%)
- **Strategy**: 3 skills (12%)
- **Domain-Specific**: 1 skill (4%)

### Skills by Priority
- **Critical**: 4 skills (16%)
- **High**: 18 skills (72%)
- **Medium**: 3 skills (12%)
- **Low**: 0 skills (0%)

### Most Recent Skills
1. elite-database-schema-architect.SKILL.md (2025-11-19)
2. sentry-monitoring-specialist.SKILL.md (2025-11-09)
3. hormozi-gtm-strategist.SKILL.md (2025-11-15)
4. gadzhi-personal-brand-gtm.SKILL.md (2025-11-15)

---

## Contributing

To add a new skill or improve existing ones:

1. **Follow the format**: Use YAML frontmatter + markdown body
2. **Update README**: Add skill to appropriate category table
3. **Test skill**: Verify skill is invoked correctly in context
4. **Document changes**: Add to version history in skill file

---

## Resources

- **Skill Documentation**: See individual `.SKILL.md` files
- **Project Context**: See `CLAUDE.md` in project root
- **Architecture Docs**: See `docs/architecture/` folder
- **API Reference**: See `docs/api/API_DOCUMENTATION.md`

---

**Last Updated**: 2025-11-19
**Total Skills**: 25
**Active Guardians**: 14
**Framework Version**: 1.0.0
