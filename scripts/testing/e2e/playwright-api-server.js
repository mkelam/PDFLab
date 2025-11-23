/**
 * Playwright API Server for BMAD Autonomous Test Execution
 *
 * This Express.js server enables CustomGPT to execute Playwright tests
 * autonomously via HTTP API using OpenAI Actions.
 *
 * Start server: node playwright-api-server.js
 * Default port: 3007
 */

const express = require('express')
const cors = require('cors')
const { exec } = require('child_process')
const fs = require('fs').promises
const path = require('path')

const app = express()
const PORT = process.env.PLAYWRIGHT_API_PORT || 3007

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Test execution state
let latestResults = {
  status: 'idle',
  jobId: null,
  startTime: null,
  endTime: null,
  results: null,
  stdout: '',
  stderr: '',
  error: null
}

// Utility: Parse Playwright JSON output
function parsePlaywrightResults(stdout) {
  try {
    // Playwright outputs JSON reporter format
    const lines = stdout.split('\n')
    const jsonLine = lines.find(line => line.trim().startsWith('{') && line.includes('"suites"'))
    if (jsonLine) {
      return JSON.parse(jsonLine)
    }

    // Fallback: Parse text output
    const totalMatch = stdout.match(/(\d+) passed/)
    const failedMatch = stdout.match(/(\d+) failed/)
    const skippedMatch = stdout.match(/(\d+) skipped/)

    return {
      summary: {
        total: parseInt(totalMatch?.[1] || '0') + parseInt(failedMatch?.[1] || '0'),
        passed: parseInt(totalMatch?.[1] || '0'),
        failed: parseInt(failedMatch?.[1] || '0'),
        skipped: parseInt(skippedMatch?.[1] || '0')
      },
      raw: stdout
    }
  } catch (error) {
    console.error('Error parsing Playwright results:', error)
    return { raw: stdout, error: error.message }
  }
}

// Utility: Analyze test results for actionable insights
function analyzeResults(results) {
  if (!results) return { insights: [], recommendations: [] }

  const insights = []
  const recommendations = []

  const { summary } = results
  if (summary) {
    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0
    insights.push(`Pass rate: ${passRate}% (${summary.passed}/${summary.total})`)

    if (summary.failed > 0) {
      insights.push(`${summary.failed} test(s) failed`)
      recommendations.push('Review error screenshots in test-results/ folder')
      recommendations.push('Check error-context.md files for detailed failure information')
    }

    if (summary.skipped > 0) {
      insights.push(`${summary.skipped} test(s) skipped`)
      recommendations.push('Review .skip() or .fixme() annotations in test files')
    }

    if (passRate < 100) {
      recommendations.push('Use BMAD Dev agent to fix failing tests')
      recommendations.push('Re-run tests after fixes with POST /api/playwright/run')
    } else {
      insights.push('All tests passing! ✓')
    }
  }

  return { insights, recommendations }
}

// Utility: Get screenshots from test-results folder
async function getScreenshots() {
  try {
    const resultsDir = path.join(__dirname, 'test-results')
    const entries = await fs.readdir(resultsDir, { withFileTypes: true })

    const screenshots = []
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const testDir = path.join(resultsDir, entry.name)
        const files = await fs.readdir(testDir)

        for (const file of files) {
          if (file.endsWith('.png')) {
            screenshots.push({
              test: entry.name,
              file: file,
              path: path.join(testDir, file)
            })
          }
        }
      }
    }

    return screenshots
  } catch (error) {
    console.error('Error reading screenshots:', error)
    return []
  }
}

// Utility: Get error context files
async function getErrorContexts() {
  try {
    const resultsDir = path.join(__dirname, 'test-results')
    const entries = await fs.readdir(resultsDir, { withFileTypes: true })

    const contexts = []
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const testDir = path.join(resultsDir, entry.name)
        const files = await fs.readdir(testDir)

        for (const file of files) {
          if (file === 'error-context.md') {
            const content = await fs.readFile(path.join(testDir, file), 'utf-8')
            contexts.push({
              test: entry.name,
              content: content
            })
          }
        }
      }
    }

    return contexts
  } catch (error) {
    console.error('Error reading error contexts:', error)
    return []
  }
}

/**
 * POST /api/playwright/run
 * Execute Playwright tests with optional filters
 */
app.post('/api/playwright/run', async (req, res) => {
  const { testFile, project, grep, workers, reporter } = req.body

  // Build command
  let command = 'npx playwright test'
  if (testFile) command += ` ${testFile}`
  if (project) command += ` --project=${project}`
  if (grep) command += ` --grep="${grep}"`
  if (workers) command += ` --workers=${workers}`
  if (reporter) command += ` --reporter=${reporter}`
  else command += ' --reporter=json,line' // Default reporters

  const jobId = Date.now().toString()

  // Reset state
  latestResults = {
    status: 'running',
    jobId,
    startTime: new Date().toISOString(),
    endTime: null,
    results: null,
    stdout: '',
    stderr: '',
    error: null,
    command
  }

  console.log(`[${jobId}] Starting Playwright tests: ${command}`)

  // Execute asynchronously
  exec(command, { cwd: __dirname, maxBuffer: 10 * 1024 * 1024 }, async (error, stdout, stderr) => {
    latestResults.endTime = new Date().toISOString()
    latestResults.stdout = stdout
    latestResults.stderr = stderr

    if (error && error.code !== 1) {
      // Code 1 is expected when tests fail
      latestResults.status = 'error'
      latestResults.error = error.message
      console.error(`[${jobId}] Execution error:`, error.message)
    } else {
      latestResults.status = 'completed'
      latestResults.results = parsePlaywrightResults(stdout)
      console.log(`[${jobId}] Tests completed`)
    }

    // Attach screenshots and error contexts
    latestResults.screenshots = await getScreenshots()
    latestResults.errorContexts = await getErrorContexts()
  })

  res.json({
    message: 'Playwright tests started',
    jobId,
    command,
    statusUrl: '/api/playwright/status',
    resultsUrl: '/api/playwright/results'
  })
})

