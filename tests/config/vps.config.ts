/**
 * VPS Environment Configuration for Tests
 * Use this config when running tests ON the VPS staging server
 *
 * Tests hit external IP to test full network stack (firewall, proxy, etc.)
 * Even though tests run on the VPS, they access services via external IP
 */

export const vpsConfig = {
  // Main App (external access to test full stack)
  mainAppUrl: 'http://141.136.44.168:3002',

  // Partner Portal (external access to test full stack)
  partnerPortalUrl: 'http://141.136.44.168:3003',

  // Backend API (external access to test full stack)
  apiUrl: 'http://141.136.44.168:3007',

  // Database (Docker internal network)
  database: {
    host: 'localhost',
    port: 3307,
    name: 'pdflab_staging',
  },

  // Redis (Docker internal network)
  redis: {
    host: 'localhost',
    port: 6380,
  },

  // Test User Credentials
  testUsers: {
    regular: {
      email: 'test.staging@pdflab.pro',
      password: 'StagingTest123!',
    },
    admin: {
      email: 'admin.staging@pdflab.pro',
      password: 'AdminStaging123!',
    },
    partner: {
      email: 'partner.staging@pdflab.pro',
      password: 'PartnerStaging123!',
      partnerCode: 'STAGING-PARTNER-001',
    },
  },

  // PayFast (Sandbox Mode)
  payfast: {
    mode: 'sandbox',
    merchantId: '10000100',
    merchantKey: '46f0cd694581a',
  },

  // Feature Flags
  features: {
    batchProcessing: true,
    partnerPortal: true,
    betaUsers: true,
    feedback: true,
  },

  // Timeouts
  timeouts: {
    pageLoad: 15000,
    apiRequest: 5000,
    fileUpload: 30000,
    fileDownload: 30000,
  },
}

export default vpsConfig
