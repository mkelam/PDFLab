// Quick test to verify backend is accessible
const http = require('http');

console.log('Testing backend connection...');

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✓ Backend is accessible!`);
  console.log(`✓ Status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`✓ Response: ${data}`);
    console.log('\n✓ Backend is running correctly on port 3006');
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error(`✗ Connection error: ${error.message}`);
  console.error('\nBackend appears to be down or not listening on port 3006');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('✗ Request timed out');
  req.destroy();
  process.exit(1);
});

req.end();
