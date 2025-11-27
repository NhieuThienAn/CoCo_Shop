# Script to fix empty controller files
$controllersDir = "D:\DuAn\DOANCUOICUNG\Do-An-Tot-Nghiep-2025\BE\Controllers"

# Mapping controller names to model names
$controllerModelMap = @{
  'AddressController.js' = 'address'
  'BankAccountController.js' = 'bankAccount'
  'BankApiLogController.js' = 'bankApiLog'
  'BankController.js' = 'bank'
  'BankReconciliationController.js' = 'bankReconciliation'
  'BankTransactionController.js' = 'bankTransaction'
  'BankTransferRequestController.js' = 'bankTransferRequest'
  'BrandController.js' = 'brand'
  'CartItemController.js' = 'cartItem'
  'CategoryController.js' = 'category'
  'CouponController.js' = 'coupon'
  'InventoryTransactionController.js' = 'inventoryTransaction'
  'OrderItemController.js' = 'orderItem'
  'OrderStatusController.js' = 'orderStatus'
  'PaymentMethodController.js' = 'paymentMethod'
  'PaymentStatusController.js' = 'paymentStatus'
  'PurchaseOrderController.js' = 'purchaseOrder'
  'ReturnRequestController.js' = 'returnRequest'
  'ReviewController.js' = 'review'
  'RoleController.js' = 'role'
  'ShipperController.js' = 'shipper'
  'SupplierController.js' = 'supplier'
  'WishlistController.js' = 'wishlist'
}

foreach ($kv in $controllerModelMap.GetEnumerator()) {
  $fileName = $kv.Key
  $modelName = $kv.Value
  $filePath = Join-Path $controllersDir $fileName
  
  $content = @"
const createBaseController = require('./BaseController');
const { $modelName } = require('../Models');

const create$($fileName.Replace('Controller.js', '').Replace('.js', ''))Controller = () => {
  const baseController = createBaseController($modelName);

  return {
    ...baseController,
  };
};

module.exports = create$($fileName.Replace('Controller.js', '').Replace('.js', ''))Controller();
"@

  [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
  Write-Host "✅ Written $fileName"
}

Write-Host "`n✅ All controller files have been written!"

