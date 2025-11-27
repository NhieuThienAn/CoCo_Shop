const createBaseModel = require('./BaseModel');

const createBankTransactionModel = () => {
  const baseModel = createBaseModel({
    tableName: 'bank_transactions',
    primaryKey: 'txn_id',
    columns: [
      'txn_id',
      'account_id',
      'external_txn_id',
      'txn_type',
      'amount',
      'currency',
      'description',
      'status',
      'balance_before',
      'balance_after',
      'related_order_id',
      'related_payment_id',
      'related_account_id',
      'metadata',
      'posted_at',
      'imported_at',
      'created_by',
    ],
  });

  const findByAccountId = async (accountId, options = {}) => {
    const { limit, offset, orderBy = 'posted_at DESC' } = options;
    return baseModel.findAll({
      filters: { account_id: accountId },
      limit,
      offset,
      orderBy,
    });
  };

  const findByExternalTxnId = async (externalTxnId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`external_txn_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [externalTxnId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByOrderId = async (orderId) => {
    return baseModel.findAll({ filters: { related_order_id: orderId } });
  };

  const findByPaymentId = async (paymentId) => {
    return baseModel.findAll({ filters: { related_payment_id: paymentId } });
  };

  const findFirstByPaymentId = async (paymentId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`related_payment_id\` = ? ORDER BY \`posted_at\` DESC LIMIT 1`;
    const rows = await baseModel.execute(sql, [paymentId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByStatus = async (status) => {
    return baseModel.findAll({ filters: { status }, orderBy: 'posted_at DESC' });
  };

  const findByDateRange = async (accountId, startDate, endDate) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` 
      WHERE \`account_id\` = ? 
      AND \`posted_at\` >= ? 
      AND \`posted_at\` <= ?
      ORDER BY \`posted_at\` DESC`;
    return baseModel.execute(sql, [accountId, startDate, endDate]);
  };

  return {
    ...baseModel,
    findByAccountId,
    findByExternalTxnId,
    findByOrderId,
    findByPaymentId,
    findFirstByPaymentId,
    findByStatus,
    findByDateRange,
  };
};

module.exports = createBankTransactionModel;
