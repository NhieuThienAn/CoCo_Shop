const createBaseModel = require('./BaseModel');

const createRoleModel = () => {
  const baseModel = createBaseModel({
    tableName: 'roles',
    primaryKey: 'role_id',
    columns: [
      'role_id',
      'role_name',
      'description',
    ],
  });

  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`role_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
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
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY role_id ASC';
    
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
    findAllWithCount,
  };
};

module.exports = createRoleModel;
