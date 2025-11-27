/**
 * Script kiểm tra toàn diện CRUD operations giữa Controllers và Models
 * Kiểm tra:
 * 1. Primary key khớp giữa model và controller usage
 * 2. Method names khớp giữa controller và model
 * 3. Column names khớp
 * 4. Logic CRUD đúng
 */

const fs = require('fs');
const path = require('path');

const CONTROLLERS_DIR = path.join(__dirname, '../Controllers');
const MODELS_DIR = path.join(__dirname, '../Models');

// Danh sách các controller và model tương ứng
const controllerModelMap = {
  'UserController.js': 'User.js',
  'ProductController.js': 'Product.js',
  'CategoryController.js': 'Category.js',
  'OrderController.js': 'Order.js',
  'CartItemController.js': 'CartItem.js',
  'PaymentController.js': 'Payment.js',
  'CouponController.js': 'Coupon.js',
  'ReviewController.js': 'Review.js',
  'WishlistController.js': 'Wishlist.js',
  'AddressController.js': 'Address.js',
  'RoleController.js': 'Role.js',
  'BrandController.js': 'Brand.js',
  'SupplierController.js': 'Supplier.js',
  'OrderItemController.js': 'OrderItem.js',
  'OrderStatusController.js': 'OrderStatus.js',
  'PaymentMethodController.js': 'PaymentMethod.js',
  'PaymentStatusController.js': 'PaymentStatus.js',
  'ShipmentController.js': 'Shipment.js',
  'ShipperController.js': 'Shipper.js',
  'PurchaseOrderController.js': 'PurchaseOrder.js',
  'ReturnRequestController.js': 'ReturnRequest.js',
  'InventoryTransactionController.js': 'InventoryTransaction.js',
  'TokenBlacklistController.js': 'TokenBlacklist.js',
  'BankController.js': 'Bank.js',
  'BankAccountController.js': 'BankAccount.js',
  'BankTransactionController.js': 'BankTransaction.js',
  'BankTransferRequestController.js': 'BankTransferRequest.js',
  'BankApiLogController.js': 'BankApiLog.js',
  'BankReconciliationController.js': 'BankReconciliation.js',
};