/**
 * GET /api/playwright/status
 * Get current test execution status
 */
app.get('/api/playwright/status', (req, res) => {
  res.json({
    status: latestResults.status,
    jobId: latestResults.jobId,
    startTime: latestResults.startTime,
    endTime: latestResults.endTime,
    command: latestResults.command
  })
})

/**
 * GET /api/playwright/results
 * Get detailed test results with analysis
 */
app.get('/api/playwright/results', async (req, res) => {
  if (latestResults.status === 'idle') {
    return res.status(404).json({
      error: 'No tests have been run yet',
      message: 'Use POST /api/playwright/run to execute tests'
    })
  }

  if (latestResults.status === 'running') {
    return res.status(202).json({
      message: 'Tests are still running',
      jobId: latestResults.jobId,
      startTime: latestResults.startTime
    })
  }

  const analysis = analyzeResults(latestResults.results)

  res.json({
    jobId: latestResults.jobId,
    status: latestResults.status,
    startTime: latestResults.startTime,
    endTime: latestResults.endTime,
    duration: latestResults.endTime
      ? new Date(latestResults.endTime) - new Date(latestResults.startTime)
      : null,
    results: latestResults.results,
    analysis,
    screenshots: latestResults.screenshots?.map(s => ({ test: s.test, file: s.file })),
    errorContexts: latestResults.errorContexts?.map(e => ({ test: e.test, preview: e.content.substring(0, 200) })),
    stdout: latestResults.stdout,
    stderr: latestResults.stderr,
    error: latestResults.error
  })
})

/**
 * GET /api/playwright/screenshot/:test/:file
 * Get specific screenshot file
 */
app.get('/api/playwright/screenshot/:test/:file', async (req, res) => {
  try {
    const { test, file } = req.params
    const filePath = path.join(__dirname, 'test-results', test, file)

    await fs.access(filePath)
    res.sendFile(filePath)
  } catch (error) {
    res.status(404).json({ error: 'Screenshot not found' })
  }
})

/**
 * GET /api/playwright/error-context/:test
 * Get error context for specific test
 */
app.get('/api/playwright/error-context/:test', async (req, res) => {
  try {
    const { test } = req.params
    const filePath = path.join(__dirname, 'test-results', test, 'error-context.md')

    const content = await fs.readFile(filePath, 'utf-8')
    res.json({ test, content })
  } catch (error) {
    res.status(404).json({ error: 'Error context not found' })
  }
})

/**
 * POST /api/playwright/generate-tests
 * Save BMAD-generated test code to file system
 */
app.post('/api/playwright/generate-tests', async (req, res) => {
  try {
    const { testCode, fileName, overwrite } = req.body

    if (!testCode || !fileName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both testCode and fileName are required'
      })
    }

    const filePath = path.join(__dirname, 'e2e', fileName)

    // Check if file exists
    try {
      await fs.access(filePath)
      if (!overwrite) {
        return res.status(409).json({
          error: 'File already exists',
          message: 'Set overwrite: true to replace existing file',
          path: filePath
        })
      }
    } catch {
      // File doesn't exist, proceed
    }

    await fs.writeFile(filePath, testCode, 'utf-8')

    console.log(`Test file saved: ${filePath}`)

    res.json({
      message: 'Test file created successfully',
      path: filePath,
      fileName
    })
  } catch (error) {
    console.error('Error saving test file:', error)
    res.status(500).json({
      error: 'Failed to save test file',
      message: error.message
    })
  }
})

/**
 * GET /api/playwright/list-tests
 * List all test files in e2e directory
 */
app.get('/api/playwright/list-tests', async (req, res) => {
  try {
    const e2eDir = path.join(__dirname, 'e2e')
    const files = await fs.readdir(e2eDir)

    const testFiles = files.filter(file => file.endsWith('.spec.ts') || file.endsWith('.spec.js'))

    res.json({
      directory: e2eDir,
      testFiles,
      count: testFiles.length
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list test files',
      message: error.message
    })
  }
})

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Playwright API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🎭 Playwright API Server running on http://localhost:${PORT}`)
  console.log(`\nAvailable endpoints:`)
  console.log(`  POST   /api/playwright/run             - Execute tests`)
  console.log(`  GET    /api/playwright/status          - Check test status`)
  console.log(`  GET    /api/playwright/results         - Get detailed results`)
  console.log(`  POST   /api/playwright/generate-tests  - Save test code`)
  console.log(`  GET    /api/playwright/list-tests      - List all tests`)
  console.log(`  GET    /health                         - Health check`)
  console.log(`\nReady for BMAD autonomous test execution!\n`)
})
