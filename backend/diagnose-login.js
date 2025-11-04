const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database connection
const sequelize = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function diagnoseLogin() {
  try {
    console.log('🔍 Login Diagnostic Tool\n');
    console.log('='.repeat(60));

    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Test credentials
    const testEmail = 'admin@pdflab.test';
    const testPassword = 'Admin123!';

    console.log('Testing Credentials:');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}\n`);

    // Get user from database
    const [users] = await sequelize.query(`
      SELECT id, email, password_hash, name, role, plan
      FROM users
      WHERE email = :email
    `, {
      replacements: { email: testEmail }
    });

    if (users.length === 0) {
      console.log('❌ USER NOT FOUND IN DATABASE');
      console.log('\nAvailable admin users:');

      const [admins] = await sequelize.query(`
        SELECT email, role FROM users WHERE role IN ('admin', 'super_admin')
      `);

      admins.forEach(admin => {
        console.log(`  - ${admin.email} (${admin.role})`);
      });

      return;
    }

    const user = users[0];
    console.log('✓ User found in database');
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Plan: ${user.plan}\n`);

    // Test password hash
    console.log('🔐 Password Hash Information:');
    console.log(`  Hash Length: ${user.password_hash.length} characters`);
    console.log(`  Hash Starts With: ${user.password_hash.substring(0, 29)}`);
    console.log(`  Is bcrypt format: ${user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') ? 'YES ✓' : 'NO ❌'}\n`);

    // Create a fresh hash for comparison
    console.log('Creating fresh password hash...');
    const freshHash = await bcrypt.hash(testPassword, 10);
    console.log(`  Fresh Hash: ${freshHash.substring(0, 29)}...\n`);

    // Test password verification
    console.log('Testing Password Verification:');

    console.log('  Test 1: bcrypt.compare() with database hash');
    const test1 = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`    Result: ${test1 ? '✓ PASS - Password matches!' : '❌ FAIL - Password does not match'}`);

    console.log('  Test 2: bcrypt.compare() with fresh hash');
    const test2 = await bcrypt.compare(testPassword, freshHash);
    console.log(`    Result: ${test2 ? '✓ PASS - Fresh hash works' : '❌ FAIL - Fresh hash broken'}`);

    console.log('\n' + '='.repeat(60));

    if (test1) {
      console.log('\n✅ LOGIN SHOULD WORK!');
      console.log('\nThe password in the database is correct.');
      console.log('If you still can\'t login through the browser:');
      console.log('  1. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('  2. Clear localStorage: Open console (F12) and run: localStorage.clear()');
      console.log('  3. Make sure you\'re using the correct URL port');
      console.log('  4. Check browser console for JavaScript errors');
      console.log('  5. Check Network tab for failed API requests');
    } else {
      console.log('\n❌ PASSWORD MISMATCH DETECTED');
      console.log('\nThe password in the database does NOT match "Admin123!"');
      console.log('\nFixing now...');

      // Update password
      const [result] = await sequelize.query(`
        UPDATE users
        SET password_hash = :hash
        WHERE email = :email
      `, {
        replacements: { hash: freshHash, email: testEmail }
      });

      console.log('✓ Password updated in database');

      // Verify the fix
      const [updatedUsers] = await sequelize.query(`
        SELECT password_hash FROM users WHERE email = :email
      `, {
        replacements: { email: testEmail }
      });

      const verifyFix = await bcrypt.compare(testPassword, updatedUsers[0].password_hash);
      console.log(`✓ Verification: ${verifyFix ? 'Password now works!' : 'Still broken (this should not happen)'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n🌐 TRY LOGGING IN AT:');
    console.log('   http://localhost:3000/login');
    console.log('   http://localhost:3001/login');
    console.log('   http://localhost:3002/login');
    console.log('   http://localhost:3003/login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

diagnoseLogin();
