#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 *
 * Checks Next.js bundle sizes after build and alerts if they exceed thresholds.
 *
 * Usage:
 *   node scripts/check-bundle-size.js
 *   node scripts/check-bundle-size.js --all
 *
 * Exit codes:
 *   0 - All bundle sizes are within limits
 *   1 - One or more bundles exceed size limits (or assets missing)
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Bundle size limits (in kB (decimal), gzipped) to match Next.js build output.
const LIMITS = {
  homepage: 350, // Homepage first load JS
  framework: 200, // React/Next.js framework bundle
  adminPages: 280, // Admin pages first load
  otherPages: 300, // All other pages first load
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const nextDir = path.join(process.cwd(), '.next')
const sizeCacheKB = new Map()

let hasFailures = false

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
}

function resolveNextAssetPath(assetPath) {
  if (typeof assetPath !== 'string' || assetPath.length === 0) return null

  let normalized = assetPath
  if (normalized.startsWith('/_next/')) normalized = normalized.slice('/_next/'.length)
  if (normalized.startsWith('/')) normalized = normalized.slice(1)

  return path.join(nextDir, normalized)
}

function gzipSizeKBForAsset(assetPath) {
  const resolvedPath = resolveNextAssetPath(assetPath)
  if (!resolvedPath) return 0

  if (sizeCacheKB.has(resolvedPath)) return sizeCacheKB.get(resolvedPath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Missing build asset: ${assetPath}`)
  }

  const bytes = fs.readFileSync(resolvedPath)
  const gzipBytes = zlib.gzipSync(bytes).length
  const kb = gzipBytes / 1000

  sizeCacheKB.set(resolvedPath, kb)
  return kb
}

function sumGzipSizeKB(assets) {
  return assets.reduce((total, asset) => total + gzipSizeKBForAsset(asset), 0)
}

function appRouteToManifestKey(routePath) {
  if (routePath === '/') return '/page'
  if (routePath.endsWith('/')) return `${routePath.slice(0, -1)}/page`
  return `${routePath}/page`
}

function formatSize(kb) {
  if (kb < 1) return `${Math.round(kb * 1000)} B`
  return `${kb.toFixed(0)} kB`
}

function checkLimit(label, sizeKB, limitKB) {
  const percentage = (sizeKB / limitKB) * 100

  if (sizeKB <= limitKB) {
    console.log(
      `    ${colors.green}PASS${colors.reset} - ${percentage.toFixed(1)}% of limit (${limitKB} kB)`
    )
    return 'pass'
  }

  if (sizeKB <= limitKB * 1.1) {
    console.log(
      `    ${colors.yellow}WARN${colors.reset} - ${percentage.toFixed(1)}% of limit (${limitKB} kB)`
    )
    return 'warn'
  }

  console.log(
    `    ${colors.red}FAIL${colors.reset} - ${percentage.toFixed(1)}% of limit (${limitKB} kB)`
  )
  hasFailures = true
  return 'fail'
}

function printHeader() {
  const line = '='.repeat(60)
  console.log(`\n${colors.cyan}${line}${colors.reset}`)
  console.log(`${colors.cyan}          PDFLAB BUNDLE SIZE REPORT${colors.reset}`)
  console.log(`${colors.cyan}${line}${colors.reset}\n`)
}

function findFirst(assets, predicate) {
  for (const asset of assets) {
    if (predicate(asset)) return asset
  }
  return null
}

function reportFrameworkSize(appManifest) {
  const homepageAssets = appManifest?.pages?.['/page'] || []
  const frameworkAsset = findFirst(homepageAssets, (asset) =>
    asset.includes('static/chunks/framework-')
  )

  if (!frameworkAsset) {
    console.log(
      `${colors.yellow}Warning:${colors.reset} framework chunk not found in app manifest.\n`
    )
    hasFailures = true
    return
  }

  const frameworkSizeKB = gzipSizeKBForAsset(frameworkAsset)
  console.log(`${colors.blue}Framework Bundle:${colors.reset}`)
  console.log(`  Size: ${formatSize(frameworkSizeKB)}`)
  checkLimit('framework', frameworkSizeKB, LIMITS.framework)
  console.log('')
}

function reportRouteSize(appManifest, routePath, displayName, limitKB) {
  const key = appRouteToManifestKey(routePath)
  const assets = appManifest?.pages?.[key]

  if (!assets) {
    console.log(
      `${colors.yellow}Warning:${colors.reset} Route not found in app manifest: ${routePath} (${key})\n`
    )
    hasFailures = true
    return
  }

  const jsAssets = assets.filter((asset) => asset.endsWith('.js'))
  const routeSizeKB = sumGzipSizeKB(jsAssets)

  console.log(`  ${displayName} (${routePath}):`)
  console.log(`    First Load JS: ${formatSize(routeSizeKB)}`)
  checkLimit(displayName, routeSizeKB, limitKB)
  console.log('')
}

function reportAllRoutes(appManifest) {
  const pages = appManifest?.pages || {}
  const routes = Object.entries(pages)
    .filter(([key]) => key === '/page' || key.endsWith('/page'))
    .map(([key, assets]) => {
      const routePath = key === '/page' ? '/' : key.replace(/\/page$/, '')
      const jsAssets = (assets || []).filter((asset) => asset.endsWith('.js'))
      const kb = sumGzipSizeKB(jsAssets)
      return { routePath, kb }
    })
    .sort((a, b) => b.kb - a.kb)

  console.log(`${colors.blue}All Routes (sorted):${colors.reset}`)
  for (const route of routes) {
    console.log(`  ${route.routePath.padEnd(30)} ${formatSize(route.kb)}`)
  }
  console.log('')
}

function parseNextBuildStats() {
  const args = new Set(process.argv.slice(2))
  const appBuildManifestPath = path.join(nextDir, 'app-build-manifest.json')

  if (!fs.existsSync(appBuildManifestPath)) {
    console.error(
      `${colors.red}Error:${colors.reset} '${appBuildManifestPath}' not found. Run 'npm run build' first.`
    )
    process.exit(1)
  }

  const appManifest = readJson(appBuildManifestPath)

  printHeader()
  reportFrameworkSize(appManifest)

  console.log(`${colors.blue}Page Routes:${colors.reset}\n`)
  reportRouteSize(appManifest, '/', 'Homepage', LIMITS.homepage)
  reportRouteSize(appManifest, '/admin', 'Admin Dashboard', LIMITS.adminPages)
  reportRouteSize(appManifest, '/dashboard', 'User Dashboard', LIMITS.otherPages)
  reportRouteSize(appManifest, '/pricing', 'Pricing Page', LIMITS.otherPages)

  if (args.has('--all')) {
    reportAllRoutes(appManifest)
  }
}

try {
  parseNextBuildStats()

  const summaryColor = hasFailures ? colors.red : colors.green
  const summaryText = hasFailures ? 'Bundle size check failed.' : 'Bundle size check passed.'

  console.log(`${summaryColor}${summaryText}${colors.reset}\n`)
  console.log(`${colors.cyan}Recommendations:${colors.reset}`)
  console.log(`  - Keep homepage under ${LIMITS.homepage} kB (gzip)`)
  console.log('  - Use dynamic imports for heavy components')
  console.log('  - Monitor bundle size on each build')
  console.log("  - Run 'npm run build:analyze' for detailed analysis\n")

  process.exit(hasFailures ? 1 : 0)
} catch (error) {
  console.error(`${colors.red}Error checking bundle sizes:${colors.reset}`, error.message)
  process.exit(1)
}
