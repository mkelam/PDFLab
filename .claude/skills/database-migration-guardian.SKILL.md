---
name: database-migration-guardian
description: Prevents database migration failures in Sequelize/MySQL environments. Use when adding new models, modifying schemas, creating indexes, or deploying database changes. Catches foreign key errors, index conflicts, zero-downtime migration issues, data loss risks, and rollback problems. Validates migration scripts, suggests optimization, and ensures production safety.
---

# Database Migration Guardian

**Mission:** Prevent database migration disasters through proactive schema validation and zero-downtime deployment patterns. Catches breaking changes before they reach production.

## Activation Triggers

- Adding new Sequelize models
- Modifying existing model schemas
- Creating database indexes
- Foreign key relationship changes
- Production database updates
- "Migration failed" errors
- Performance optimization needs
- Data integrity issues

## Framework Awareness

This skill understands:
- **Sequelize ORM** - Model definitions, migrations, sync patterns
- **MySQL 8.0** - Constraints, indexes, storage engines
- **Production Databases** - Zero-downtime migrations, rollback strategies
- **Docker** - Database container management, volume persistence

## Scan Methodology

### 1. Initial Context Gathering

**Ask if not provided:**
- "Show me your new/modified model file"
- "Show me existing migrations (if any)"
- "What's your deployment strategy?" (docker-compose, manual, CI/CD)
- "Is this for development or production?"
- "Do you have existing data in this table?"

### 2. Critical Migration Scan

Execute ALL checks in this section.

#### 🔴 CRITICAL: Model Definition Validation

**Historical Failure:** Missing foreign key caused cascading delete of all user data

**Scan for:**
- [ ] Foreign keys have proper `onDelete` and `onUpdate` rules
- [ ] Required fields (`allowNull: false`) have defaults or are optional in creation
- [ ] Unique constraints on appropriate fields
- [ ] Indexes defined for foreign keys and frequently queried fields
- [ ] Data types match MySQL capabilities (BIGINT for large numbers, JSON for objects)
- [ ] Enums match across model and migration files
- [ ] Associations defined in both directions (hasMany/belongsTo)

**Red flags:**
```typescript
// ❌ DANGEROUS - No cascade rule
user_id: {
  type: DataTypes.UUID,
  references: {
    model: 'users',
    key: 'id'
  }
  // Missing: onDelete: 'CASCADE' or 'SET NULL'
}

// ❌ DANGEROUS - Required field without default
email: {
  type: DataTypes.STRING,
  allowNull: false
  // Missing: defaultValue or Optional<> in creation interface
}

// ❌ DANGEROUS - No index on foreign key
user_id: {
  type: DataTypes.UUID,
  references: { model: 'users', key: 'id' }
}
// Missing: index definition
```

**Optimization:**
```typescript
// ✅ SAFE - Proper foreign key with cascade
user_id: {
  type: DataTypes.UUID,
  allowNull: false,
  references: {
    model: 'users',
    key: 'id'
  },
  onDelete: 'CASCADE',  // Delete jobs when user deleted
  onUpdate: 'CASCADE'   // Update if user ID changes
}

// ✅ SAFE - Optional in creation, required in schema
interface ModelCreationAttributes
  extends Optional<ModelAttributes, 'id' | 'created_at'> {}

// ✅ SAFE - Index on foreign key
{
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
}
```

#### 🔴 CRITICAL: Migration Script Safety

**Historical Failure:** Migration ran successfully but forgot to copy data, losing all records

**Scan for:**
- [ ] Migration uses QueryInterface properly (not sequelize.sync())
- [ ] All columns from model are in migration CREATE TABLE
- [ ] Indexes created in migration match model definition
- [ ] Foreign keys in migration match model references
- [ ] Enum values match exactly between model and migration
- [ ] `down()` migration exists for rollback
- [ ] Data migration strategy for existing rows (if modifying table)

