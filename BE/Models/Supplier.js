const createBaseModel = require('./BaseModel');
const createSupplierModel = () => {
  const baseModel = createBaseModel({
    tableName: 'suppliers',
    primaryKey: 'supplier_id',
    columns: ['supplier_id', 'name', 'contact_info', 'created_at'],
  });
  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`name\` LIKE ?`;
    return baseModel.execute(sql, [`%${name}%`]);
  };
  return {
    ...baseModel,
    findByName,
  };
};
module.exports = createSupplierModel;
