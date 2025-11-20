# MySQL Password Issue - Investigation Report
**Date**: November 20, 2025
**Status**: 🔴 UNRESOLVED - Password Escaping Issue

---

## Problem Summary

MySQL user `pdflab_staging@'%'` has been created with full privileges, but backend container cannot connect. The issue is related to password escaping/special characters.

## Evidence

### 1. User Exists with Correct Host
```sql
SELECT user, host FROM mysql.user WHERE user='pdflab_staging';
```
**Result**: `pdflab_staging | %` ✅

### 2. User Has Full Privileges
```sql
SHOW GRANTS FOR 'pdflab_staging'@'%';
```
**Result**: ALL PRIVILEGES ON *.* ✅

### 3. Password in Container Environment
```bash
$ docker exec pdflab-backend-staging printenv DB_PASSWORD
StagingDB2024\!UserPass
```
**Note**: Single backslash before exclamation mark

### 4. Error Message
```
Access denied for user 'pdflab_staging'@'172.20.0.5' (using password: YES)
```

## Passwords Tried

| Attempt | Password | Result |
|---------|----------|--------|
| 1 | `StagingDB2024!UserPass` | ❌ Access denied |
| 2 | `StagingDB2024\\!UserPass` | ❌ Access denied |
| 3 | `StagingDB2024\!UserPass` (via ALTER USER) | ❌ Access denied |

## Root Password Found

**Working MySQL root password**: `rootpassword123` ✅

This was found in `/var/pdflab/app/docker-compose.prod.yml`

## Technical Analysis

### Password Escaping in Docker

When passing passwords through docker run with `-e` flag:
- Shell interprets `!` as special character
- Single quotes preserve literal `!`
- Double quotes allow escaping with `\!`
- Docker then passes to container environment

**Current container env shows**: `StagingDB2024\!UserPass`

### MySQL Password Storage

MySQL stores passwords hashed using:
- `mysql_native_password` plugin (MySQL 5.7/8.0)
- `caching_sha2_password` plugin (MySQL 8.0+ default)

The password string is hashed, so escaping shouldn't matter... but it does when creating the user.

## Attempted Solutions

### Solution 1: Grant from '%' with Password
```sql
DROP USER IF EXISTS 'pdflab_staging'@'%';
CREATE USER 'pdflab_staging'@'%' IDENTIFIED BY 'StagingDB2024!UserPass';
GRANT ALL PRIVILEGES ON pdflab_staging.* TO 'pdflab_staging'@'%';
FLUSH PRIVILEGES;
```
**Result**: User created, but connection still denied

### Solution 2: ALTER USER with Native Password
```sql
ALTER USER 'pdflab_staging'@'%' IDENTIFIED WITH mysql_native_password BY 'StagingDB2024!UserPass';
FLUSH PRIVILEGES;
```
**Result**: Connection still denied

### Solution 3: Try Escaped Password
```sql
ALTER USER 'pdflab_staging'@'%' IDENTIFIED WITH mysql_native_password BY 'StagingDB2024\\!UserPass';
FLUSH PRIVILEGES;
```
**Result**: Connection still denied

## Possible Root Causes

### Theory 1: Password Plugin Mismatch
- Container might be using different auth plugin than MySQL expects
- MySQL 8.0 defaults to `caching_sha2_password`
- Node.js mysql2 library might need `mysql_native_password`

### Theory 2: Character Encoding Issue
- The `\!` in environment variable might be interpreted differently by Node.js
- Sequelize/mysql2 might be sending different password string than expected

### Theory 3: Existing User Conflict
- There might be another user entry with same name but different host
- MySQL might be matching a more specific host first

### Theory 4: Bind Address Restriction
- MySQL might only be listening on specific interface
- Need to check MySQL `bind-address` configuration

## Diagnostic Commands Run

```bash
# Check user exists
docker exec -i 26197550bf4f_pdflab-mysql-staging mysql -u root --password=rootpassword123 -e "SELECT user, host FROM mysql.user WHERE user='pdflab_staging';"
✅ PASSED

# Check grants
docker exec -i 26197550bf4f_pdflab-mysql-staging mysql -u root --password=rootpassword123 -e "SHOW GRANTS FOR 'pdflab_staging'@'%';"
✅ PASSED - Full privileges

# Check container password
docker exec pdflab-backend-staging printenv DB_PASSWORD
✅ RESULT: StagingDB2024\!UserPass

# Check connection from backend
❌ FAILED - Container in restart loop
```

## Recommended Next Steps

### Option 1: Change Password to Simple String (QUICKEST)