**Red flags:**
```typescript
// ❌ DANGEROUS - Using sync() instead of migrations
await sequelize.sync({ force: true })  // DELETES ALL DATA!

// ❌ DANGEROUS - Missing columns
await queryInterface.createTable('batch_jobs', {
  id: DataTypes.UUID,
  user_id: DataTypes.UUID
  // Missing: all other columns from model
})

// ❌ DANGEROUS - No rollback
export async function down(queryInterface: QueryInterface) {
  // Empty or missing - can't undo migration
}
```

**Optimization:**
```typescript
// ✅ SAFE - Complete migration
export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('batch_jobs', {
    id: { type: DataTypes.UUID, primaryKey: true },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    // ... ALL columns from model ...
  })

  // Add indexes
  await queryInterface.addIndex('batch_jobs', ['user_id'])
  await queryInterface.addIndex('batch_jobs', ['status'])
}

// ✅ SAFE - Rollback defined
export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('batch_jobs')
}
```

#### 🟡 HIGH: Zero-Downtime Migration Patterns

**Historical Issue:** Adding NOT NULL column without default locked production table for 5 minutes

**Scan for:**
- [ ] Adding required columns uses multi-step migration
- [ ] Indexes created with `ALGORITHM=INPLACE` where possible
- [ ] Large data migrations happen in batches
- [ ] Backward-compatible changes (new code works with old schema)

**Migration Patterns:**

**Adding Required Column (Multi-Step):**
```typescript
// Migration 1: Add column as nullable with default
await queryInterface.addColumn('users', 'new_field', {
  type: DataTypes.STRING,
  allowNull: true,  // Start as optional
  defaultValue: 'default_value'
})

// Deploy new code that handles both null and populated values

// Migration 2: Backfill data
await queryInterface.sequelize.query(
  'UPDATE users SET new_field = "value" WHERE new_field IS NULL'
)

// Migration 3: Make NOT NULL
await queryInterface.changeColumn('users', 'new_field', {
  type: DataTypes.STRING,
  allowNull: false
})
```

**Removing Column (Multi-Step):**
```typescript
// Step 1: Deploy code that stops using column
// Step 2: Run migration to drop column
await queryInterface.removeColumn('users', 'old_field')
// Column already unused, no downtime
```

**Renaming Column (Zero-Downtime):**
```typescript
// DON'T rename - it breaks old code
// Instead: Add new column → Dual write → Remove old column

// Migration 1: Add new column
await queryInterface.addColumn('users', 'new_name', {
  type: DataTypes.STRING,
  allowNull: true
})

// Update code to write to both columns
user.old_name = value
user.new_name = value

// Migration 2: Backfill
await queryInterface.sequelize.query(
  'UPDATE users SET new_name = old_name WHERE new_name IS NULL'
)

// Migration 3: Stop using old_name in code

// Migration 4: Drop old column
await queryInterface.removeColumn('users', 'old_name')
```

#### 🟡 HIGH: Index Optimization

**Historical Issue:** Missing index on foreign key caused 10s query times

**Scan for:**
- [ ] All foreign keys have indexes
- [ ] Frequently queried columns have indexes
- [ ] Composite indexes for multi-column queries
- [ ] No redundant indexes (e.g., index on `user_id` AND `(user_id, status)`)
- [ ] Index cardinality appropriate (high cardinality = good for indexing)

**Index Strategy:**
```typescript
// Query: Get user's conversion jobs ordered by date
// SELECT * FROM conversion_jobs WHERE user_id = ? ORDER BY created_at DESC

// ❌ NO INDEX - Full table scan
indexes: []

// ❌ PARTIAL - Index on user_id only
indexes: [{ fields: ['user_id'] }]
// MySQL still needs to sort by created_at

// ✅ OPTIMAL - Composite index
indexes: [
  { fields: ['user_id', 'created_at'] }
  // MySQL can use index for WHERE and ORDER BY
]

// Query: Get jobs by status
// SELECT * FROM conversion_jobs WHERE status = 'completed'

// ❌ POOR - Low cardinality (only 5 statuses)
indexes: [{ fields: ['status'] }]
// Better to filter in application layer

// ✅ BETTER - Composite with high cardinality
indexes: [
  { fields: ['status', 'created_at'] }
  // Useful if you filter by status AND sort by date
]
```

