const axios = require('axios');

async function sendPartnerEmail() {
  try {
    // Login as admin
    console.log('🔐 Logging in as admin...');
    const loginRes = await axios.post('http://localhost:3006/api/auth/login', {
      email: 'admin@pdflab.pro',
      password: 'Admin123!'
    });

    const token = loginRes.data.token;
    console.log('✅ Admin logged in successfully');

    // Get all partner applications
    console.log('📋 Fetching partner applications...');
    const appsRes = await axios.get('http://localhost:3006/api/partners/admin/applications', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const pendingApps = appsRes.data.filter(app => app.status === 'pending');

    if (pendingApps.length === 0) {
      console.log('⚠ No pending applications to approve');
      console.log('Total applications:', appsRes.data.length);
      return;
    }

    // Get the most recent one
    const latestApp = pendingApps.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )[0];

    console.log(`\n📧 Latest pending application:`);
    console.log(`   Email: ${latestApp.email}`);
    console.log(`   Name: ${latestApp.full_name}`);
    console.log(`   Platform: ${latestApp.platform_name}`);
    console.log(`   Applied: ${new Date(latestApp.created_at).toLocaleString()}`);

    // Approve it with PLATINUM tier (this will trigger the email)
    console.log('\n🎉 Approving application with PLATINUM tier...');
    const approveRes = await axios.post(
      `http://localhost:3006/api/partners/admin/applications/${latestApp.id}/approve`,
      {
        commission_tier: 'platinum',
        notes: 'PLATINUM tier approval - Testing new tier system with 60% commission rate'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('✅ Application approved successfully!');
    console.log('📧 Email should have been sent to:', latestApp.email);
    console.log('\nResponse:', JSON.stringify(approveRes.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

sendPartnerEmail();
