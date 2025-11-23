const fs = require('fs');
const path = require('path');
const glob = require('glob');

let replacements = 0;
let filesModified = 0;

// Find all TypeScript files in src directory
const files = glob.sync('src/**/*.ts', { cwd: __dirname });

console.log(`Found ${files.length} TypeScript files to process...\n`);

// Files to skip (already done)
const skipFiles = [
  'src/config/logger.ts',
  'src/config/database.ts',
  'src/config/redis.ts',
  'src/middleware/request-id.middleware.ts',
  'src/middleware/http-logger.middleware.ts',
  'src/server.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);

  // Skip already processed files
  if (skipFiles.includes(file.replace(/\\/g, '/'))) {
    console.log(`⏭️  Skipping (already processed): ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileReplacements = 0;

  // Check if file already imports logger
  const hasLoggerImport = content.includes("import logger from");

  // Count console.* occurrences
  const consoleMatches = content.match(/console\.(log|error|warn|debug|info)/g);
  if (!consoleMatches || consoleMatches.length === 0) {
    return; // Skip files with no console statements
  }

  // Add logger import if not present
  if (!hasLoggerImport) {
    // Find the last import statement
    const importLines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ') && !importLines[i].includes('type')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      // Calculate relative path to logger
      const depth = (file.match(/\//g) || []).length - 1; // src/ is base
      const relativePath = '../'.repeat(depth) + 'config/logger';

      importLines.splice(lastImportIndex + 1, 0, `import logger from '${relativePath}'`);
      content = importLines.join('\n');
    }
  }

  // Replace console.error with logger.error
  content = content.replace(/console\.error\((.*?)\)/g, (match, args) => {
    fileReplacements++;
    // Simple string messages
    if (args.match(/^['"`][^'"`,]+['"`]$/)) {
      return `logger.error(${args})`;
    }
    // Messages with variables
    if (args.includes(',')) {
      const parts = args.split(',').map(p => p.trim());
      const message = parts[0];
      const restArgs = parts.slice(1);

      // Check if it's error object
      if (restArgs[0] && (restArgs[0].includes('error') || restArgs[0] === 'err')) {
        const errorVar = restArgs[0];
        return `logger.error(${message}, { error: ${errorVar} instanceof Error ? ${errorVar}.message : String(${errorVar}) })`;
      }

      // Multiple args - create context object
      return `logger.error(${message}, { ${restArgs.join(', ')} })`;
    }
    return `logger.error(${args})`;
  });

  // Replace console.log with logger.info
  content = content.replace(/console\.log\((.*?)\)/g, (match, args) => {
    fileReplacements++;
    if (args.match(/^['"`][^'"`,]+['"`]$/)) {
      return `logger.info(${args})`;
    }
    if (args.includes(',')) {
      const parts = args.split(',').map(p => p.trim());
      const message = parts[0];
      const restArgs = parts.slice(1);
      return `logger.info(${message}, { ${restArgs.join(', ')} })`;
    }
    return `logger.info(${args})`;
  });

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\((.*?)\)/g, (match, args) => {
    fileReplacements++;
    if (args.match(/^['"`][^'"`,]+['"`]$/)) {
      return `logger.warn(${args})`;
    }
    if (args.includes(',')) {
      const parts = args.split(',').map(p => p.trim());
      const message = parts[0];
      const restArgs = parts.slice(1);
      return `logger.warn(${message}, { ${restArgs.join(', ')} })`;
    }
    return `logger.warn(${args})`;
  });

  // Replace console.debug with logger.debug
  content = content.replace(/console\.debug\((.*?)\)/g, (match, args) => {
    fileReplacements++;
    if (args.match(/^['"`][^'"`,]+['"`]$/)) {
      return `logger.debug(${args})`;
    }
    if (args.includes(',')) {
      const parts = args.split(',').map(p => p.trim());
      const message = parts[0];
      const restArgs = parts.slice(1);
      return `logger.debug(${message}, { ${restArgs.join(', ')} })`;
    }
    return `logger.debug(${args})`;
  });

  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    replacements += fileReplacements;
    console.log(`✅ ${file}: ${fileReplacements} replacements`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${replacements}`);
console.log(`\n✨ All console.* statements replaced with logger.*`);
