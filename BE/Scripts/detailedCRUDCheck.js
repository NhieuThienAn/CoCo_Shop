/**
 * Script kiểm tra chi tiết CRUD operations giữa Controllers và Models
 * Kiểm tra từng controller một cách kỹ lưỡng
 */

const fs = require('fs');
const path = require('path');

const CONTROLLERS_DIR = path.join(__dirname, '../Controllers');
const MODELS_DIR = path.join(__dirname, '../Models');

// Map controller -> model
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

// Extract model instance name từ controller
function extractModelInstance(controllerPath) {
  try {
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    // Pattern 1: const { modelName } = require('../Models');
    const requireMatch = content.match(/const\s*\{\s*(\w+)\s*\}\s*=\s*require\(['"]\.\.\/Models['"]\)/);
    if (requireMatch) {
      return requireMatch[1];
    }
    
    // Pattern 2: require('../Models').modelName
    const directMatch = content.match(/require\(['"]\.\.\/Models['"]\)\.(\w+)/);
    if (directMatch) {
      return directMatch[1];
    }
    
    // Pattern 3: const model = require('../Models').modelName
    const constMatch = content.match(/const\s+\w+\s*=\s*require\(['"]\.\.\/Models['"]\)\.(\w+)/);
    if (constMatch) {
      return constMatch[1];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Extract tất cả method calls từ controller
function extractMethodCalls(controllerPath, modelInstanceName) {
  try {
    const content = fs.readFileSync(controllerPath, 'utf8');
    const methods = new Set();
    
    if (!modelInstanceName) {
      return [];
    }
    
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

// Extract tất cả methods được export từ model
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
    methods.add('rawQuery');
    
    // Tìm trong return statement
    const returnMatch = content.match(/return\s*\{[\s\S]*?\}/);
    if (returnMatch) {
      const returnContent = returnMatch[0];
      const returnMethods = returnContent.match(/(\w+)(?:\s*:\s*\w+)?(?:\s*,|\s*})/g);
      if (returnMethods) {
        returnMethods.forEach(m => {
          const methodName = m.replace(/[:\s,}]/g, '').trim();
          if (methodName && methodName !== 'baseModel' && methodName !== '...baseModel') {
            methods.add(methodName);
          }
        });
      }
    }
    
    return Array.from(methods);
  } catch (error) {
    return [];
  }
}

// Main check function
function detailedCheck() {
  const results = [];
  const issues = [];
  
  console.log('🔍 Bắt đầu kiểm tra chi tiết CRUD operations...\n');
  
  for (const [controllerFile, modelFile] of Object.entries(controllerModelMap)) {
    const controllerPath = path.join(CONTROLLERS_DIR, controllerFile);
    const modelPath = path.join(MODELS_DIR, modelFile);
    
    if (!fs.existsSync(controllerPath)) {
      issues.push({
        controller: controllerFile,
        type: 'MISSING_CONTROLLER',
        message: `Controller không tồn tại: ${controllerFile}`
      });
      continue;
    }
    
    if (!fs.existsSync(modelPath)) {
      issues.push({
        controller: controllerFile,
        model: modelFile,
        type: 'MISSING_MODEL',
        message: `Model không tồn tại: ${modelFile}`
      });
      continue;
    }
    
    const modelInstanceName = extractModelInstance(controllerPath);
    const controllerMethods = extractMethodCalls(controllerPath, modelInstanceName);
    const modelMethods = extractModelMethods(modelPath);
    
    // Kiểm tra methods không tồn tại
    const undefinedMethods = controllerMethods.filter(m => !modelMethods.includes(m));
    
    if (undefinedMethods.length > 0) {
      issues.push({
        controller: controllerFile,
        model: modelFile,
        modelInstance: modelInstanceName,
        type: 'UNDEFINED_METHOD',
        methods: undefinedMethods,
        message: `Controller gọi các method không tồn tại: ${undefinedMethods.join(', ')}`
      });
    }
    
    results.push({
      controller: controllerFile,
      model: modelFile,
      modelInstance: modelInstanceName || 'N/A',
      controllerMethods: controllerMethods.length,
      modelMethods: modelMethods.length,
      undefinedMethods: undefinedMethods.length,
      methods: {
        called: controllerMethods,
        available: Array.from(modelMethods),
        undefined: undefinedMethods
      }
    });
  }
  
  return { results, issues };
}

// Run check
const { results, issues } = detailedCheck();

console.log('📊 KẾT QUẢ KIỂM TRA CHI TIẾT\n');
console.log('='.repeat(80));

if (issues.length > 0) {
  console.log('\n❌ CÁC VẤN ĐỀ PHÁT HIỆN:\n');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
    if (issue.methods) {
      console.log(`   Methods: ${issue.methods.join(', ')}`);
    }
    console.log(`   Controller: ${issue.controller}`);
    if (issue.model) {
      console.log(`   Model: ${issue.model}`);
    }
    console.log('');
  });
} else {
  console.log('\n✅ Không phát hiện vấn đề nào!\n');
}

console.log('\n📋 CHI TIẾT TỪNG CONTROLLER:\n');
results.forEach(result => {
  const status = result.undefinedMethods === 0 ? '✅' : '❌';
  console.log(`${status} ${result.controller.padEnd(40)} | Model: ${result.modelInstance.padEnd(15)} | Methods: ${result.controllerMethods}/${result.modelMethods} | Undefined: ${result.undefinedMethods}`);
  
  if (result.undefinedMethods > 0) {
    console.log(`   ❌ Undefined methods: ${result.methods.undefined.join(', ')}`);
  }
});

// Save detailed report
const reportPath = path.join(__dirname, '../Models/DETAILED_CRUD_CHECK.md');
const reportContent = `# BÁO CÁO KIỂM TRA CHI TIẾT CRUD OPERATIONS

Generated: ${new Date().toISOString()}

## ❌ Các vấn đề phát hiện

${issues.length > 0 ? issues.map((issue, i) => `${i + 1}. **[${issue.type}]** ${issue.message}`).join('\n') : '✅ Không có vấn đề nào được phát hiện.'}

## 📋 Chi tiết từng Controller

${results.map(r => `
### ${r.controller}

- **Model**: ${r.model}
- **Model Instance**: ${r.modelInstance}
- **Controller Methods Called**: ${r.controllerMethods}
- **Model Methods Available**: ${r.modelMethods}
- **Undefined Methods**: ${r.undefinedMethods}

**Methods Called:**
${r.methods.called.length > 0 ? r.methods.called.map(m => `- \`${m}()\``).join('\n') : '- None'}

**Undefined Methods:**
${r.methods.undefined.length > 0 ? r.methods.undefined.map(m => `- ❌ \`${m}()\``).join('\n') : '- ✅ None'}
`).join('\n')}
`;

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`\n📄 Báo cáo chi tiết đã được lưu tại: ${reportPath}`);

