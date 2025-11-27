/**
 * Export tất cả controllers
 */
module.exports = {
  // Main Controllers
  UserController: require('./UserController'),
  ProductController: require('./ProductController'),
  CategoryController: require('./CategoryController'),
  OrderController: require('./OrderController'),
  CartItemController: require('./CartItemController'),
  PaymentController: require('./PaymentController'),
  CouponController: require('./CouponController'),
  ReviewController: require('./ReviewController'),
  WishlistController: require('./WishlistController'),
  AddressController: require('./AddressController'),
  
  // Support Controllers
  RoleController: require('./RoleController'),
  BrandController: require('./BrandController'),
  SupplierController: require('./SupplierController'),
  OrderItemController: require('./OrderItemController'),
  OrderStatusController: require('./OrderStatusController'),
  PaymentMethodController: require('./PaymentMethodController'),
  PaymentStatusController: require('./PaymentStatusController'),
  ShipmentController: require('./ShipmentController'),
  ShipperController: require('./ShipperController'),
  PurchaseOrderController: require('./PurchaseOrderController'),
  ReturnRequestController: require('./ReturnRequestController'),
  InventoryTransactionController: require('./InventoryTransactionController'),
  StockReceiptController: require('./StockReceiptController'),
  TokenBlacklistController: require('./TokenBlacklistController'),
  
  // Bank Controllers
  BankController: require('./BankController'),
  BankAccountController: require('./BankAccountController'),
  BankTransactionController: require('./BankTransactionController'),
  BankTransferRequestController: require('./BankTransferRequestController'),
  BankApiLogController: require('./BankApiLogController'),
  BankReconciliationController: require('./BankReconciliationController'),
  
  // Statistics Controller
  StatisticsController: require('./StatisticsController'),
  
  // Base Controller để extend
  BaseController: require('./BaseController'),
};

