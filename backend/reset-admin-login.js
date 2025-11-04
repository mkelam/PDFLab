const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database connection
const sequelize = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function resetAdminPassword() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Query all users
    console.log('Fetching all users...');
    const [users] = await sequelize.query(`
      SELECT id, email, name, role, plan, email_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log(`Found ${users.length} users:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name || 'Not set'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Plan: ${user.plan}`);
      console.log(`   Email Verified: ${user.email_verified ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });

    // Find admin users
    const [adminUsers] = await sequelize.query(`
      SELECT id, email, role
      FROM users
      WHERE role IN ('admin', 'super_admin')
    `);

    console.log(`\nFound ${adminUsers.length} admin/super_admin users:\n`);
    adminUsers.forEach(admin => {
      console.log(`- ${admin.email} (${admin.role})`);
    });

    // Reset password for admin@pdflab.test
    const adminEmail = 'admin@pdflab.test';
    const newPassword = 'Admin123!';

    console.log(`\n\nResetting password for ${adminEmail}...`);

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [result] = await sequelize.query(`
      UPDATE users
      SET password_hash = :passwordHash
      WHERE email = :email
    `, {
      replacements: { passwordHash, email: adminEmail }
    });

    if (result === 0) {
      console.log(`\n✗ User ${adminEmail} not found in database!`);
      console.log('\nCreating admin user...');

      const userId = require('crypto').randomUUID();
      await sequelize.query(`
        INSERT INTO users (
          id, email, password_hash, name, role, plan,
          conversions_used, conversions_limit, email_verified,
          created_at, updated_at
        ) VALUES (
          :id, :email, :passwordHash, :name, :role, :plan,
          0, 999999, true,
          NOW(), NOW()
        )
      `, {
        replacements: {
          id: userId,
          email: adminEmail,
          passwordHash,
          name: 'PDFLab Admin',
          role: 'super_admin',
          plan: 'enterprise'
        }
      });

      console.log('✓ Admin user created successfully!');
    } else {
      console.log('✓ Password reset successfully!');
    }

    // Verify the update
    const [verifyUsers] = await sequelize.query(`
      SELECT email, role, plan, email_verified
      FROM users
      WHERE email = :email
    `, {
      replacements: { email: adminEmail }
    });

    if (verifyUsers.length > 0) {
      const user = verifyUsers[0];
      console.log('\n--- ADMIN LOGIN CREDENTIALS ---');
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${newPassword}`);
      console.log(`Role: ${user.role}`);
      console.log(`Plan: ${user.plan}`);
      console.log(`Email Verified: ${user.email_verified ? 'Yes' : 'No'}`);
      console.log('-------------------------------\n');

      // Test password hash
      const testHash = await bcrypt.compare(newPassword, passwordHash);
      console.log(`Password hash verification: ${testHash ? '✓ Valid' : '✗ Invalid'}`);
    }

    console.log('\n✓ Admin password reset complete!');
    console.log('\nYou can now login at: http://localhost:3003/login');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${newPassword}`);

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

resetAdminPassword();
