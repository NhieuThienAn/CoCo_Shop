const createBaseModel = require('./BaseModel');
const createAddressModel = () => {
  const baseModel = createBaseModel({
    tableName: 'addresses',
    primaryKey: 'address_id',
    columns: [
      'address_id',
      'user_id',
      'full_name',
      'phone',
      'address_line1',
      'address_line2',
      'city',
      'district',
      'ward',
      'province',
      'postal_code',
      'country',
      'is_default_shipping',
      'created_at',
      'updated_at',
    ],
  });
  const findByUserId = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`is_default_shipping\` DESC, \`created_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };
  const findDefaultShipping = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`is_default_shipping\` = 1 LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  const countByUserId = async (userId) => {
    const sql = `SELECT COUNT(*) as count FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ?`;
    const rows = await baseModel.execute(sql, [userId]);
    return Array.isArray(rows) && rows.length > 0 ? parseInt(rows[0].count || 0) : 0;
  };
  const setDefaultShipping = async (addressId, userId) => {
    const { getDatabase } = require('../Config/database');
    const pool = getDatabase();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `UPDATE \`${baseModel.tableName}\` SET \`is_default_shipping\` = 0 WHERE \`user_id\` = ?`,
        [userId]
      );
      await connection.execute(
        `UPDATE \`${baseModel.tableName}\` SET \`is_default_shipping\` = 1 WHERE \`address_id\` = ?`,
        [addressId]
      );
      await connection.commit();
      const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`address_id\` = ? LIMIT 1`;
      const [rows] = await connection.execute(sql, [addressId]);
      return Array.isArray(rows) ? rows[0] || null : rows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };
  return {
    ...baseModel,
    findByUserId,
    findDefaultShipping,
    countByUserId,
    setDefaultShipping,
  };
};
module.exports = createAddressModel;
