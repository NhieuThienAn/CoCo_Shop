const fs = require('fs');
const path = require('path');
const { tableSchemas, tableSchemaMap } = require('./ModelSchemas');

/**
 * Script kiểm tra xem các Models đã khớp với database schema chưa
 */

// Danh sách các model files cần kiểm tra
const modelFiles = [
  'User.js',
  'Role.js',
  'Address.js',
  'Category.js',
  'Product.js',
  'Brand.js',
  'Supplier.js',
  'Order.js',
  'OrderItem.js',
  'OrderStatus.js',
  'CartItem.js',
  'Payment.js',
  'PaymentMethod.js',
  'PaymentStatus.js',
  'Bank.js',
  'BankAccount.js',
  'BankTransaction.js',
  'BankTransferRequest.js',
  'BankApiLog.js',
  'BankReconciliation.js',
  'Review.js',
  'Wishlist.js',
  'Shipment.js',
  'Shipper.js',
  'Coupon.js',
  'PurchaseOrder.js',
  'ReturnRequest.js',
  'InventoryTransaction.js',
  'TokenBlacklist.js',
];

// Mapping từ model file name sang table name
const modelToTableMap = {
  'User.js': 'users',
  'Role.js': 'roles',
  'Address.js': 'addresses',
  'Category.js': 'categories',
  'Product.js': 'products',
  'Brand.js': 'brands',
  'Supplier.js': 'suppliers',
  'Order.js': 'orders',
  'OrderItem.js': 'orderitems',
  'OrderStatus.js': 'orderstatus',
  'CartItem.js': 'cartitems',
  'Payment.js': 'payments',
  'PaymentMethod.js': 'paymentmethods',
  'PaymentStatus.js': 'paymentstatus',
  'Bank.js': 'banks',
  'BankAccount.js': 'bank_accounts',
  'BankTransaction.js': 'bank_transactions',
  'BankTransferRequest.js': 'bank_transfer_requests',
  'BankApiLog.js': 'bank_api_logs',
  'BankReconciliation.js': 'bank_reconciliations',
  'Review.js': 'reviews',
  'Wishlist.js': 'wishlist',
  'Shipment.js': 'shipments',
  'Shipper.js': 'shippers',
  'Coupon.js': 'coupons',
  'PurchaseOrder.js': 'purchaseorders',
  'ReturnRequest.js': 'returnrequests',
  'InventoryTransaction.js': 'inventorytransactions',
  'TokenBlacklist.js': 'tokenblacklist',
};

