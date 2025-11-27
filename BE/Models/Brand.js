const createBaseModel = require('./BaseModel');

const createBrandModel = () => {
  const baseModel = createBaseModel({
    tableName: 'brands',
    primaryKey: 'brand_id',
    columns: [
      'brand_id',
      'name',
      'description',
      'created_at',
    ],
  });

  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  return {
    ...baseModel,
    findByName,
  };
};

module.exports = createBrandModel;
