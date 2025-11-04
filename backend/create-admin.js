const API_URL = 'http://localhost:3006'

async function createAdmin() {
  try {
    // Register new user
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pdflab.test',
        password: 'AdminPass123',
        name: 'Test Admin'
      })
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✓ User registered successfully')
      console.log('  User ID:', data.user.id)
      console.log('  Email:', data.user.email)

      // Now promote to super_admin via database
      const { execSync } = require('child_process')
      execSync(`docker exec pdflab-mysql mysql -u pdflab -p***REMOVED*** pdflab -e "UPDATE users SET role = 'super_admin' WHERE email = 'admin@pdflab.test';"`)

      console.log('✓ Promoted to super_admin')
      console.log('\nCredentials for testing:')
      console.log('  Email: admin@pdflab.test')
      console.log('  Password: AdminPass123')
    } else {
      console.log('✗ Registration failed:', data.message)
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

createAdmin()
