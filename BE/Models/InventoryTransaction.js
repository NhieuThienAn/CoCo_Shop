const createBaseModel = require('./BaseModel');

const createInventoryTransactionModel = () => {
  const baseModel = createBaseModel({
    tableName: 'inventorytransactions',
    primaryKey: 'inventory_id',
    columns: [
      'inventory_id',
      'product_id',
      'quantity_change',
      'change_type',
      'note',
      'changed_at',
      'created_by',
    ],
  });

  const findByProductId = async (productId, options = {}) => {
    const { limit, offset, orderBy = 'changed_at DESC' } = options;
    return baseModel.findAll({
      filters: { product_id: productId },
      limit,
      offset,
      orderBy,
    });
  };

  const findByChangeType = async (changeType, options = {}) => {
    const { limit, offset, orderBy = 'changed_at DESC' } = options;
    return baseModel.findAll({
      filters: { change_type: changeType },
      limit,
      offset,
      orderBy,
    });
  };

  const recordTransaction = async (productId, quantityChange, changeType, note = null, createdBy = null) => {
    return baseModel.create({
      product_id: productId,
      quantity_change: quantityChange,
      change_type: changeType,
      note,
      created_by: createdBy,
      changed_at: new Date(),
    });
  };

  /**
   * Batch record multiple inventory transactions using SQL INSERT with multiple VALUES (single SQL query)
   * Input: Array of { product_id, quantity_change, change_type, note, created_by }
   * This replaces multiple individual INSERT queries in loops
   */
  const batchRecordTransactions = async (transactions) => {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return;
    }

    const now = new Date();
    const values = transactions.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const params = transactions.flatMap(t => [
      t.product_id,
      t.quantity_change,
      t.change_type,
      t.note || null,
      t.created_by || null,
      now
    ]);

    const sql = `
      INSERT INTO \`${baseModel.tableName}\` 
      (\`product_id\`, \`quantity_change\`, \`change_type\`, \`note\`, \`created_by\`, \`changed_at\`)
      VALUES ${values}
    `;

    return await baseModel.execute(sql, params);
  };

  return {
    ...baseModel,
    findByProductId,
    findByChangeType,
    recordTransaction,
    batchRecordTransactions,
  };
};

module.exports = createInventoryTransactionModel;
