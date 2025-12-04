const createBaseController = require('./BaseController');
const { purchaseOrder } = require('../Models');
const createPurchaseOrderController = () => {
  const baseController = createBaseController(purchaseOrder);
  const getByPoNumber = async (req, res) => {
    console.log('========================================');
    console.log('[PurchaseOrderController] getByPoNumber function called');
    console.log('[PurchaseOrderController] Request IP:', req.ip);
    console.log('[PurchaseOrderController] Params:', req.params);
    try {
      const { poNumber } = req.params;
      console.log('[PurchaseOrderController] 🔍 Finding purchase order by PO number:', poNumber);
      const data = await purchaseOrder.findByPoNumber(poNumber);
      if (!data) {
        console.log('[PurchaseOrderController] ❌ Purchase order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn mua hàng',
        });
      }
      console.log('[PurchaseOrderController] ✅ Purchase order found:', data.purchase_order_id);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[PurchaseOrderController] ❌❌❌ ERROR IN getByPoNumber ❌❌❌');
      console.error('[PurchaseOrderController] Error message:', error.message);
      console.error('[PurchaseOrderController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getBySupplier = async (req, res) => {
    console.log('========================================');
    console.log('[PurchaseOrderController] getBySupplier function called');
    console.log('[PurchaseOrderController] Request IP:', req.ip);
    console.log('[PurchaseOrderController] Params:', req.params);
    try {
      const { supplierId } = req.params;
      console.log('[PurchaseOrderController] 🔍 Fetching purchase orders for supplierId:', supplierId);
      const data = await purchaseOrder.findBySupplierId(supplierId);
      console.log('[PurchaseOrderController] ✅ Purchase orders fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[PurchaseOrderController] ❌❌❌ ERROR IN getBySupplier ❌❌❌');
      console.error('[PurchaseOrderController] Error message:', error.message);
      console.error('[PurchaseOrderController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByApprovalStatus = async (req, res) => {
    console.log('========================================');
    console.log('[PurchaseOrderController] getByApprovalStatus function called');
    console.log('[PurchaseOrderController] Request IP:', req.ip);
    console.log('[PurchaseOrderController] Params:', req.params);
    console.log('[PurchaseOrderController] Query params:', JSON.stringify(req.query, null, 2));
    try {
      const { status } = req.params;
      const { supplier_id } = req.query;
      console.log('[PurchaseOrderController] 🔍 Fetching purchase orders by approval status:', status);
      console.log('[PurchaseOrderController] Supplier filter:', supplier_id);
      const filters = { approval_status: status };
      if (supplier_id !== undefined) {
        if (supplier_id === 'null' || supplier_id === null) {
          filters.supplier_id = null; 
        } else {
          filters.supplier_id = parseInt(supplier_id);
        }
      }
      let whereClause = '';
      let whereValues = [];
      const filterKeys = Object.keys(filters);
      if (filterKeys.length > 0) {
        const fragments = [];
        filterKeys.forEach((key) => {
          if (filters[key] === null) {
            fragments.push(`\`${key}\` IS NULL`);
          } else {
            fragments.push(`\`${key}\` = ?`);
            whereValues.push(filters[key]);
          }
        });
        whereClause = 'WHERE ' + fragments.join(' AND ');
      }
      const sql = `
        SELECT * FROM \`${purchaseOrder.tableName}\`
        ${whereClause}
        ORDER BY created_at DESC
      `;
      console.log('[PurchaseOrderController] SQL:', sql.substring(0, 200));
      console.log('[PurchaseOrderController] SQL params:', whereValues);
      const data = await purchaseOrder.execute(sql, whereValues);
      const db = require('../Config/database').getDatabase();
      const stockReceiptsCountQuery = `SELECT COUNT(*) as count FROM \`purchaseorders\` WHERE \`supplier_id\` IS NULL`;
      const [stockReceiptsCountRows] = await db.execute(stockReceiptsCountQuery);
      const stockReceiptsCount = stockReceiptsCountRows?.[0]?.count || 0;
      console.log('[PurchaseOrderController] ✅ Purchase orders fetched:', {
        count: data?.length || 0,
        status,
        supplier_id_filter: supplier_id,
        stock_receipts_count: stockReceiptsCount,
      });
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[PurchaseOrderController] ❌❌❌ ERROR IN getByApprovalStatus ❌❌❌');
      console.error('[PurchaseOrderController] Error message:', error.message);
      console.error('[PurchaseOrderController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const approve = async (req, res) => {
    console.log('========================================');
    console.log('[PurchaseOrderController] approve function called');
    console.log('[PurchaseOrderController] Request IP:', req.ip);
    console.log('[PurchaseOrderController] Params:', req.params);
    console.log('[PurchaseOrderController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { id } = req.params;
      const approvedBy = req.user?.userId || req.user?.user_id || req.body.approvedBy;
      console.log('[PurchaseOrderController] Approving purchase order:', { purchaseOrderId: id, approvedBy });
      if (!approvedBy) {
        console.log('[PurchaseOrderController] ❌ Validation failed: Missing approvedBy');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng đăng nhập để duyệt',
        });
      }
      const po = await purchaseOrder.findById(id);
      if (!po) {
        console.log('[PurchaseOrderController] ❌ Purchase order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn mua hàng',
        });
      }
      if (po.approval_status !== 'pending') {
        console.log('[PurchaseOrderController] ❌ PO already processed:', po.approval_status);
        return res.status(400).json({
          success: false,
          message: `Đơn mua hàng đã được xử lý (${po.approval_status})`,
        });
      }
      if (po.supplier_id === null || po.supplier_id === undefined) {
        console.log('[PurchaseOrderController] 📦 This is a stock receipt (supplier_id is NULL)');
        console.log('[PurchaseOrderController] 📦 Processing items for stock update...');
        let items = [];
        try {
          items = typeof po.items === 'string' 
            ? JSON.parse(po.items) 
            : po.items;
          if (!Array.isArray(items)) {
            throw new Error('Items is not an array');
          }
        } catch (e) {
          console.error('[PurchaseOrderController] ❌ Error parsing items:', e);
          return res.status(400).json({
            success: false,
            message: 'Dữ liệu sản phẩm không hợp lệ',
          });
        }
        console.log('[PurchaseOrderController] Items count:', items.length);
        const { product, inventoryTransaction } = require('../Models');
        const productIds = items.map(item => item.product_id).filter(Boolean);
        const productMap = await product.findByProductIdsAsMap(productIds);
        console.log(`[PurchaseOrderController] 🔍 Batch verified ${Object.keys(productMap).length} products for ${items.length} items`);
        const missingProducts = productIds.filter(id => !productMap[id]);
        if (missingProducts.length > 0) {
          console.log('[PurchaseOrderController] ❌ Some products not found:', missingProducts);
          return res.status(400).json({
            success: false,
            message: `Không tìm thấy sản phẩm với ID: ${missingProducts.join(', ')}`,
          });
        }
        const stockUpdates = items.map(item => ({
          product_id: item.product_id,
          quantity_change: parseInt(item.quantity || 0)
        }));
        const inventoryTransactions = items.map(item => ({
          product_id: item.product_id,
          quantity_change: parseInt(item.quantity || 0),
          change_type: 'IN',
          note: `Phiếu nhập kho ${po.po_number}`,
          created_by: approvedBy
        }));
        console.log('[PurchaseOrderController] 📈 Batch updating stock for', stockUpdates.length, 'products...');
        await product.batchUpdateStock(stockUpdates);
        console.log('[PurchaseOrderController] ✅ Stock updated for all products');
        console.log('[PurchaseOrderController] 📝 Batch recording inventory transactions for', inventoryTransactions.length, 'items...');
        await inventoryTransaction.batchRecordTransactions(inventoryTransactions);
        console.log('[PurchaseOrderController] ✅ Inventory transactions recorded for all items');
      } else {
        console.log('[PurchaseOrderController] 📋 This is a purchase order from supplier:', po.supplier_id);
      }
      console.log('[PurchaseOrderController] ✅ Approving purchase order...');
      await purchaseOrder.approve(id, approvedBy);
      const updated = await purchaseOrder.findById(id);
      console.log('[PurchaseOrderController] ✅✅✅ PURCHASE ORDER APPROVED SUCCESSFULLY ✅✅✅');
      console.log('[PurchaseOrderController] Updated approval status:', updated?.approval_status);
      console.log('========================================');
      const message = po.supplier_id === null || po.supplier_id === undefined
        ? 'Duyệt phiếu nhập kho thành công. Đã cập nhật tồn kho.'
        : 'Duyệt đơn mua hàng thành công';
      return res.status(200).json({
        success: true,
        message,
        data: updated,
      });
    } catch (error) {
      console.error('[PurchaseOrderController] ❌❌❌ ERROR IN approve ❌❌❌');
      console.error('[PurchaseOrderController] Error message:', error.message);
      console.error('[PurchaseOrderController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi duyệt',
        error: error.message,
      });
    }
  };
  const reject = async (req, res) => {
    console.log('========================================');
    console.log('[PurchaseOrderController] reject function called');
    console.log('[PurchaseOrderController] Request IP:', req.ip);
    console.log('[PurchaseOrderController] Params:', req.params);
    console.log('[PurchaseOrderController] Request body:', JSON.stringify({
      ...req.body,
      rejectionReason: req.body.rejectionReason ? req.body.rejectionReason.substring(0, 100) + '...' : undefined
    }, null, 2));
    try {
      const { id } = req.params;
      const { approvedBy, rejectionReason } = req.body;
      console.log('[PurchaseOrderController] Rejecting purchase order:', {
        purchaseOrderId: id,
        approvedBy,
        hasRejectionReason: !!rejectionReason
      });
      if (!approvedBy || !rejectionReason) {
        console.log('[PurchaseOrderController] ❌ Validation failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
      }
      console.log('[PurchaseOrderController] ❌ Rejecting purchase order...');
      await purchaseOrder.reject(id, approvedBy, rejectionReason);
      const updated = await purchaseOrder.findById(id);
      console.log('[PurchaseOrderController] ✅✅✅ PURCHASE ORDER REJECTED SUCCESSFULLY ✅✅✅');
      console.log('[PurchaseOrderController] Updated approval status:', updated?.approval_status);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Từ chối đơn mua hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[PurchaseOrderController] ❌❌❌ ERROR IN reject ❌❌❌');
      console.error('[PurchaseOrderController] Error message:', error.message);
      console.error('[PurchaseOrderController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi từ chối',
        error: error.message,
      });
    }
  };
  const getAll = async (req, res) => {
    console.log('========================================');
    console.log('[PurchaseOrderController] getAll function called (override)');
    console.log('[PurchaseOrderController] Request IP:', req.ip);
    console.log('[PurchaseOrderController] Query params:', JSON.stringify(req.query, null, 2));
    try {
      const { page = 1, limit = 10, supplier_id, ...otherFilters } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      console.log('[PurchaseOrderController] Pagination:', { pageNum, limitNum, offset });
      console.log('[PurchaseOrderController] Filters:', { supplier_id, ...otherFilters });
      const filters = { ...otherFilters };
      if (supplier_id !== undefined) {
        if (supplier_id === 'null' || supplier_id === null) {
          filters.supplier_id = null;
        } else {
          filters.supplier_id = parseInt(supplier_id);
        }
      }
      console.log('[PurchaseOrderController] 🔍 Fetching purchase orders from database...');
      console.log('[PurchaseOrderController] Final filters:', filters);
      const { data, total } = await purchaseOrder.findAllWithCount({
        filters,
        limit: limitNum,
        offset,
        orderBy: 'created_at DESC',
      });
      const db = require('../Config/database').getDatabase();
      const stockReceiptsCountQuery = `SELECT COUNT(*) as count FROM \`purchaseorders\` WHERE \`supplier_id\` IS NULL`;
      const [stockReceiptsCountRows] = await db.execute(stockReceiptsCountQuery);
      const stockReceiptsCount = stockReceiptsCountRows?.[0]?.count || 0;
      console.log('[PurchaseOrderController] ✅ Purchase orders fetched:', {
        count: data?.length || 0,
        total,
        pageNum,
        limitNum,
        supplier_id_filter: supplier_id,
        stock_receipts_count: stockReceiptsCount,
      });
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('[PurchaseOrderController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[PurchaseOrderController] Error message:', error.message);
      console.error('[PurchaseOrderController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    getAll,
    getByPoNumber,
    getBySupplier,
    getByApprovalStatus,
    approve,
    reject,
  };
};
module.exports = createPurchaseOrderController();