#### 🟠 MEDIUM: Data Integrity

**Scan for:**
- [ ] Timestamps enabled (`timestamps: true`)
- [ ] Soft deletes if needed (`paranoid: true`)
- [ ] Unique constraints on email, username, etc.
- [ ] Check constraints for valid values
- [ ] JSON validation for JSON fields
- [ ] Cascade deletes configured correctly

**Data Integrity Patterns:**
```typescript
// ✅ Email uniqueness
email: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  validate: {
    isEmail: true
  }
}

// ✅ Enum validation
status: {
  type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
  allowNull: false,
  defaultValue: 'pending'
}

// ✅ Soft deletes (paranoid)
{
  timestamps: true,
  paranoid: true  // Adds deletedAt, doesn't actually delete
}

// ✅ Check constraint (MySQL 8.0+)
progress: {
  type: DataTypes.INTEGER,
  allowNull: false,
  validate: {
    min: 0,
    max: 100
  }
}
```

### 3. Sequelize.sync() vs Migrations Decision

**Ask user:** "Are you using `sequelize.sync()` or migration files?"

**Sequelize.sync() - Development Only:**
```typescript
// ✅ OK for development
await sequelize.sync({ force: false, alter: false })
// Creates tables if they don't exist

// ❌ NEVER in production
await sequelize.sync({ force: true })  // DELETES ALL DATA
await sequelize.sync({ alter: true })  // RISKY - can lose data
```

**Migrations - Production:**
```typescript
// ✅ Production-safe
// Run migration files in order
// 001-create-users.ts
// 002-create-conversion-jobs.ts
// 003-create-subscriptions.ts
// 004-create-payment-logs.ts
// 005-create-batch-jobs.ts

// Each migration is version-controlled and rollback-safe
```

**Recommendation:**
- Development: `sequelize.sync()` is fine for rapid iteration
- Production: ALWAYS use migration files
- Transition: Write migrations for existing sync'd tables

### 4. Production Pre-Flight Checklist

Before deploying database changes:

**Pre-Migration:**
- [ ] Backup database (`mysqldump` or snapshot)
- [ ] Test migration on production data copy
- [ ] Verify rollback (`down()`) migration works
- [ ] Check migration locks table during execution
- [ ] Estimate migration time (run on staging with prod data volume)
- [ ] Plan maintenance window if needed (or use zero-downtime pattern)

**During Migration:**
- [ ] Monitor database connections (`SHOW PROCESSLIST`)
- [ ] Watch for lock waits (`SELECT * FROM information_schema.innodb_locks`)
- [ ] Have rollback plan ready
- [ ] Monitor application errors

**Post-Migration:**
- [ ] Verify row counts (`SELECT COUNT(*) FROM new_table`)
- [ ] Check foreign key relationships (`SELECT * FROM table WHERE user_id NOT IN (SELECT id FROM users)`)
- [ ] Run EXPLAIN on critical queries to verify index usage
- [ ] Monitor slow query log

### 5. Common Migration Errors & Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| `ER_DUP_FIELDNAME` | Column already exists | Check if migration ran before, use `IF NOT EXISTS` |
| `ER_BAD_NULL_ERROR` | Required field has null values | Backfill data before adding NOT NULL constraint |
| `ER_ROW_IS_REFERENCED` | Foreign key constraint violation | Can't delete parent row with child rows, use CASCADE |
| `ER_NO_REFERENCED_ROW` | Foreign key points to non-existent row | Data integrity issue, clean up orphaned records first |
| `ER_DUP_ENTRY` | Unique constraint violation | Remove duplicates before adding UNIQUE constraint |
| `Lock wait timeout exceeded` | Table locked during migration | Use smaller batches, add indexes offline |

### 6. Migration Testing Strategy

