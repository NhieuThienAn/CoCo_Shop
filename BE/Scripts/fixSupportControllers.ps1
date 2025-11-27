# Script to fix support controller files with missing methods
$controllersDir = "D:\DuAn\DOANCUOICUNG\Do-An-Tot-Nghiep-2025\BE\Controllers"

# SupplierController
$supplierContent = @'
const createBaseController = require('./BaseController');
const { supplier } = require('../Models');

const createSupplierController = () => {
  const baseController = createBaseController(supplier);

  const searchByName = async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tên để tìm kiếm',
        });
      }

      const data = await supplier.findAll({
        filters: {},
        orderBy: 'name ASC',
      });

      const filtered = data.filter(s => 
        s.name.toLowerCase().includes(name.toLowerCase())
      );

      return res.status(200).json({
        success: true,
        data: filtered,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    searchByName,
  };
};

module.exports = createSupplierController();
'@

# OrderItemController
$orderItemContent = @'
const createBaseController = require('./BaseController');
const { orderItem } = require('../Models');

const createOrderItemController = () => {
  const baseController = createBaseController(orderItem);

  const getByOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const data = await orderItem.findByOrderId(orderId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByOrder,
  };
};

module.exports = createOrderItemController();
'@

# OrderStatusController
$orderStatusContent = @'
const createBaseController = require('./BaseController');
const { orderStatus } = require('../Models');

