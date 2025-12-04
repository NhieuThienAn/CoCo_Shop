const express = require('express');
const router = express.Router();
const {
  RoleController,
  BrandController,
  SupplierController,
  OrderItemController,
  OrderStatusController,
  PaymentMethodController,
  PaymentStatusController,
  ShipmentController,
  ShipperController,
  PurchaseOrderController,
  ReturnRequestController,
  InventoryTransactionController,
  StockReceiptController,
} = require('../Controllers');
const { authenticate, authorize, optionalAuthenticate } = require('../Middlewares');
router.get('/roles', optionalAuthenticate, RoleController.getAll);
router.get('/roles/:id', optionalAuthenticate, RoleController.getById);
router.post('/roles', authenticate, authorize(1), RoleController.create);
router.put('/roles/:id', authenticate, authorize(1), RoleController.update);
router.delete('/roles/:id', authenticate, authorize(1), RoleController.delete);
router.get('/brands', optionalAuthenticate, BrandController.getAll);
router.get('/brands/:id', optionalAuthenticate, BrandController.getById);
router.post('/brands', authenticate, authorize(1), BrandController.create);
router.put('/brands/:id', authenticate, authorize(1), BrandController.update);
router.delete('/brands/:id', authenticate, authorize(1), BrandController.delete);
router.get('/suppliers', authenticate, authorize(1), SupplierController.getAll);
router.get('/suppliers/:id', authenticate, authorize(1), SupplierController.getById);
router.post('/suppliers', authenticate, authorize(1), SupplierController.create);
router.put('/suppliers/:id', authenticate, authorize(1), SupplierController.update);
router.delete('/suppliers/:id', authenticate, authorize(1), SupplierController.delete);
router.get('/suppliers/search/name', authenticate, authorize(1), SupplierController.searchByName);
router.get('/order-items', authenticate, authorize(1), OrderItemController.getAll);
router.get('/order-items/:id', authenticate, authorize(1), OrderItemController.getById);
router.get('/order-items/order/:orderId', authenticate, authorize(1), OrderItemController.getByOrder);
router.post('/order-items', authenticate, authorize(1), OrderItemController.create);
router.put('/order-items/:id', authenticate, authorize(1), OrderItemController.update);
router.delete('/order-items/:id', authenticate, authorize(1), OrderItemController.delete);
router.get('/order-statuses', optionalAuthenticate, OrderStatusController.getAll);
router.get('/order-statuses/:id', optionalAuthenticate, OrderStatusController.getById);
router.get('/order-statuses/name/:name', optionalAuthenticate, OrderStatusController.getByName);
router.get('/order-statuses/ordered/list', optionalAuthenticate, OrderStatusController.getAllOrdered);
router.post('/order-statuses', authenticate, authorize(1), OrderStatusController.create);
router.put('/order-statuses/:id', authenticate, authorize(1), OrderStatusController.update);
router.delete('/order-statuses/:id', authenticate, authorize(1), OrderStatusController.delete);
router.get('/payment-methods', optionalAuthenticate, PaymentMethodController.getAll);
router.get('/payment-methods/:id', optionalAuthenticate, PaymentMethodController.getById);
router.get('/payment-methods/name/:name', optionalAuthenticate, PaymentMethodController.getByName);
router.post('/payment-methods', authenticate, authorize(1), PaymentMethodController.create);
router.put('/payment-methods/:id', authenticate, authorize(1), PaymentMethodController.update);
router.delete('/payment-methods/:id', authenticate, authorize(1), PaymentMethodController.delete);
router.get('/payment-statuses', optionalAuthenticate, PaymentStatusController.getAll);
router.get('/payment-statuses/:id', optionalAuthenticate, PaymentStatusController.getById);
router.get('/payment-statuses/name/:name', optionalAuthenticate, PaymentStatusController.getByName);
router.post('/payment-statuses', authenticate, authorize(1), PaymentStatusController.create);
router.put('/payment-statuses/:id', authenticate, authorize(1), PaymentStatusController.update);
router.delete('/payment-statuses/:id', authenticate, authorize(1), PaymentStatusController.delete);
router.get('/shipments', authenticate, authorize(1), ShipmentController.getAll);
router.get('/shipments/:id', authenticate, authorize(1), ShipmentController.getById);
router.get('/shipments/order/:orderId', authenticate, authorize(1, 2), ShipmentController.getByOrder); 
router.get('/shipments/shipper/me', authenticate, authorize(2), ShipmentController.getByShipper); 
router.post('/shipments', authenticate, authorize(1), ShipmentController.create);
router.post('/shipments/accept', authenticate, authorize(2), ShipmentController.acceptOrder); 
router.put('/shipments/:id', authenticate, authorize(1), ShipmentController.update);
router.delete('/shipments/:id', authenticate, authorize(1), ShipmentController.delete);
router.get('/shippers', authenticate, authorize(1), ShipperController.getAll);
router.get('/shippers/:id', authenticate, authorize(1), ShipperController.getById);
router.get('/shippers/search/name', authenticate, authorize(1), ShipperController.searchByName);
router.post('/shippers', authenticate, authorize(1), ShipperController.create);
router.put('/shippers/:id', authenticate, authorize(1), ShipperController.update);
router.delete('/shippers/:id', authenticate, authorize(1), ShipperController.delete);
router.get('/purchase-orders', authenticate, authorize(1), PurchaseOrderController.getAll);
router.get('/purchase-orders/:id', authenticate, authorize(1), PurchaseOrderController.getById);
router.get('/purchase-orders/po/:poNumber', authenticate, authorize(1), PurchaseOrderController.getByPoNumber);
router.get('/purchase-orders/supplier/:supplierId', authenticate, authorize(1), PurchaseOrderController.getBySupplier);
router.get('/purchase-orders/approval/:status', authenticate, authorize(1), PurchaseOrderController.getByApprovalStatus);
router.post('/purchase-orders', authenticate, authorize(1), PurchaseOrderController.create);
router.put('/purchase-orders/:id', authenticate, authorize(1), PurchaseOrderController.update);
router.delete('/purchase-orders/:id', authenticate, authorize(1), PurchaseOrderController.delete);
router.put('/purchase-orders/:id/approve', authenticate, authorize(1), PurchaseOrderController.approve);
router.put('/purchase-orders/:id/reject', authenticate, authorize(1), PurchaseOrderController.reject);
router.get('/return-requests', authenticate, authorize(1), ReturnRequestController.getAll);
router.get('/return-requests/:id', authenticate, authorize(1), ReturnRequestController.getById);
router.get('/return-requests/order/:orderId', authenticate, authorize(1), ReturnRequestController.getByOrder);
router.get('/return-requests/user/:userId', authenticate, authorize(1), ReturnRequestController.getByUser);
router.get('/return-requests/status/:status', authenticate, authorize(1), ReturnRequestController.getByStatus);
router.post('/return-requests', authenticate, authorize(1), ReturnRequestController.create);
router.put('/return-requests/:id', authenticate, authorize(1), ReturnRequestController.update);
router.delete('/return-requests/:id', authenticate, authorize(1), ReturnRequestController.delete);
router.put('/return-requests/:id/process', authenticate, authorize(1), ReturnRequestController.processReturn);
router.get('/inventory-transactions', authenticate, authorize(1), InventoryTransactionController.getAll);
router.get('/inventory-transactions/:id', authenticate, authorize(1), InventoryTransactionController.getById);
router.get('/inventory-transactions/product/:productId', authenticate, authorize(1), InventoryTransactionController.getByProduct);
router.get('/inventory-transactions/type/:changeType', authenticate, authorize(1), InventoryTransactionController.getByChangeType);
router.post('/inventory-transactions', authenticate, authorize(1), InventoryTransactionController.create);
router.post('/inventory-transactions/record', authenticate, authorize(1), InventoryTransactionController.recordTransaction);
router.put('/inventory-transactions/:id', authenticate, authorize(1), InventoryTransactionController.update);
router.delete('/inventory-transactions/:id', authenticate, authorize(1), InventoryTransactionController.delete);
router.get('/stock-receipts', authenticate, authorize(1), StockReceiptController.getAll);
router.get('/stock-receipts/:id', authenticate, authorize(1), StockReceiptController.getById);
router.get('/stock-receipts/receipt/:receiptNumber', authenticate, authorize(1), StockReceiptController.getByReceiptNumber);
router.get('/stock-receipts/status/:status', authenticate, authorize(1), StockReceiptController.getByStatus);
router.post('/stock-receipts', authenticate, authorize(1), StockReceiptController.create);
router.put('/stock-receipts/:id', authenticate, authorize(1), StockReceiptController.update);
router.delete('/stock-receipts/:id', authenticate, authorize(1), StockReceiptController.delete);
router.put('/stock-receipts/:id/approve', authenticate, authorize(1), StockReceiptController.approve);
router.put('/stock-receipts/:id/reject', authenticate, authorize(1), StockReceiptController.reject);
module.exports = router;
