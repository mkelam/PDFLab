const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

const db = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

const newPassword = 'Admin123!';

(async () => {
  try {
    const hash = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      {
        replacements: [hash, 'admin@pdflab.test']
      }
    );

    console.log('✅ Admin password has been reset!');
    console.log('');
    console.log('📧 Email: admin@pdflab.test');
    console.log('🔑 Password: Admin123!');
    console.log('');
    console.log('You can now login at: http://localhost:3001/login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