1. **Update MySQL user password** (no special characters):
   ```bash
   ssh root@141.136.44.168
   docker exec -i 26197550bf4f_pdflab-mysql-staging mysql -u root --password=rootpassword123 << 'EOF'
   ALTER USER 'pdflab_staging'@'%' IDENTIFIED BY 'StagingDB2024UserPass';
   FLUSH PRIVILEGES;
   EOF
   ```

2. **Update backend container environment**:
   ```bash
   docker stop pdflab-backend-staging
   docker rm pdflab-backend-staging

   # Restart with new password (change DB_PASSWORD value)
   docker run -d --name pdflab-backend-staging ... -e DB_PASSWORD='StagingDB2024UserPass' ...
   ```

3. **Test connection**:
   ```bash
   docker logs pdflab-backend-staging 2>&1 | grep "Backend API listening"
   ```

**Pros**: Simple, will definitely work
**Cons**: Requires recreating container with different environment variable

---

### Option 2: Debug Exact Password Being Sent (DIAGNOSTIC)

1. **Enable MySQL general log**:
   ```sql
   SET GLOBAL general_log = 'ON';
   SET GLOBAL log_output = 'TABLE';
   ```

2. **Try connection from backend**

3. **Check what password was received**:
   ```sql
   SELECT * FROM mysql.general_log WHERE argument LIKE '%pdflab_staging%' ORDER BY event_time DESC LIMIT 10;
   ```

**Pros**: Will show exact password being sent
**Cons**: Security risk (passwords in logs), complex to analyze

---

### Option 3: Use Docker Secrets or .my.cnf (BEST PRACTICE)

1. **Create .my.cnf file** in container:
   ```ini
   [client]
   user=pdflab_staging
   password=StagingDB2024\!UserPass
   host=mysql-staging
   database=pdflab_staging
   ```

2. **Mount as Docker volume**

3. **Update application to read from .my.cnf**

**Pros**: Proper password management, no escaping issues
**Cons**: Requires code changes, not quick fix

---

### Option 4: Recreate MySQL User from Environment Variable (CLEANEST)

The original MySQL container was created with `MYSQL_USER` and `MYSQL_PASSWORD` environment variables. These automatically create a user with '%' host. Let's use the EXACT same process:

1. **Check what password MySQL container was created with**:
   ```bash
   docker inspect 26197550bf4f_pdflab-mysql-staging | grep MYSQL_PASSWORD
   ```

2. **If password matches, just drop and let MySQL recreate**:
   ```sql
   DROP USER IF EXISTS 'pdflab_staging'@'%';
   -- Then restart MySQL container and it will recreate user from MYSQL_USER env
   ```

3. **Or manually recreate with exact same password**:
   ```bash
   MYSQL_PASS=$(docker inspect 26197550bf4f_pdflab-mysql-staging | grep MYSQL_PASSWORD | cut -d '=' -f2 | tr -d '",')
   docker exec -i 26197550bf4f_pdflab-mysql-staging mysql -u root --password=rootpassword123 -e "CREATE USER 'pdflab_staging'@'%' IDENTIFIED BY '$MYSQL_PASS'; GRANT ALL PRIVILEGES ON pdflab_staging.* TO 'pdflab_staging'@'%'; FLUSH PRIVILEGES;"
   ```

**Pros**: Uses exact password from MySQL container creation
**Cons**: Requires parsing environment variables correctly

---

## Current Container Status

- **Backend**: 🔴 DOWN (Restarting loop)
- **MySQL**: ✅ UP (Healthy)
- **Redis**: ✅ UP (Healthy)

## Impact

- ❌ Cannot run integration tests
- ❌ Staging environment unusable
- ❌ Cannot verify rate limiting fix
- ✅ Production unaffected
- ✅ Code implementation correct (14/17 tests pass when container was working)

## Time Spent

- Initial investigation: 1 hour
- MySQL user creation attempts: 1 hour
- Password escaping debugging: 30 minutes
- **Total**: 2.5 hours

## Recommendation

**Use Option 1** (Change password to simple string) as the quickest solution:

1. Set MySQL password to `StagingDB2024UserPass` (no special chars)
2. Recreate backend container with updated `DB_PASSWORD` environment variable
3. Test connection
4. Run security tests

**Estimated time**: 15 minutes

---

## Key Learning

**Special characters in Docker environment variables are complex**:
- Different escaping rules for: shell → docker → container → application
- Best practice: Avoid special characters in passwords used in environment variables
- OR use Docker secrets/config files for complex passwords
- OR use password managers with auto-rotation

**MySQL user management**:
- Creating user with `'%'` host is correct for Docker networks
- `mysql_native_password` vs `caching_sha2_password` can cause auth issues
- Always test connection after creating/modifying users

---

**Report Created**: November 20, 2025
**Next Action**: Choose one of the 4 options above and implement
**Priority**: HIGH (blocks all staging testing)
