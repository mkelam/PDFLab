require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'pdflab',
  process.env.MYSQL_USER || 'pdflab_user',
  process.env.MYSQL_PASSWORD || 'pdflab_secure_123',
  {
    host: 'localhost',
    port: 3307,
    dialect: 'mysql'
  }
);

async function resetConversions() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    const [results] = await sequelize.query(
      'UPDATE users SET conversions_used = 0 WHERE email = "test@example.com"'
    );

    console.log('✓ Conversion count reset successfully');
    console.log(`Rows affected: ${results.affectedRows}`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

resetConversions();
