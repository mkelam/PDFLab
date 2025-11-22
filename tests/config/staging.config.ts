/**
 * Staging Environment Configuration for Tests
 * Use this config when running tests against staging environment
 *
 * Usage:
 * import { stagingConfig } from '../config/staging.config'
 * const apiUrl = stagingConfig.apiUrl
 */

export const stagingConfig = {
  // Main App
  mainAppUrl: 'http://141.136.44.168:3002',

  // Partner Portal
  partnerPortalUrl: 'http://141.136.44.168:3003',

  // Backend API
  apiUrl: 'http://141.136.44.168:3007',

  // Database (via SSH tunnel if needed)
  database: {
    host: '141.136.44.168',
    port: 3307,
    name: 'pdflab_staging',
  },

  // Redis (via SSH tunnel if needed)
  redis: {
    host: '141.136.44.168',
    port: 6380,
  },

  // Test User Credentials (verified in staging DB)
  testUsers: {
    regular: {
      email: 'test.staging@pdflab.pro',
      password: 'StagingTest123!',
    },
    admin: {
      email: 'admin@pdflab.test',
      password: 'Admin123!',
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

  // Timeouts (increased for remote server)
  timeouts: {
    pageLoad: 30000,
    apiRequest: 15000,
    fileUpload: 60000,
    fileDownload: 60000,
  },
}

// Helper to get the right config based on environment
export function getTestConfig() {
  const env = process.env.TEST_ENV || 'local'

  if (env === 'staging') {
    return stagingConfig
  }

  // Local config (default)
  return {
    mainAppUrl: 'http://localhost:3000',
    partnerPortalUrl: 'http://localhost:3001',
    apiUrl: 'http://localhost:3006',
    testUsers: {
      regular: {
        email: 'test@pdflab.pro',
        password: 'TestPass123!',
      },
      admin: {
        email: 'admin@pdflab.pro',
        password: 'AdminPass123!',
      },
      partner: {
        email: 'partner@pdflab.pro',
        password: 'PartnerPass123!',
        partnerCode: 'LOCAL-PARTNER-001',
      },
    },
    payfast: {
      mode: 'sandbox',
      merchantId: '10000100',
      merchantKey: '46f0cd694581a',
    },
    features: {
      batchProcessing: true,
      partnerPortal: true,
      betaUsers: true,
      feedback: true,
    },
    timeouts: {
      pageLoad: 10000,
      apiRequest: 5000,
      fileUpload: 30000,
      fileDownload: 30000,
    },
  }
}
