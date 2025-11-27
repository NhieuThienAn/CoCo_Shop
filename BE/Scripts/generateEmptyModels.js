/**
 * Script to generate empty model files from schema
 */
const fs = require('fs');
const path = require('path');
const { tableSchemaMap } = require('../Models/ModelSchemas');

// Mapping table names to model file names
const tableToModelMap = {
  'users': 'User',
  'roles': 'Role',
  'addresses': 'Address',
  'categories': 'Category',
  'brands': 'Brand',
  'orders': 'Order',
  'orderitems': 'OrderItem',
  'orderstatus': 'OrderStatus',
  'cartitems': 'CartItem',
  'payments': 'Payment',
  'paymentmethods': 'PaymentMethod',
  'paymentstatus': 'PaymentStatus',
  'reviews': 'Review',
  'wishlist': 'Wishlist',
  'coupons': 'Coupon',
  'tokenblacklist': 'TokenBlacklist',
};

const modelsDir = path.join(__dirname, '..', 'Models');

// Generate model file content
const generateModelContent = (tableName, schema) => {
  const modelName = tableToModelMap[tableName] || tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  const columnsStr = schema.columns.map(col => `      '${col}'`).join(',\n');
  
  return `const createBaseModel = require('./BaseModel');

const create${modelName}Model = () => {
  const baseModel = createBaseModel({
    tableName: '${tableName}',
    primaryKey: '${schema.primaryKey || schema.columns[0]}',
    columns: [
${columnsStr}
    ],
  });

  return {
    ...baseModel,
  };
};

module.exports = create${modelName}Model;
`;
};

// Generate all empty models
const emptyFiles = ['Address.js', 'Brand.js', 'CartItem.js', 'Category.js', 'Coupon.js', 'Order.js', 'OrderItem.js', 'OrderStatus.js', 'Payment.js', 'PaymentMethod.js', 'PaymentStatus.js', 'Review.js', 'Role.js', 'TokenBlacklist.js', 'Wishlist.js'];

emptyFiles.forEach(fileName => {
  const filePath = path.join(modelsDir, fileName);
  
  // Find table name from file name
  let tableName = null;
  for (const [table, model] of Object.entries(tableToModelMap)) {
    if (model === fileName.replace('.js', '')) {
      tableName = table;
      break;
    }
  }
  
  if (!tableName) {
    console.log(`⚠️  Could not find table for ${fileName}`);
    return;
  }
  
  const schema = tableSchemaMap[tableName];
  if (!schema) {
    console.log(`⚠️  Could not find schema for table: ${tableName}`);
    return;
  }
  
  const content = generateModelContent(tableName, schema);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Generated ${fileName}`);
});

console.log('\n✅ Done generating empty models!');