const createOrderStatusController = () => {
  const baseController = createBaseController(orderStatus);

  const getByName = async (req, res) => {
    try {
      const { name } = req.params;
      const data = await orderStatus.findByName(name);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trạng thái',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getAllOrdered = async (req, res) => {
    try {
      const data = await orderStatus.findAllOrdered();

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByName,
    getAllOrdered,
  };
};

module.exports = createOrderStatusController();
'@

# PaymentMethodController
$paymentMethodContent = @'
const createBaseController = require('./BaseController');
const { paymentMethod } = require('../Models');

const createPaymentMethodController = () => {
  const baseController = createBaseController(paymentMethod);

  const getByName = async (req, res) => {
    try {
      const { name } = req.params;
      const data = await paymentMethod.findByName(name);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phương thức thanh toán',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByName,
  };
};

module.exports = createPaymentMethodController();
'@

# PaymentStatusController
$paymentStatusContent = @'
const createBaseController = require('./BaseController');
const { paymentStatus } = require('../Models');

const createPaymentStatusController = () => {
  const baseController = createBaseController(paymentStatus);

  const getByName = async (req, res) => {
    try {
      const { name } = req.params;
      const data = await paymentStatus.findByName(name);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trạng thái thanh toán',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByName,
  };
};

module.exports = createPaymentStatusController();
'@

# ShipperController
$shipperContent = @'
const createBaseController = require('./BaseController');
const { shipper } = require('../Models');

const createShipperController = () => {
  const baseController = createBaseController(shipper);

  const searchByName = async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tên để tìm kiếm',
        });
      }

      const data = await shipper.findAll({
        filters: {},
        orderBy: 'name ASC',
      });

      const filtered = data.filter(s => 
        s.name.toLowerCase().includes(name.toLowerCase())
      );

      return res.status(200).json({
        success: true,
        data: filtered,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    searchByName,
  };
};

module.exports = createShipperController();
'@

# ShipmentController
$shipmentContent = @'
const createBaseController = require('./BaseController');
const { shipment } = require('../Models');

const createShipmentController = () => {
  const baseController = createBaseController(shipment);

  const getByOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const data = await shipment.findAll({
        filters: { order_id: orderId },
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByOrder,
  };
};

module.exports = createShipmentController();
'@

# PurchaseOrderController
$purchaseOrderContent = @'
const createBaseController = require('./BaseController');
const { purchaseOrder } = require('../Models');

const createPurchaseOrderController = () => {
  const baseController = createBaseController(purchaseOrder);

  const getByPoNumber = async (req, res) => {
    try {
      const { poNumber } = req.params;
      const data = await purchaseOrder.findByPoNumber(poNumber);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng mua',
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getBySupplier = async (req, res) => {
    try {
      const { supplierId } = req.params;
      const data = await purchaseOrder.findBySupplier(supplierId);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByApprovalStatus = async (req, res) => {
    try {
      const { status } = req.params;
      const data = await purchaseOrder.findAll({
        filters: { approval_status: status },
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const approve = async (req, res) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;

      await purchaseOrder.update(id, {
        approval_status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date(),
      });

      const updated = await purchaseOrder.findById(id);

      return res.status(200).json({
        success: true,
        message: 'Duyệt đơn hàng mua thành công',
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi duyệt đơn hàng',
        error: error.message,
      });
    }
  };

  const reject = async (req, res) => {
    try {
      const { id } = req.params;
      const { rejectedBy, rejectionReason } = req.body;

      await purchaseOrder.update(id, {
        approval_status: 'rejected',
        approved_by: rejectedBy,
        approved_at: new Date(),
        rejection_reason: rejectionReason,
      });

      const updated = await purchaseOrder.findById(id);

      return res.status(200).json({
        success: true,
        message: 'Từ chối đơn hàng mua thành công',
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi từ chối đơn hàng',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByPoNumber,
    getBySupplier,
    getByApprovalStatus,
    approve,
    reject,
  };
};

module.exports = createPurchaseOrderController();
'@

# ReturnRequestController
$returnRequestContent = @'
const createBaseController = require('./BaseController');
const { returnRequest } = require('../Models');

const createReturnRequestController = () => {
  const baseController = createBaseController(returnRequest);

  const getByOrder = async (req, res) => {
    try {
      const { orderId } = req.params;
      const data = await returnRequest.findAll({
        filters: { order_id: orderId },
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const data = await returnRequest.findAll({
        filters: { user_id: userId },
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByStatus = async (req, res) => {
    try {
      const { status } = req.params;
      const data = await returnRequest.findAll({
        filters: { status },
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const processReturn = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, processedBy, notes } = req.body;

      await returnRequest.update(id, {
        status,
        processed_by: processedBy,
        processed_at: new Date(),
        notes,
      });

      const updated = await returnRequest.findById(id);

      return res.status(200).json({
        success: true,
        message: 'Xử lý yêu cầu trả hàng thành công',
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xử lý yêu cầu trả hàng',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByOrder,
    getByUser,
    getByStatus,
    processReturn,
  };
};

module.exports = createReturnRequestController();
'@

# InventoryTransactionController
$inventoryTransactionContent = @'
const createBaseController = require('./BaseController');
const { inventoryTransaction } = require('../Models');

const createInventoryTransactionController = () => {
  const baseController = createBaseController(inventoryTransaction);

  const getByProduct = async (req, res) => {
    try {
      const { productId } = req.params;
      const data = await inventoryTransaction.findAll({
        filters: { product_id: productId },
        orderBy: 'created_at DESC',
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByChangeType = async (req, res) => {
    try {
      const { changeType } = req.params;
      const data = await inventoryTransaction.findAll({
        filters: { change_type: changeType },
        orderBy: 'created_at DESC',
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const recordTransaction = async (req, res) => {
    try {
      const { productId, quantity, changeType, reason, userId } = req.body;

      if (!productId || !quantity || !changeType) {
        return res.status(400).json({
          success: false,
          message: 'productId, quantity và changeType là bắt buộc',
        });
      }

      const result = await inventoryTransaction.recordTransaction(
        productId,
        quantity,
        changeType,
        reason,
        userId
      );

      return res.status(201).json({
        success: true,
        message: 'Ghi nhận giao dịch kho thành công',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi ghi nhận giao dịch',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByProduct,
    getByChangeType,
    recordTransaction,
  };
};

module.exports = createInventoryTransactionController();
'@

# Write all files
$files = @{
  'SupplierController.js' = $supplierContent
  'OrderItemController.js' = $orderItemContent
  'OrderStatusController.js' = $orderStatusContent
  'PaymentMethodController.js' = $paymentMethodContent
  'PaymentStatusController.js' = $paymentStatusContent
  'ShipperController.js' = $shipperContent
  'ShipmentController.js' = $shipmentContent
  'PurchaseOrderController.js' = $purchaseOrderContent
  'ReturnRequestController.js' = $returnRequestContent
  'InventoryTransactionController.js' = $inventoryTransactionContent
}

foreach ($file in $files.GetEnumerator()) {
  $filePath = Join-Path $controllersDir $file.Key
  [System.IO.File]::WriteAllText($filePath, $file.Value, [System.Text.Encoding]::UTF8)
  Write-Host "✅ Written $($file.Key)"
}

Write-Host "`n✅ All support controller files have been written!"

