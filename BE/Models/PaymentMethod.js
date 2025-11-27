const createBaseModel = require('./BaseModel');

const createPaymentMethodModel = () => {
  const baseModel = createBaseModel({
    tableName: 'paymentmethods',
    primaryKey: 'payment_method_id',
    columns: [
      'payment_method_id',
      'method_name',
      'description',
    ],
  });

  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`method_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  /**
   * Find first payment method by name pattern (SQL LIKE)
   * Returns single payment method object or null
   */
  const findFirstByNameLike = async (pattern) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE LOWER(\`method_name\`) LIKE ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [`%${pattern}%`]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  /**
   * Find first payment method by multiple name patterns using SQL OR LIKE (single SQL query)
   * Returns single payment method object or null (first match)
   * This replaces multiple individual queries in loops
   */
  const findFirstByNamePatterns = async (patterns) => {
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return null;
    }
    const likeConditions = patterns.map(() => `LOWER(\`method_name\`) LIKE ?`).join(' OR ');
    const likeValues = patterns.map(pattern => `%${pattern}%`);
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE ${likeConditions} LIMIT 1`;
    const rows = await baseModel.execute(sql, likeValues);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  /**
   * Find all with pagination and total count in single SQL query using window function
   * Returns { data: [...], total: number }
   * This replaces Promise.all with 2 separate queries (findAll + count)
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
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY payment_method_id ASC';
    
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
    findByName,
    findFirstByNameLike,
    findFirstByNamePatterns,
    findAllWithCount,
  };
};

module.exports = createPaymentMethodModel;
