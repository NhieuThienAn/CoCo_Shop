const createBaseModel = require('./BaseModel');
const createPaymentStatusModel = () => {
  const baseModel = createBaseModel({
    tableName: 'paymentstatus',
    primaryKey: 'payment_status_id',
    columns: [
      'payment_status_id',
      'status_name',
    ],
  });
  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  const findFirstByNameLike = async (pattern) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE LOWER(\`status_name\`) LIKE ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [`%${pattern}%`]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  return {
    ...baseModel,
    findByName,
    findFirstByNameLike,
  };
};
module.exports = createPaymentStatusModel;
