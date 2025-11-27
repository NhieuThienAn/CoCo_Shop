const createBaseModel = require('./BaseModel');

const createPurchaseOrderModel = () => {
  const baseModel = createBaseModel({
    tableName: 'purchaseorders',
    primaryKey: 'po_id',
    columns: [
      'po_id',
      'supplier_id',
      'po_number',
      'order_date',
      'expected_date',
      'status',
      'approval_status',
      'approved_by',
      'approved_at',
      'rejection_reason',
      'created_by',
      'items',
      'created_at',
    ],
  });

  const findByPoNumber = async (poNumber) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`po_number\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [poNumber]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findBySupplierId = async (supplierId) => {
    return baseModel.findAll({ filters: { supplier_id: supplierId }, orderBy: 'created_at DESC' });
  };

  const findByApprovalStatus = async (approvalStatus) => {
    return baseModel.findAll({ filters: { approval_status: approvalStatus }, orderBy: 'created_at DESC' });
  };

  const approve = async (poId, approvedBy) => {
    return baseModel.update(poId, {
      approval_status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date(),
    });
  };

  const reject = async (poId, approvedBy, rejectionReason) => {
    return baseModel.update(poId, {
      approval_status: 'rejected',
      approved_by: approvedBy,
      approved_at: new Date(),
      rejection_reason: rejectionReason,
    });
  };

  // Alias for backward compatibility
  const findBySupplier = findBySupplierId;

  /**
   * Find all with pagination and total count in single SQL query using window function
   * Returns { data: [...], total: number }
   * This replaces Promise.all with 2 separate queries
   */
  const findAllWithCount = async ({ filters = {}, limit, offset, orderBy } = {}) => {
    // Build WHERE clause manually (same logic as BaseModel.buildWhereClause)
    const columnSet = new Set(baseModel.columns);
    const filterKeys = Object.keys(filters).filter((key) => columnSet.has(key));
    
    const fragments = [];
    const values = [];
    
    filterKeys.forEach((key) => {
      const rawValue = filters[key];
      if (rawValue && typeof rawValue === 'object' && rawValue.hasOwnProperty('value')) {
        const operator = rawValue.operator || '=';
        fragments.push(`\`${key}\` ${operator} ?`);
        values.push(rawValue.value);
      } else if (rawValue === null || rawValue === 'null' || rawValue === 'NULL') {
        fragments.push(`\`${key}\` IS NULL`);
      } else {
        fragments.push(`\`${key}\` = ?`);
        values.push(rawValue);
      }
    });
    
    const whereClause = fragments.length > 0 ? `WHERE ${fragments.join(' AND ')}` : '';
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY created_at DESC';
    
    // Use window function COUNT(*) OVER() to get total count in single query
    const sql = `
      SELECT 
        *,
        COUNT(*) OVER() as total_count
      FROM \`${baseModel.tableName}\`
      ${whereClause}
      ${orderByClause}
      ${typeof limit === 'number' ? `LIMIT ${limit}` : ''}
      ${typeof offset === 'number' ? `OFFSET ${offset}` : ''}
    `;
    
    const rows = await baseModel.execute(sql, values);
    
    // Extract total from first row (all rows have same total_count)
    const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
    
    // Remove total_count from each row
    const data = (rows || []).map(row => {
      const { total_count, ...rest } = row;
      return rest;
    });
    
    return { data, total };
  };

  return {
    ...baseModel,
    findByPoNumber,
    findBySupplierId,
    findBySupplier, // Alias
    findByApprovalStatus,
    approve,
    reject,
    findAllWithCount,
  };
};

module.exports = createPurchaseOrderModel;
