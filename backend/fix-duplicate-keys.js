const {Sequelize} = require('sequelize');

const db = new Sequelize('pdflab', 'pdflab', '***REMOVED***', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function dropDuplicateKeys() {
  console.log('Checking for duplicate keys on users table...');

  const keysToKeep = ['PRIMARY', 'email', 'users_stripe_customer_id'];
  const [keys] = await db.query('SHOW KEYS FROM users');
  const uniqueKeys = [...new Set(keys.map(k => k.Key_name))];

  console.log(`Found ${uniqueKeys.length} unique keys`);
  console.log(`Keeping: ${keysToKeep.join(', ')}`);

  let dropped = 0;
  for (const keyName of uniqueKeys) {
    if (!keysToKeep.includes(keyName)) {
      try {
        await db.query(`ALTER TABLE users DROP INDEX \`${keyName}\``);
        console.log(`✓ Dropped: ${keyName}`);
        dropped++;
      } catch (e) {
        console.log(`✗ Failed to drop ${keyName}: ${e.message}`);
      }
    }
  }

  const [finalKeys] = await db.query('SHOW KEYS FROM users');
  const finalUniqueKeys = [...new Set(finalKeys.map(k => k.Key_name))];

  console.log(`\n✓ Dropped ${dropped} duplicate keys`);
  console.log(`✓ Final key count: ${finalKeys.length} (${finalUniqueKeys.length} unique)`);
  console.log(`✓ Remaining keys: ${finalUniqueKeys.join(', ')}`);

  await db.close();
  process.exit(0);
}

dropDuplicateKeys().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
