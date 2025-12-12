# Database Migrations

This folder contains SQL migration scripts for the PDFLab database schema.

## Migration Files

### 001_add_batch_processing.sql
**Date**: 2025-11-09
**Description**: Adds batch processing feature to PDFLab

**Changes**:
1. Creates `batch_jobs` table with full schema
2. Adds `batch_job_id` column to `conversion_jobs` table
3. Creates indexes and foreign key constraints
4. Includes verification queries

**Tables Created**:
- `batch_jobs` - Stores batch processing jobs

**Tables Modified**:
- `conversion_jobs` - Added `batch_job_id` column

### 001_add_batch_processing_rollback.sql
**Description**: Rolls back the batch processing feature migration

**WARNING**: Running this will delete ALL batch processing data!

---

## Running Migrations

### Option 1: Using Shell Script (Recommended)

#### Development Environment:
```bash
cd backend/src/migrations
chmod +x run-migration.sh
./run-migration.sh development 001_add_batch_processing.sql
```

#### Production Environment:
```bash
cd backend/src/migrations
chmod +x run-migration.sh
./run-migration.sh production 001_add_batch_processing.sql
```

**Features**:
- Automatic environment variable loading
- Database backup (production only)
- Confirmation prompt (production only)
- Color-coded output
- Error handling

---

### Option 2: Manual MySQL Command

#### Development:
```bash
mysql -h localhost -P 3306 -u pdflab -p pdflab < 001_add_batch_processing.sql
```

#### Production (VPS):
```bash
# SSH to VPS first
ssh root@141.136.44.168

# Run migration
cd /var/pdflab/backend/src/migrations
mysql -h localhost -P 3306 -u pdflab -p pdflab_production < 001_add_batch_processing.sql
```

---

### Option 3: Docker Exec (If using Docker)

```bash
# Copy migration file to container
docker cp 001_add_batch_processing.sql pdflab-mysql-prod:/tmp/

# Execute migration
docker exec -i pdflab-mysql-prod mysql -u pdflab -p pdflab_production < /tmp/001_add_batch_processing.sql
```

---

## Rollback Instructions

### Development:
```bash
mysql -h localhost -P 3306 -u pdflab -p pdflab < 001_add_batch_processing_rollback.sql
```

### Production:
```bash
# ALWAYS create a backup first!
mysqldump -h localhost -P 3306 -u pdflab -p pdflab_production > backup_before_rollback.sql

# Then run rollback
mysql -h localhost -P 3306 -u pdflab -p pdflab_production < 001_add_batch_processing_rollback.sql
```

---

## Verification

After running the migration, verify it was successful:

```sql
-- Check batch_jobs table exists
SHOW TABLES LIKE 'batch_jobs';

-- Check batch_jobs structure
DESCRIBE batch_jobs;

-- Check conversion_jobs has batch_job_id
DESCRIBE conversion_jobs;

-- Check indexes
SHOW INDEXES FROM batch_jobs;
SHOW INDEXES FROM conversion_jobs WHERE Key_name LIKE '%batch%';

-- Check foreign keys
SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('batch_jobs', 'conversion_jobs')
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## Production Deployment Checklist

Before running migrations in production:

- [ ] Create full database backup
- [ ] Test migration in local/staging environment first
- [ ] Review migration SQL for potential issues
- [ ] Schedule maintenance window if needed
- [ ] Notify team/users of potential downtime
- [ ] Have rollback script ready
- [ ] Monitor application logs after migration

---

## Environment Variables Required

### Development (.env):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=change_me
DB_NAME=pdflab
```

### Production (.env.production):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=pdflab
DB_PASSWORD=change_me
DB_NAME=pdflab_production
```

---

## Migration Naming Convention

Format: `[number]_[descriptive_name].sql`

Examples:
- `001_add_batch_processing.sql`
- `002_add_user_preferences.sql`
- `003_update_payment_schema.sql`

Rollback files: `[number]_[descriptive_name]_rollback.sql`

---

## Troubleshooting

### Migration Fails with "Table already exists"
The migration scripts check for existing tables/columns. If you see this error:
1. Check if the migration was partially run before
2. Manually verify database state
3. Either complete the migration manually or run rollback first

### Foreign Key Constraint Error
If you get foreign key errors:
1. Ensure parent tables exist first
2. Check that referenced columns have matching data types
3. Verify data integrity before adding constraints

### Permission Denied
Ensure the MySQL user has the following privileges:
```sql
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES ON pdflab.* TO 'pdflab'@'%';
FLUSH PRIVILEGES;
```

---

## Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- PDFLab Backend Models: `backend/src/models/`

---

**Last Updated**: 2025-11-09
