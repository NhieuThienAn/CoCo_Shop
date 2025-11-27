const createBaseController = require('./BaseController');
const { inventoryTransaction } = require('../Models');

const createInventoryTransactionController = () => {
  const baseController = createBaseController(inventoryTransaction);

  const getByProduct = async (req, res) => {
    console.log('========================================');
    console.log('[InventoryTransactionController] getByProduct function called');
    console.log('[InventoryTransactionController] Request IP:', req.ip);
    console.log('[InventoryTransactionController] Params:', req.params);
    
    try {
      const { productId } = req.params;
      console.log('[InventoryTransactionController] 🔍 Finding transactions for productId:', productId);
      
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const data = await inventoryTransaction.findByProductId(productId, {
        limit: parseInt(limit),
        offset,
        orderBy: 'changed_at DESC',
      });
      console.log('[InventoryTransactionController] ✅ Transactions found:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[InventoryTransactionController] ❌❌❌ ERROR IN getByProduct ❌❌❌');
      console.error('[InventoryTransactionController] Error message:', error.message);
      console.error('[InventoryTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByChangeType = async (req, res) => {
    console.log('========================================');
    console.log('[InventoryTransactionController] getByChangeType function called');
    console.log('[InventoryTransactionController] Request IP:', req.ip);
    console.log('[InventoryTransactionController] Params:', req.params);
    
    try {
      const { changeType } = req.params;
      console.log('[InventoryTransactionController] 🔍 Finding transactions for changeType:', changeType);
      
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const data = await inventoryTransaction.findByChangeType(changeType, {
        limit: parseInt(limit),
        offset,
        orderBy: 'changed_at DESC',
      });
      console.log('[InventoryTransactionController] ✅ Transactions found:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[InventoryTransactionController] ❌❌❌ ERROR IN getByChangeType ❌❌❌');
      console.error('[InventoryTransactionController] Error message:', error.message);
      console.error('[InventoryTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const recordTransaction = async (req, res) => {
    console.log('========================================');
    console.log('[InventoryTransactionController] recordTransaction function called');
    console.log('[InventoryTransactionController] Request IP:', req.ip);
    console.log('[InventoryTransactionController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { productId, quantity, changeType, reason, userId } = req.body;

      console.log('[InventoryTransactionController] 🔍 Validating input...');
      if (!productId || !quantity || !changeType) {
        console.log('[InventoryTransactionController] ❌ Validation failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'productId, quantity và changeType là bắt buộc',
        });
      }

      // Validate quantity là số
      if (typeof quantity !== 'number' && isNaN(parseInt(quantity))) {
        console.log('[InventoryTransactionController] ❌ Validation failed: quantity must be a number');
        return res.status(400).json({
          success: false,
          message: 'quantity phải là một số',
        });
      }

      // Validate changeType là một trong các giá trị hợp lệ
      const validChangeTypes = ['IN', 'OUT', 'SALE', 'RESTOCK', 'RETURN', 'ADJUSTMENT'];
      if (!validChangeTypes.includes(changeType.toUpperCase())) {
        console.log('[InventoryTransactionController] ❌ Validation failed: Invalid changeType');
        return res.status(400).json({
          success: false,
          message: `changeType phải là một trong: ${validChangeTypes.join(', ')}`,
        });
      }

      console.log('[InventoryTransactionController] 💾 Recording transaction...');
      const result = await inventoryTransaction.recordTransaction(
        productId,
        parseInt(quantity),
        changeType.toUpperCase(),
        reason,
        userId
      );
      console.log('[InventoryTransactionController] ✅ Transaction recorded successfully');
      console.log('[InventoryTransactionController] Transaction ID:', result.insertId);
      console.log('========================================');

      return res.status(201).json({
        success: true,
        message: 'Ghi nhận giao dịch kho thành công',
        data: result,
      });
    } catch (error) {
      console.error('[InventoryTransactionController] ❌❌❌ ERROR IN recordTransaction ❌❌❌');
      console.error('[InventoryTransactionController] Error message:', error.message);
      console.error('[InventoryTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
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