**Local Testing:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Run migrations
cd backend
npx tsx src/scripts/run-migration.ts

# Verify tables created
mysql -u pdflab -p pdflab -e "SHOW TABLES"
mysql -u pdflab -p pdflab -e "DESCRIBE batch_jobs"
```

**Staging Testing:**
```bash
# Copy production data to staging
mysqldump --single-transaction production > prod_copy.sql
mysql staging < prod_copy.sql

# Run migration on staging
node run-migration.js

# Test application works with new schema
npm test
```

**Production Rollout:**
```bash
# Backup first
mysqldump --single-transaction pdflab > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
node run-migration.js

# Verify
mysql -e "SELECT COUNT(*) FROM batch_jobs"

# Monitor
tail -f /var/log/mysql/slow-query.log
```

## Output Format: Auto-Scan Report

```
═══════════════════════════════════════════════
🛡️ DATABASE MIGRATION GUARDIAN - SCAN RESULTS
═══════════════════════════════════════════════

📊 SCAN SCOPE
• Model: BatchJob
• Table: batch_jobs
• Migration: 005-create-batch-jobs.ts
• Strategy: Sequelize.sync() (development)

🚨 CRITICAL FINDINGS: 0
✅ No critical issues detected

⚠️  HIGH PRIORITY: 2
1. Missing index on frequently queried field
   • Field: status
   • Impact: Slow queries when filtering by status
   • Fix: Add index: { fields: ['status'] }

2. Foreign key without cascade rule
   • Field: user_id
   • Impact: Can't delete users with batch jobs
   • Fix: Add onDelete: 'CASCADE'

💡 OPTIMIZATIONS: 3
1. Composite index opportunity
   • Query: Get user's batches ordered by date
   • Current: Index on user_id only
   • Optimized: { fields: ['user_id', 'created_at'] }
   • Benefit: 10x faster queries

2. JSON field validation
   • Field: options
   • Current: No validation
   • Recommended: Add Joi/Zod schema validation

3. Soft deletes consideration
   • Current: Hard delete
   • Recommended: Add paranoid: true for audit trail

═══════════════════════════════════════════════
PRODUCTION READINESS
═══════════════════════════════════════════════
✅ Migration script complete
✅ Rollback defined
⚠️  Zero-downtime pattern needed for ALTER operations
✅ Indexes defined
⚠️  Test on production data copy recommended

RISK LEVEL: LOW
DEPLOYMENT RECOMMENDATION: Safe to deploy after addressing 2 high-priority issues

NEXT ACTIONS:
1. Add cascade rule to user_id foreign key
2. Add index on status field
3. Test migration on production data copy
4. Add composite index for performance

═══════════════════════════════════════════════
```

## Quick Reference: Migration Commands

```bash
# Sequelize CLI (if using)
npx sequelize-cli migration:generate --name create-batch-jobs
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo

# Custom migration (PDFLab pattern)
npx tsx src/scripts/run-migration.ts

# MySQL verification
mysql -u pdflab -p pdflab -e "SHOW CREATE TABLE batch_jobs"
mysql -u pdflab -p pdflab -e "SHOW INDEX FROM batch_jobs"

# Check foreign keys
mysql -u pdflab -p pdflab -e "
  SELECT
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE REFERENCED_TABLE_NAME = 'users'
"
```

## Key Principles

1. **Always use migrations in production** - Never sync({ alter: true })
2. **Foreign keys need cascade rules** - Prevent orphaned records
3. **Index foreign keys** - Prevent slow joins
4. **Test with production data** - Catch constraint violations early
5. **Zero-downtime migrations** - Multi-step for breaking changes
6. **Rollback plan** - Every up() needs a down()
7. **Backup first** - Murphy's law applies to databases

## When to Escalate

- Adding columns to tables with >1M rows
- Changing primary keys or foreign keys
- Renaming tables in production
- Complex data migrations requiring ETL
- Geo-distributed database changes
- Changing storage engines or collation