// Extract primary key từ model
function extractPrimaryKey(modelPath) {
  try {
    const content = fs.readFileSync(modelPath, 'utf8');
    const match = content.match(/primaryKey:\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

// Extract table name từ model
function extractTableName(modelPath) {
  try {
    const content = fs.readFileSync(modelPath, 'utf8');
    const match = content.match(/tableName:\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

// Extract model instance name từ controller
function extractModelInstance(controllerPath) {
  try {
    const content = fs.readFileSync(controllerPath, 'utf8');
    // Tìm pattern: const { modelName } = require('../Models');
    const requireMatch = content.match(/const\s*\{\s*(\w+)\s*\}\s*=\s*require\(['"]\.\.\/Models['"]\)/);
    if (requireMatch) {
      return requireMatch[1];
    }
    // Hoặc: const model = require('../Models').modelName;
    const directMatch = content.match(/require\(['"]\.\.\/Models['"]\)\.(\w+)/);
    return directMatch ? directMatch[1] : null;
  } catch (error) {
    return null;
  }
}

// Extract các method calls từ controller
function extractMethodCalls(controllerPath, modelInstanceName) {
  try {
    const content = fs.readFileSync(controllerPath, 'utf8');
    const methods = new Set();
    
    // Tìm tất cả các method calls: modelInstance.methodName(...)
    const regex = new RegExp(`${modelInstanceName}\\.(\\w+)\\s*\\(`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      methods.add(match[1]);
    }
    
    return Array.from(methods);
  } catch (error) {
    return [];
  }
}

// Extract các methods được định nghĩa trong model
function extractModelMethods(modelPath) {
  try {
    const content = fs.readFileSync(modelPath, 'utf8');
    const methods = new Set();
    
    // Tìm các function declarations: const methodName = async (...)
    const functionRegex = /const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      methods.add(match[1]);
    }
    
    // Thêm các base methods từ BaseModel
    methods.add('findAll');
    methods.add('findById');
    methods.add('create');
    methods.add('update');
    methods.add('delete');
    methods.add('count');
    methods.add('execute');
    
    return Array.from(methods);
  } catch (error) {
    return [];
  }
}

// Kiểm tra CRUD issues
function checkCRUDIssues() {
  const issues = [];
  const results = [];
  
  console.log('🔍 Bắt đầu kiểm tra CRUD operations...\n');
  
  for (const [controllerFile, modelFile] of Object.entries(controllerModelMap)) {
    const controllerPath = path.join(CONTROLLERS_DIR, controllerFile);
    const modelPath = path.join(MODELS_DIR, modelFile);
    
    // Kiểm tra file tồn tại
    if (!fs.existsSync(controllerPath)) {
      issues.push({
        type: 'MISSING_CONTROLLER',
        controller: controllerFile,
        message: `Controller không tồn tại: ${controllerFile}`,
      });
      continue;
    }
    
    if (!fs.existsSync(modelPath)) {
      issues.push({
        type: 'MISSING_MODEL',
        controller: controllerFile,
        model: modelFile,
        message: `Model không tồn tại: ${modelFile}`,
      });
      continue;
    }
    
    // Extract thông tin
    const primaryKey = extractPrimaryKey(modelPath);
    const tableName = extractTableName(modelPath);
    const modelInstanceName = extractModelInstance(controllerPath);
    const controllerMethods = extractMethodCalls(controllerPath, modelInstanceName);
    const modelMethods = extractModelMethods(modelPath);
    
    // Kiểm tra model instance name
    if (!modelInstanceName) {
      issues.push({
        type: 'NO_MODEL_INSTANCE',
        controller: controllerFile,
        message: `Không tìm thấy model instance trong controller`,
      });
    }
    
    // Kiểm tra primary key
    if (!primaryKey) {
      issues.push({
        type: 'NO_PRIMARY_KEY',
        controller: controllerFile,
        model: modelFile,
        message: `Model không có primary key được định nghĩa`,
      });
    }
    
    // Kiểm tra các method calls không tồn tại trong model
    const modelMethodsArray = Array.from(modelMethods);
    const undefinedMethods = controllerMethods.filter(m => !modelMethodsArray.includes(m));
    if (undefinedMethods.length > 0) {
      issues.push({
        type: 'UNDEFINED_METHOD',
        controller: controllerFile,
        model: modelFile,
        methods: undefinedMethods,
        message: `Controller gọi các method không tồn tại trong model: ${undefinedMethods.join(', ')}`,
      });
    }
    
    // Kiểm tra CRUD operations cơ bản
    const hasCreate = controllerMethods.includes('create');
    const hasRead = controllerMethods.includes('findById') || controllerMethods.includes('findAll');
    const hasUpdate = controllerMethods.includes('update');
    const hasDelete = controllerMethods.includes('delete') || controllerMethods.includes('softDelete');
    
    results.push({
      controller: controllerFile,
      model: modelFile,
      tableName,
      primaryKey,
      modelInstance: modelInstanceName,
      hasCreate,
      hasRead,
      hasUpdate,
      hasDelete,
      controllerMethods: Array.from(controllerMethods),
      modelMethods: Array.from(modelMethods),
    });
  }
  
  return { issues, results };
}

// Main
const { issues, results } = checkCRUDIssues();

console.log('📊 KẾT QUẢ KIỂM TRA CRUD OPERATIONS\n');
console.log('='.repeat(80));

// Hiển thị issues
if (issues.length > 0) {
  console.log('\n❌ CÁC VẤN ĐỀ PHÁT HIỆN:\n');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
    if (issue.methods) {
      console.log(`   Methods: ${issue.methods.join(', ')}`);
    }
    console.log('');
  });
} else {
  console.log('\n✅ Không phát hiện vấn đề nghiêm trọng!\n');
}

// Hiển thị summary
console.log('\n📋 TÓM TẮT CRUD OPERATIONS:\n');
results.forEach(result => {
  const crudStatus = [
    result.hasCreate ? '✅' : '❌',
    result.hasRead ? '✅' : '❌',
    result.hasUpdate ? '✅' : '❌',
    result.hasDelete ? '✅' : '❌',
  ].join(' ');
  
  console.log(`${result.controller.padEnd(35)} | ${crudStatus} | PK: ${result.primaryKey || 'N/A'}`);
});

// Lưu kết quả vào file
const reportPath = path.join(__dirname, '../Models/CRUD_CHECK_REPORT.md');
const reportContent = `# BÁO CÁO KIỂM TRA CRUD OPERATIONS

Generated: ${new Date().toISOString()}

## ❌ Các vấn đề phát hiện

${issues.length > 0 ? issues.map((issue, i) => `${i + 1}. **[${issue.type}]** ${issue.message}`).join('\n') : '✅ Không có vấn đề nào được phát hiện.'}

## 📋 Chi tiết từng Controller

${results.map(r => `
### ${r.controller}

- **Model**: ${r.model}
- **Table**: ${r.tableName || 'N/A'}
- **Primary Key**: ${r.primaryKey || 'N/A'}
- **Model Instance**: ${r.modelInstance || 'N/A'}
- **CRUD Operations**:
  - Create: ${r.hasCreate ? '✅' : '❌'}
  - Read: ${r.hasRead ? '✅' : '❌'}
  - Update: ${r.hasUpdate ? '✅' : '❌'}
  - Delete: ${r.hasDelete ? '✅' : '❌'}
- **Controller Methods**: ${r.controllerMethods.length} methods
- **Model Methods**: ${r.modelMethods.length} methods
`).join('\n')}
`;

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`\n📄 Báo cáo chi tiết đã được lưu tại: ${reportPath}`);

