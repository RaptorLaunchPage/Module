#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Starting comprehensive auth import fixes...');

// Define the patterns to replace
const replacements = [
  {
    // Replace useAuthV2 imports with useAuthFixed
    pattern: /import\s*{\s*useAuthV2\s+as\s+useAuth\s*}\s*from\s*['"]@\/hooks\/use-auth-v2['"]/g,
    replacement: `import { useAuthFixed as useAuth } from '@/hooks/use-auth-fixed'`
  },
  {
    // Replace direct useAuthV2 imports
    pattern: /import\s*{\s*useAuthV2\s*}\s*from\s*['"]@\/hooks\/use-auth-v2['"]/g,
    replacement: `import { useAuthFixed } from '@/hooks/use-auth-fixed'`
  },
  {
    // Replace old useAuth imports
    pattern: /import\s*{\s*useAuth\s*}\s*from\s*['"]@\/hooks\/useAuth['"]/g,
    replacement: `import { useAuthFixed as useAuth } from '@/hooks/use-auth-fixed'`
  },
  {
    // Replace AuthProviderV2 imports
    pattern: /import\s*{\s*AuthProviderV2\s*}\s*from\s*['"]@\/hooks\/use-auth-v2['"]/g,
    replacement: `import { AuthProvider } from '@/hooks/use-auth-fixed'`
  },
  {
    // Replace AuthProviderV2 usage
    pattern: /<AuthProviderV2>/g,
    replacement: '<AuthProvider>'
  },
  {
    // Replace closing AuthProviderV2 tags
    pattern: /<\/AuthProviderV2>/g,
    replacement: '</AuthProvider>'
  }
];

// Files to exclude from processing
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/scripts/**',
  '**/hooks/use-auth.tsx',
  '**/hooks/use-auth-v2.tsx',
  '**/hooks/use-auth-fixed.tsx',
  '**/hooks/useAuth.ts',
  '**/.git/**'
];

// Find all TypeScript and JavaScript files
const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
  ignore: excludePatterns,
  cwd: process.cwd()
});

console.log(`📁 Found ${files.length} files to process`);

let totalReplacements = 0;
let filesModified = 0;

files.forEach(file => {
  const filePath = path.resolve(file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let fileReplacements = 0;

    // Apply all replacements
    replacements.forEach(({ pattern, replacement }) => {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        modifiedContent = modifiedContent.replace(pattern, replacement);
        fileReplacements += matches.length;
      }
    });

    // Write back if changes were made
    if (fileReplacements > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ ${file}: ${fileReplacements} replacements`);
      filesModified++;
      totalReplacements += fileReplacements;
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log(`\n🎉 Auth import fixes completed!`);
console.log(`📊 Summary:`);
console.log(`   - Files processed: ${files.length}`);
console.log(`   - Files modified: ${filesModified}`);
console.log(`   - Total replacements: ${totalReplacements}`);

// Additional manual fixes needed
console.log(`\n⚠️  Manual fixes still needed:`);
console.log(`   1. Check any custom auth method calls for compatibility`);
console.log(`   2. Verify role-based access control still works`);
console.log(`   3. Test all auth flows after changes`);
console.log(`   4. Run 'pnpm build' to check for compilation errors`);

process.exit(0);