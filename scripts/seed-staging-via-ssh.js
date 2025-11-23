/**
 * Seed Staging Database via Backend Container
 *
 * This script connects to the staging backend container and uses
 * Sequelize models to seed test data directly.
 */

const bcrypt = require('bcrypt');

// Staging database connection (from backend container env)
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'mysql-staging',  // Docker network alias
  port: 3306,
  user: 'pdflab_staging',
  password: 'StagingDB2024!UserPass',
  database: 'pdflab_staging'
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to staging database');

    // Password hash for all test users
    const passwordHash = '$2b$10$5WID6EJ4TIqgxVJOrvfC5udqDlu2ynkw3wc18wBLIsjZ0Ifx/oiF.'; // TestPass123!

    // 1. Delete existing test users
    console.log('\n🗑️  Cleaning up existing test data...');
    await connection.execute(`
      DELETE FROM users WHERE email IN (
        'testuser@pdflab.com',
        'admin@pdflab.test',
        'pro-user@test.com',
        'enterprise-user@test.com',
        'beta-user@test.com',
        'quota-exceeded@test.com'
      )
    `);
    console.log('   ✓ Deleted old test users');

    // 2. Insert test users
    console.log('\n👥 Creating test users...');

    // Test User 1: Regular free plan user
    await connection.execute(`
      INSERT INTO users (
        id, email, password_hash, name, role, plan,
        conversions_used, conversions_limit, is_beta_user,
        email_verified, failed_reset_attempts, onboarding_completed,
        onboarding_skipped, created_at, updated_at, last_login
      ) VALUES (
        '93820ef2-c56a-11f0-9cc6-4204411f080d',
        'testuser@pdflab.com',
        ?,
        'Test User',
        'user',
        'free',
        0,
        3,
        FALSE,
        TRUE,
        0,
        FALSE,
        FALSE,
        NOW(),
        NOW(),
        NOW()
      )
    `, [passwordHash]);
    console.log('   ✓ testuser@pdflab.com (free plan)');

    // Test User 2: Admin user
    await connection.execute(`
      INSERT INTO users (
        id, email, password_hash, name, role, plan,
        conversions_used, conversions_limit, is_beta_user,
        email_verified, failed_reset_attempts, onboarding_completed,
        onboarding_skipped, created_at, updated_at
      ) VALUES (
        '4a0a68d0-c1ef-11f0-8290-0ebc70418b98',
        'admin@pdflab.test',
        ?,
        'Admin User',
        'admin',
        'enterprise',
        0,
        999999,
        FALSE,
        TRUE,
        0,
        TRUE,
        FALSE,
        NOW(),
        NOW()
      )
    `, [passwordHash]);
    console.log('   ✓ admin@pdflab.test (admin/enterprise)');

    // Test User 3: Pro plan user
    await connection.execute(`
      INSERT INTO users (
        id, email, password_hash, name, role, plan,
        conversions_used, conversions_limit, is_beta_user,
        email_verified, failed_reset_attempts, onboarding_completed,
        onboarding_skipped, created_at, updated_at
      ) VALUES (
        'aabbccdd-1111-2222-3333-444444444444',
        'pro-user@test.com',
        ?,
        'Pro User',
        'user',
        'pro',
        5,
        999999,
        FALSE,
        TRUE,
        0,
        TRUE,
        FALSE,
        NOW(),
        NOW()
      )
    `, [passwordHash]);
    console.log('   ✓ pro-user@test.com (pro plan)');

    // Test User 4: Enterprise user
    await connection.execute(`
      INSERT INTO users (
        id, email, password_hash, name, role, plan,
        conversions_used, conversions_limit, is_beta_user,
        email_verified, failed_reset_attempts, onboarding_completed,
        onboarding_skipped, created_at, updated_at
      ) VALUES (
        'bbccddee-2222-3333-4444-555555555555',
        'enterprise-user@test.com',
        ?,
        'Enterprise User',
        'user',
        'enterprise',
        10,
        999999,
        FALSE,
        TRUE,
        0,
        TRUE,
        FALSE,
        NOW(),
        NOW()
      )
    `, [passwordHash]);
    console.log('   ✓ enterprise-user@test.com (enterprise plan)');

    // Test User 5: Beta user
    await connection.execute(`
      INSERT INTO users (
        id, email, password_hash, name, role, plan,
        conversions_used, conversions_limit, is_beta_user, beta_expires_at,
        email_verified, failed_reset_attempts, onboarding_completed,
        onboarding_skipped, created_at, updated_at
      ) VALUES (
        'ccddee11-3333-4444-5555-666666666666',
        'beta-user@test.com',
        ?,
        'Beta User',
        'user',
        'pro',
        2,
        999999,
        TRUE,
        DATE_ADD(NOW(), INTERVAL 60 DAY),
        TRUE,
        0,
        FALSE,
        FALSE,
        NOW(),
        NOW()
      )
    `, [passwordHash]);
    console.log('   ✓ beta-user@test.com (beta/pro plan)');

    // Test User 6: Quota exceeded user
    await connection.execute(`
      INSERT INTO users (
        id, email, password_hash, name, role, plan,
        conversions_used, conversions_limit, is_beta_user,
        email_verified, failed_reset_attempts, onboarding_completed,
        onboarding_skipped, created_at, updated_at
      ) VALUES (
        'ddee1122-4444-5555-6666-777777777777',
        'quota-exceeded@test.com',
        ?,
        'Quota Exceeded User',
        'user',
        'free',
        3,
        3,
        FALSE,
        TRUE,
        0,
        TRUE,
        FALSE,
        NOW(),
        NOW()
      )
    `, [passwordHash]);
    console.log('   ✓ quota-exceeded@test.com (quota maxed out)');

    // 3. Verify seeding
    console.log('\n📊 Verification:');
    const [users] = await connection.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.%'
    `);
    console.log(`   ✓ ${users[0].count} test users created`);

    // Show created users
    const [userList] = await connection.execute(`
      SELECT email, role, plan,
        CONCAT(conversions_used, '/', conversions_limit) as quota,
        IF(is_beta_user, 'BETA', 'REGULAR') as type
      FROM users
      WHERE email LIKE '%@test.com' OR email LIKE '%@pdflab.%'
      ORDER BY created_at
    `);

    console.log('\n📋 Created Users:');
    userList.forEach(user => {
      console.log(`   - ${user.email.padEnd(30)} | ${user.role.padEnd(10)} | ${user.plan.padEnd(10)} | ${user.quota.padEnd(10)} | ${user.type}`);
    });

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n🔑 Test Credentials:');
    console.log('   Email: testuser@pdflab.com (or any user above)');
    console.log('   Password: TestPass123!');

  } catch (error) {
    console.error('\n❌ Error seeding database:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeding
seedDatabase()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