// Hàm extract columns từ model file
const extractModelColumns = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Tìm pattern: columns: [ ... ]
    const columnsMatch = content.match(/columns:\s*\[([\s\S]*?)\]/);
    if (!columnsMatch) {
      return null;
    }
    
    const columnsStr = columnsMatch[1];
    const columns = columnsStr
      .split(',')
      .map(col => col.trim().replace(/['"`]/g, ''))
      .filter(col => col && !col.includes('//'))
      .map(col => col.split('//')[0].trim())
      .filter(Boolean);
    
    // Tìm primaryKey
    const primaryKeyMatch = content.match(/primaryKey:\s*['"`]([^'"`]+)['"`]/);
    const primaryKey = primaryKeyMatch ? primaryKeyMatch[1] : null;
    
    // Tìm tableName
    const tableNameMatch = content.match(/tableName:\s*['"`]([^'"`]+)['"`]/);
    const tableName = tableNameMatch ? tableNameMatch[1] : null;
    
    return { columns, primaryKey, tableName };
  } catch (error) {
    return { error: error.message };
  }
};

// Hàm so sánh arrays
const compareArrays = (arr1, arr2) => {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  
  const missing = arr2.filter(item => !set1.has(item));
  const extra = arr1.filter(item => !set2.has(item));
  
  return { missing, extra, match: missing.length === 0 && extra.length === 0 };
};

// Kiểm tra tất cả models
const checkAllModels = () => {
  const results = {
    totalTables: tableSchemas.length,
    totalModels: modelFiles.length,
    checked: [],
    missing: [],
    errors: [],
  };

  console.log('🔍 Bắt đầu kiểm tra Models với Database Schema...\n');
  console.log(`📊 Tổng số bảng trong database: ${results.totalTables}`);
  console.log(`📊 Tổng số model files: ${results.totalModels}\n`);

  // Kiểm tra từng model file
  modelFiles.forEach((modelFile) => {
    const tableName = modelToTableMap[modelFile];
    const filePath = path.join(__dirname, modelFile);
    
    if (!fs.existsSync(filePath)) {
      results.missing.push({ model: modelFile, table: tableName, reason: 'File không tồn tại' });
      console.log(`❌ ${modelFile}: File không tồn tại`);
      return;
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      results.missing.push({ model: modelFile, table: tableName, reason: 'File rỗng (0 bytes)' });
      console.log(`❌ ${modelFile}: File rỗng (0 bytes)`);
      return;
    }

    const modelInfo = extractModelColumns(filePath);
    
    if (modelInfo && modelInfo.error) {
      results.errors.push({ model: modelFile, table: tableName, error: modelInfo.error });
      console.log(`⚠️  ${modelFile}: Lỗi khi đọc file - ${modelInfo.error}`);
      return;
    }

    if (!modelInfo || !modelInfo.columns) {
      results.errors.push({ model: modelFile, table: tableName, error: 'Không thể extract columns' });
      console.log(`⚠️  ${modelFile}: Không thể extract columns`);
      return;
    }

    const schema = tableSchemaMap[tableName];
    
    if (!schema) {
      results.errors.push({ model: modelFile, table: tableName, error: 'Không tìm thấy schema trong database' });
      console.log(`⚠️  ${modelFile}: Không tìm thấy bảng "${tableName}" trong database schema`);
      return;
    }

    // So sánh tableName
    if (modelInfo.tableName !== tableName) {
      results.errors.push({
        model: modelFile,
        table: tableName,
        error: `Table name không khớp: model="${modelInfo.tableName}", schema="${tableName}"`,
      });
    }

    // So sánh primaryKey
    const primaryKeyMatch = modelInfo.primaryKey === schema.primaryKey;
    if (!primaryKeyMatch) {
      results.errors.push({
        model: modelFile,
        table: tableName,
        error: `Primary key không khớp: model="${modelInfo.primaryKey}", schema="${schema.primaryKey}"`,
      });
    }

    // So sánh columns
    const columnComparison = compareArrays(modelInfo.columns, schema.columns);
    
    const checkResult = {
      model: modelFile,
      table: tableName,
      modelColumns: modelInfo.columns.length,
      schemaColumns: schema.columns.length,
      primaryKeyMatch,
      columnMatch: columnComparison.match,
      missingColumns: columnComparison.missing,
      extraColumns: columnComparison.extra,
      status: primaryKeyMatch && columnComparison.match ? '✅ OK' : '⚠️  Có lỗi',
    };

    results.checked.push(checkResult);

    if (checkResult.status === '✅ OK') {
      console.log(`✅ ${modelFile} (${tableName}): OK - ${modelInfo.columns.length} columns`);
    } else {
      console.log(`⚠️  ${modelFile} (${tableName}):`);
      if (!primaryKeyMatch) {
        console.log(`   - Primary key: model="${modelInfo.primaryKey}", schema="${schema.primaryKey}"`);
      }
      if (columnComparison.missing.length > 0) {
        console.log(`   - Thiếu columns: ${columnComparison.missing.join(', ')}`);
      }
      if (columnComparison.extra.length > 0) {
        console.log(`   - Thừa columns: ${columnComparison.extra.join(', ')}`);
      }
    }
  });

  // Kiểm tra các bảng trong database nhưng không có model
  const modelTables = new Set(Object.values(modelToTableMap));
  const schemaTables = new Set(tableSchemas.map(s => s.tableName));
  
  const missingModels = Array.from(schemaTables).filter(table => !modelTables.has(table));
  if (missingModels.length > 0) {
    console.log(`\n⚠️  Các bảng trong database nhưng chưa có model:`);
    missingModels.forEach(table => {
      console.log(`   - ${table}`);
      results.missing.push({ model: null, table, reason: 'Chưa có model file' });
    });
  }

  // Tóm tắt
  console.log('\n' + '='.repeat(60));
  console.log('📋 TÓM TẮT KIỂM TRA:');
  console.log('='.repeat(60));
  console.log(`✅ Models OK: ${results.checked.filter(r => r.status === '✅ OK').length}`);
  console.log(`⚠️  Models có lỗi: ${results.checked.filter(r => r.status !== '✅ OK').length}`);
  console.log(`❌ Models thiếu: ${results.missing.length}`);
  console.log(`⚠️  Lỗi khác: ${results.errors.length}`);
  
  return results;
};

// Chạy kiểm tra
if (require.main === module) {
  try {
    const results = checkAllModels();
    
    // Lưu kết quả vào file JSON
    const outputPath = path.join(__dirname, 'checkResults.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Kết quả đã được lưu vào: ${outputPath}`);
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra:', error);
    process.exit(1);
  }
}

module.exports = { checkAllModels, extractModelColumns };

