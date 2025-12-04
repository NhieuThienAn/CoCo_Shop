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

function removeComments(content) {
  let result = content;

  // Remove all separator comments (====)
  result = result.replace(/^(\s*)\/\/\s*=+.*$/gm, '');
  
  // Remove header comments
  result = result.replace(/^(\s*)\/\/\s*[A-Z\s\/]+$/gm, '');
  
  // Remove Vietnamese comments and explanatory comments
  result = result.replace(/\/\/\s*[A-Za-zÀ-ỹ\s:,-]+$/gm, '');
  result = result.replace(/^(\s*)\/\/\s*[A-Za-zÀ-ỹ\s:,-]+$/gm, '');
  
  // Remove inline comments that are just explanations
  result = result.replace(/\/\/\s*(Import|Tạo|Kiểm tra|Extract|Duyệt|Parse|Map|Tìm|Sử dụng|Giúp|Chỉ|Nếu|Khi|Lấy|Tính|Xóa|Cập nhật|Thêm|Trả về|Log|Xây dựng|Thực thi|Bắt đầu|Kết thúc|Bước|Step|Validate|Fetch|Enrich|Populate|Merge|Process|Handle|Execute|Get|Set|Create|Update|Delete|Find|Check|Build).*$/gm, '');
  
  // Remove step comments
  result = result.replace(/\/\/\s*(BƯỚC|Bước|Step|TODO|FIXME|NOTE|WARNING|IMPORTANT|ERROR).*$/gm, '');
  
  // Remove multi-line block comments (/* */) except JSDoc
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Keep JSDoc comments (have @tags)
    if (match.includes('@param') || match.includes('@returns') || match.includes('@description') || match.includes('@example') || match.includes('@throws') || match.includes('@typedef') || match.includes('@type')) {
      return match;
    }
    return '';
  });

  // Clean up multiple empty lines (max 2 consecutive)
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // Clean up trailing whitespace on empty lines
  result = result.replace(/^\s+$/gm, '');

  return result.trim() + '\n';
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeComments(content);
    
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

console.log('🧹 Starting to remove comments from backend files...\n');

directories.forEach(dir => {
  processDirectory(dir);
});

console.log('\n✅ Done!');

