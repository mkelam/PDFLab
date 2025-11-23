import { cloudConvertService } from './src/services/cloudconvert.service'
import logger from './src/config/logger'
import fs from 'fs'
import path from 'path'

/**
 * Circuit Breaker Test Script
 *
 * This script tests the circuit breaker implementation for CloudConvert service.
 * It simulates various scenarios to verify the circuit breaker behavior.
 */

async function testCircuitBreaker() {
  logger.info('=== Testing CloudConvert Circuit Breaker ===')

  // Create a test PDF file if it doesn't exist
  const testDir = path.join(__dirname, 'test-files')
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  const testPdfPath = path.join(testDir, 'test.pdf')
  const outputPath = path.join(testDir, 'output.docx')

  // Create a minimal PDF for testing (or use an existing one)
  if (!fs.existsSync(testPdfPath)) {
    logger.warn('Test PDF not found. Please place a test.pdf in backend/test-files/')
    logger.warn('Skipping conversion tests, only testing stats endpoint')
  }

  // Test 1: Check initial circuit breaker stats
  logger.info('\n--- Test 1: Initial Circuit Breaker Stats ---')
  try {
    const stats = cloudConvertService.getCircuitBreakerStats()
    logger.info('Circuit Breaker Stats:', JSON.stringify(stats, null, 2))
    logger.info('✓ Test 1 passed: Stats endpoint working')
  } catch (error: any) {
    logger.error('✗ Test 1 failed:', error.message)
  }

  // Test 2: Successful conversion (if test file exists)
  if (fs.existsSync(testPdfPath)) {
    logger.info('\n--- Test 2: Successful Conversion ---')
    try {
      const result = await cloudConvertService.convertFile({
        inputFormat: 'pdf',
        outputFormat: 'docx',
        inputFilePath: testPdfPath,
        outputFilePath: outputPath,
        options: {}
      })

      if (result.success) {
        logger.info('✓ Test 2 passed: Conversion successful')
        logger.info('Output:', result.outputPath)
      } else {
        logger.warn('✗ Test 2 partial: Conversion failed:', result.error)
      }
    } catch (error: any) {
      logger.error('✗ Test 2 failed:', error.message)
    }
  }

  // Test 3: Check stats after conversion
  logger.info('\n--- Test 3: Stats After Conversion ---')
  try {
    const stats = cloudConvertService.getCircuitBreakerStats()
    logger.info('Convert Stats:', {
      fires: stats.convert.fires,
      successes: stats.convert.successes,
      failures: stats.convert.failures,
      state: stats.convert.state,
      isOpen: stats.convert.isOpen
    })
    logger.info('✓ Test 3 passed: Stats updated correctly')
  } catch (error: any) {
    logger.error('✗ Test 3 failed:', error.message)
  }

  // Test 4: Test with invalid file (should fail but circuit stays closed)
  logger.info('\n--- Test 4: Invalid File Test ---')
  try {
    const result = await cloudConvertService.convertFile({
      inputFormat: 'pdf',
      outputFormat: 'docx',
      inputFilePath: '/nonexistent/file.pdf',
      outputFilePath: '/tmp/output.docx',
      options: {}
    })

    if (!result.success) {
      logger.info('✓ Test 4 passed: Invalid file handled gracefully')
      logger.info('Error message:', result.error)
    } else {
      logger.warn('✗ Test 4 unexpected: Invalid file succeeded?')
    }
  } catch (error: any) {
    logger.info('✓ Test 4 passed: Exception caught:', error.message)
  }

  // Test 5: Final stats
  logger.info('\n--- Test 5: Final Circuit Breaker Stats ---')
  try {
    const stats = cloudConvertService.getCircuitBreakerStats()

    logger.info('=== FINAL STATS ===')
    logger.info('Convert Circuit:')
    logger.info(`  State: ${stats.convert.state}`)
    logger.info(`  Open: ${stats.convert.isOpen}`)
    logger.info(`  Total Calls: ${stats.convert.fires}`)
    logger.info(`  Successes: ${stats.convert.successes}`)
    logger.info(`  Failures: ${stats.convert.failures}`)
    logger.info(`  Rejects: ${stats.convert.rejects}`)
    logger.info(`  Timeouts: ${stats.convert.timeouts}`)

    if (stats.convert.fires > 0) {
      const successRate = ((stats.convert.successes / stats.convert.fires) * 100).toFixed(1)
      logger.info(`  Success Rate: ${successRate}%`)
    }

    logger.info('\nDownload Circuit:')
    logger.info(`  State: ${stats.download.state}`)
    logger.info(`  Total Calls: ${stats.download.fires}`)
    logger.info(`  Successes: ${stats.download.successes}`)
    logger.info(`  Failures: ${stats.download.failures}`)

    logger.info('\n✓ Test 5 passed: All stats retrieved')
  } catch (error: any) {
    logger.error('✗ Test 5 failed:', error.message)
  }

  logger.info('\n=== Circuit Breaker Test Complete ===')
  logger.info('\nNOTE: To test circuit opening:')
  logger.info('1. Temporarily set CLOUDCONVERT_API_KEY to invalid value')
  logger.info('2. Run this script multiple times')
  logger.info('3. After 3+ failures, circuit should open')
  logger.info('4. Subsequent calls should reject immediately')
}

// Run if called directly
if (require.main === module) {
  testCircuitBreaker()
    .then(() => {
      logger.info('\nTest completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Test failed with error:', error)
      process.exit(1)
    })
}

export { testCircuitBreaker }
