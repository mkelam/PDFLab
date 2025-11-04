#!/usr/bin/env node
/**
 * Docker Health Check Script
 * This runs inside the container to verify the application is healthy
 * Exit codes: 0 = healthy, 1 = unhealthy
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3006,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.error(`❌ Health check failed: HTTP ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`❌ Health check failed: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('❌ Health check failed: Request timeout');
  request.destroy();
  process.exit(1);
});

request.end();
