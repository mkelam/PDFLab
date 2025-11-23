// Reset admin password to Admin123!
require('dotenv').config({ path: './.env' });
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function resetPassword() {
  const password = 'Admin123!';
  const email = 'admin@pdflab.test';

  console.log('🔐 Resetting admin password...');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);

  // Generate hash
  const hash = await bcrypt.hash(password, 10);
  console.log(`✓ Generated hash: ${hash.substring(0, 20)}...`);

  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'pdflab',
    password: process.env.DB_PASSWORD || '***REMOVED***',
    database: process.env.DB_NAME || 'pdflab'
  });

  console.log('✓ Connected to database');

  // Update password
  await connection.execute(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hash, email]
  );

  console.log('✓ Password updated successfully');

  // Verify
  const [rows] = await connection.execute(
    'SELECT email, name, role FROM users WHERE email = ?',
    [email]
  );

  if (rows.length > 0) {
    console.log('\n✅ Admin account ready:');
    console.log(`   Email: ${rows[0].email}`);
    console.log(`   Name: ${rows[0].name}`);
    console.log(`   Role: ${rows[0].role}`);
    console.log(`   Password: ${password}`);
  }

  await connection.end();
}

resetPassword().catch(console.error);
