const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, '../Controllers'),
  path.join(__dirname, '../Models'),
  path.join(__dirname, '../Routes'),
  path.join(__dirname, '../Middlewares'),
  path.join(__dirname, '../Services'),
  path.join(__dirname, '../Utils'),
];

function removeAllComments(content) {
  let lines = content.split('\n');
  let result = [];
  let inJSDoc = false;
  let jsdocBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if we're starting a JSDoc comment
    if (trimmed.startsWith('/**')) {
      inJSDoc = true;
      jsdocBuffer = [line];
      continue;
    }

    // If we're in a JSDoc block, collect lines until it ends
    if (inJSDoc) {
      jsdocBuffer.push(line);
      if (trimmed.endsWith('*/')) {
        // Keep JSDoc comments
        result.push(...jsdocBuffer);
        result.push('');
        inJSDoc = false;
        jsdocBuffer = [];
      }
      continue;
    }

    // Remove single-line comments (//)
    if (trimmed.startsWith('//')) {
      continue; // Skip this line
    }

    // Remove inline comments (but keep the code part)
    if (line.includes('//')) {
      const codePart = line.split('//')[0].trimEnd();
      if (codePart) {
        result.push(codePart);
      }
      continue;
    }

    // Keep the line as is
    result.push(line);
  }

  // Clean up multiple empty lines (max 2 consecutive)
  let cleaned = result.join('\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim() + '\n';
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeAllComments(content);
    
    if (content !== cleaned) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`✅ Cleaned: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      processFile(filePath);
    }
  });
}

console.log('🧹 Starting to remove ALL comments (keeping JSDoc only)...\n');

directories.forEach(dir => {
  processDirectory(dir);
});

console.log('\n✅ Done!');

