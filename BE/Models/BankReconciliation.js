const createBaseModel = require('./BaseModel');
const createBankReconciliationModel = () => {
  const baseModel = createBaseModel({
    tableName: 'bank_reconciliations',
    primaryKey: 'reconciliation_id',
    columns: [
      'reconciliation_id',
      'bank_txn_id',
      'order_id',
      'payment_id',
      'matched_by',
      'matched_at',
      'match_score',
      'notes',
    ],
  });
  const findByBankTransaction = async (bankTxnId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`bank_txn_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [bankTxnId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  const findByOrderId = async (orderId) => {
    return baseModel.findAll({ filters: { order_id: orderId } });
  };
  const findByPaymentId = async (paymentId) => {
    return baseModel.findAll({ filters: { payment_id: paymentId } });
  };
  return {
    ...baseModel,
    findByBankTransaction,
    findByOrderId,
    findByPaymentId,
  };
};
module.exports = createBankReconciliationModel;
