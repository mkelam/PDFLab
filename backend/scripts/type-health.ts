import * as fs from 'fs'
import * as path from 'path'

interface TypeHealthReport {
  totalFiles: number
  filesWithAny: number
  filesWithTsIgnore: number
  filesWithTsExpectError: number
  filesWithNonNullAssertions: number
  healthScore: number
}

function analyzeTypeHealth(srcDir: string): TypeHealthReport {
  const report: TypeHealthReport = {
    totalFiles: 0,
    filesWithAny: 0,
    filesWithTsIgnore: 0,
    filesWithTsExpectError: 0,
    filesWithNonNullAssertions: 0,
    healthScore: 100
  }

  function scanDirectory(dir: string): void {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        report.totalFiles++
        const content = fs.readFileSync(filePath, 'utf-8')

        if (content.includes(': any') || content.includes('<any>') || content.includes('as any')) {
          report.filesWithAny++
        }
        if (content.includes('@ts-ignore')) {
          report.filesWithTsIgnore++
        }
        if (content.includes('@ts-expect-error')) {
          report.filesWithTsExpectError++
        }
        if (content.match(/\w+!/g)) {
          // Non-null assertions
          report.filesWithNonNullAssertions++
        }
      }
    }
  }

  scanDirectory(srcDir)

  // Calculate health score (0-100)
  const penalties =
    report.filesWithAny * 10 +
    report.filesWithTsIgnore * 20 +
    report.filesWithTsExpectError * 15 +
    report.filesWithNonNullAssertions * 5

  report.healthScore = Math.max(0, 100 - penalties / report.totalFiles)

  return report
}

// Run the analysis
const report = analyzeTypeHealth(path.join(__dirname, '../src'))

console.log('\n📊 TypeScript Health Report')
console.log('═'.repeat(50))
console.log(`Total TypeScript files: ${report.totalFiles}`)
console.log(`Files with 'any': ${report.filesWithAny}`)
console.log(`Files with @ts-ignore: ${report.filesWithTsIgnore}`)
console.log(`Files with @ts-expect-error: ${report.filesWithTsExpectError}`)
console.log(`Files with non-null assertions: ${report.filesWithNonNullAssertions}`)
console.log(`\n🏥 Health Score: ${report.healthScore.toFixed(2)}/100`)

if (report.healthScore < 80) {
  console.log('\n⚠️  Type health is below 80. Consider refactoring.')
  process.exit(1)
}

console.log('\n✅ Type health is good!')
