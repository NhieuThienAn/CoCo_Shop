const createBaseModel = require('./BaseModel');

const createStockReceiptModel = () => {
  const baseModel = createBaseModel({
    tableName: 'stockreceipts',
    primaryKey: 'receipt_id',
    columns: [
      'receipt_id',
      'receipt_number',
      'status',
      'items',
      'notes',
      'created_by',
      'approved_by',
      'approved_at',
      'rejection_reason',
      'created_at',
      'updated_at',
    ],
  });

  const findByReceiptNumber = async (receiptNumber) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`receipt_number\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [receiptNumber]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByStatus = async (status) => {
    return baseModel.findAll({ 
      filters: { status }, 
      orderBy: 'created_at DESC' 
    });
  };

  const approve = async (receiptId, approvedBy) => {
    return baseModel.update(receiptId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date(),
    });
  };

  const reject = async (receiptId, approvedBy, rejectionReason) => {
    return baseModel.update(receiptId, {
      status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date(),
      rejection_reason: rejectionReason,
    });
  };

  return {
    ...baseModel,
    findByReceiptNumber,
    findByStatus,
    approve,
    reject,
  };
};

module.exports = createStockReceiptModel;

