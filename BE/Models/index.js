const createBaseModel = require('./BaseModel');
const { tableSchemas } = require('./ModelSchemas');

const path = require('path');
const createUserModel = require(path.resolve(__dirname, 'User.js'));
if (typeof createUserModel !== 'function') {
  throw new Error('createUserModel must be a function. Got: ' + typeof createUserModel + '. File: ' + path.resolve(__dirname, 'User.js'));
}
const createRoleModel = require('./Role');
const createAddressModel = require('./Address');
const createCategoryModel = require('./Category');
const createProductModel = require('./Product');
const createBrandModel = require('./Brand');
const createSupplierModel = require('./Supplier');
const createOrderModel = require('./Order');
const createOrderItemModel = require('./OrderItem');
const createOrderStatusModel = require('./OrderStatus');
const createCartItemModel = require('./CartItem');
const createPaymentModel = require('./Payment');
const createPaymentMethodModel = require('./PaymentMethod');
const createPaymentStatusModel = require('./PaymentStatus');
const createBankModel = require('./Bank');
const createBankAccountModel = require('./BankAccount');
const createBankTransactionModel = require('./BankTransaction');
const createBankTransferRequestModel = require('./BankTransferRequest');
const createBankApiLogModel = require('./BankApiLog');
const createBankReconciliationModel = require('./BankReconciliation');
const createReviewModel = require('./Review');
const createWishlistModel = require('./Wishlist');
const createShipmentModel = require('./Shipment');
const createShipperModel = require('./Shipper');
const createCouponModel = require('./Coupon');
const createPurchaseOrderModel = require('./PurchaseOrder');
const createReturnRequestModel = require('./ReturnRequest');
const createInventoryTransactionModel = require('./InventoryTransaction');
const createStockReceiptModel = require('./StockReceipt');
const createTokenBlacklistModel = require('./TokenBlacklist');
const createEmailOtpModel = require('./EmailOtp');

const toCamelCase = (value) =>
  value
    .replace(/[-_\s]+([a-zA-Z0-9])/g, (_, chunk) => chunk.toUpperCase())
    .replace(/^[A-Z]/, (letter) => letter.toLowerCase());

const user = createUserModel();
const role = createRoleModel();
const address = createAddressModel();
const category = createCategoryModel();
const product = createProductModel();
const brand = createBrandModel();
const supplier = createSupplierModel();
const order = createOrderModel();
const orderItemInstance = createOrderItemModel();

if (typeof orderItemInstance.createWithSnapshot !== 'function') {
  console.warn('[Models/index] WARNING: orderItem.createWithSnapshot is missing! Adding it...');
  orderItemInstance.createWithSnapshot = async function(orderId, productId, quantity, unitPrice, productSnapshot = null) {
    const totalPrice = parseFloat(unitPrice) * parseInt(quantity);
    const data = {
      order_id: orderId,
      product_id: productId,
      quantity: parseInt(quantity),
      unit_price: parseFloat(unitPrice),
      total_price: totalPrice,
      unit_price_snapshot: parseFloat(unitPrice),
      total_price_snapshot: totalPrice,
    };
    if (productSnapshot) {
      data.product_snapshot = typeof productSnapshot === 'string' 
        ? productSnapshot 
        : JSON.stringify(productSnapshot);
    }
    return await this.create(data);
  };
}
const orderItem = orderItemInstance;
const orderStatus = createOrderStatusModel();
const cartItem = createCartItemModel();
const payment = createPaymentModel();
const paymentMethod = createPaymentMethodModel();
const paymentStatus = createPaymentStatusModel();
const bank = createBankModel();
const bankAccount = createBankAccountModel();
const bankTransaction = createBankTransactionModel();
const bankTransferRequest = createBankTransferRequestModel();
const bankApiLog = createBankApiLogModel();
const bankReconciliation = createBankReconciliationModel();
const review = createReviewModel();
const wishlist = createWishlistModel();
const shipment = createShipmentModel();
const shipper = createShipperModel();
const coupon = createCouponModel();
const purchaseOrder = createPurchaseOrderModel();
const returnRequest = createReturnRequestModel();
const inventoryTransaction = createInventoryTransactionModel();
const stockReceipt = createStockReceiptModel();
const tokenBlacklist = createTokenBlacklistModel();
const emailOtp = createEmailOtpModel();

const buildModelRegistry = () => {
  const modelsByTable = {};
  const modelsByAlias = {};

  tableSchemas.forEach((schema) => {
    const modelInstance = createBaseModel({
      tableName: schema.tableName,
      columns: schema.columns,
      primaryKey: schema.primaryKey,
    });

    modelsByTable[schema.tableName] = modelInstance;

    const alias = toCamelCase(schema.tableName);
    if (alias && !modelsByAlias[alias]) {
      modelsByAlias[alias] = modelInstance;
    }
  });

  return { modelsByAlias, modelsByTable };
};

const { modelsByAlias, modelsByTable } = buildModelRegistry();

const getModel = (name) => modelsByTable[name] || modelsByAlias[name] || null;
const hasModel = (name) => Boolean(getModel(name));

module.exports = {

  createBaseModel,
  tableSchemas,
  getModel,
  hasModel,

  createUserModel,
  createRoleModel,
  createAddressModel,
  createCategoryModel,
  createProductModel,
  createBrandModel,
  createSupplierModel,
  createOrderModel,
  createOrderItemModel,
  createOrderStatusModel,
  createCartItemModel,
  createPaymentModel,
  createPaymentMethodModel,
  createPaymentStatusModel,
  createBankModel,
  createBankAccountModel,
  createBankTransactionModel,
  createBankTransferRequestModel,
  createBankApiLogModel,
  createBankReconciliationModel,
  createReviewModel,
  createWishlistModel,
  createShipmentModel,
  createShipperModel,
  createCouponModel,
  createPurchaseOrderModel,
  createReturnRequestModel,
  createInventoryTransactionModel,
  createStockReceiptModel,
  createTokenBlacklistModel,
  createEmailOtpModel,

  user,
  role,
  address,
  category,
  product,
  brand,
  supplier,
  order,
  orderItem,
  orderStatus,
  cartItem,
  payment,
  paymentMethod,
  paymentStatus,
  bank,
  bankAccount,
  bankTransaction,
  bankTransferRequest,
  bankApiLog,
  bankReconciliation,
  review,
  wishlist,
  shipment,
  shipper,
  coupon,
  purchaseOrder,
  returnRequest,
  inventoryTransaction,
  stockReceipt,
  tokenBlacklist,
  emailOtp,

  models: modelsByTable,
  aliases: modelsByAlias,
};
