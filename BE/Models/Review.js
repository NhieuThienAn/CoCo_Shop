const createBaseModel = require('./BaseModel');
const createReviewModel = () => {
  const baseModel = createBaseModel({
    tableName: 'reviews',
    primaryKey: 'review_id',
    columns: [
      'review_id',
      'user_id',
      'product_id',
      'rating',
      'comment',
      'created_at',
      'updated_at',
    ],
  });
  const findByProductId = async (productId, options = {}) => {
    const { limit, offset } = options;
    let sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` = ? ORDER BY \`created_at\` DESC`;
    if (limit) {
      sql += ` LIMIT ${parseInt(limit)}`;
      if (offset) {
        sql += ` OFFSET ${parseInt(offset)}`;
      }
    }
    return await baseModel.execute(sql, [productId]);
  };
  const findByUserId = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };
  const findByUserAndProduct = async (userId, productId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId, productId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  const getProductRating = async (productId) => {
    const sql = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(\`rating\`) as average_rating,
        SUM(CASE WHEN \`rating\` = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN \`rating\` = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN \`rating\` = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN \`rating\` = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN \`rating\` = 1 THEN 1 ELSE 0 END) as rating_1
      FROM \`${baseModel.tableName}\`
      WHERE \`product_id\` = ?
    `;
    const rows = await baseModel.execute(sql, [productId]);
    return rows[0] || {
      total_reviews: 0,
      average_rating: 0,
      rating_5: 0,
      rating_4: 0,
      rating_3: 0,
      rating_2: 0,
      rating_1: 0,
    };
  };
  return {
    ...baseModel,
    findByProductId,
    findByUserId,
    findByUserAndProduct,
    getProductRating,
  };
};
module.exports = createReviewModel;
