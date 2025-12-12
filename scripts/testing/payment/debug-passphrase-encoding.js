// Debug passphrase encoding issues
const crypto = require('crypto');

const passphrase = process.env.PAYFAST_PASSPHRASE || '<redacted>';

console.log('===========================================');
console.log('🔍 PayFast Passphrase Encoding Debug');
console.log('===========================================\n');

console.log('📝 Original Passphrase:', passphrase);
console.log('📏 Length:', passphrase.length);
console.log('');

// Test different encoding methods
console.log('🧪 Encoding Tests:');
console.log('');

// Method 1: No encoding (plain)
console.log('1. Plain (no encoding):');
console.log(`   ${passphrase}`);
console.log('');

// Method 2: URL encoding
const urlEncoded = encodeURIComponent(passphrase);
console.log('2. URL Encoded:');
console.log(`   ${urlEncoded}`);
console.log('');

// Method 3: URL encoding with + for spaces (PayFast standard)
const payfastEncoded = encodeURIComponent(passphrase).replace(/%20/g, '+');
console.log('3. PayFast Style (URL + replace spaces):');
console.log(`   ${payfastEncoded}`);
console.log('');

// Check for special characters
console.log('🔤 Character Analysis:');
const chars = passphrase.split('');
chars.forEach((char, i) => {
  const code = char.charCodeAt(0);
  const encoded = encodeURIComponent(char);
  if (char !== encoded) {
    console.log(`   Position ${i}: '${char}' → '${encoded}' (code: ${code})`);
  }
});

if (passphrase === payfastEncoded) {
  console.log('   ✅ No special characters needing encoding');
} else {
  console.log(`   ⚠️  Encoded differently: ${payfastEncoded}`);
}
console.log('');

// Test signature generation with this passphrase
const testData = {
  merchant_id: '25263515',
  merchant_key: process.env.PAYFAST_MERCHANT_KEY || 'change_me',
  amount: '9.99',
  item_name: 'Test Plan'
};

const PARAM_ORDER = ['merchant_id', 'merchant_key', 'amount', 'item_name'];

function generateSignature(data, pass) {
  let paramString = '';
  for (const key of PARAM_ORDER) {
    if (data[key]) {
      paramString += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}&`;
    }
  }
  paramString = paramString.slice(0, -1);

  if (pass) {
    paramString += `&passphrase=${encodeURIComponent(pass.trim()).replace(/%20/g, '+')}`;
  }

  console.log('📊 Parameter String for Signature:');
  console.log(`   ${paramString}`);
  console.log('');

  return crypto.createHash('md5').update(paramString).digest('hex').toLowerCase();
}

const sig1 = generateSignature(testData, '');
console.log('🔐 Signature WITHOUT passphrase:');
console.log(`   ${sig1}`);
console.log('');

const sig2 = generateSignature(testData, passphrase);
console.log('🔐 Signature WITH passphrase:');
console.log(`   ${sig2}`);
console.log('');

console.log('===========================================');
console.log('⚠️  IMPORTANT CHECKS:');
console.log('===========================================\n');

console.log('1. Passphrase in .env file:');
console.log('   - Check NO quotes around value');
console.log('   - Check NO trailing spaces');
console.log('   - Exact value: <redacted>');
console.log('');

console.log('2. Backend environment variable:');
console.log('   - Verify backend loaded the passphrase');
console.log('   - Check: docker exec pdflab-backend-prod printenv | grep PAYFAST');
console.log('');

console.log('3. PayFast Dashboard:');
console.log('   - Passphrase must match EXACTLY (case-sensitive)');
console.log('   - Dashboard value: <redacted>');
console.log('   - .env value:      <redacted>');
console.log('');

console.log('4. Hyphen character:');
console.log('   - Passphrase contains hyphen: -');
console.log('   - This should NOT be URL encoded in the signature string');
console.log('   - Hyphen is allowed without encoding');
console.log('');

console.log('===========================================\n');
