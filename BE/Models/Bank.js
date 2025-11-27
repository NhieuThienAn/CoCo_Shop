const createBaseModel = require('./BaseModel');

const createBankModel = () => {
  const baseModel = createBaseModel({
    tableName: 'banks',
    primaryKey: 'bank_id',
    columns: [
      'bank_id',
      'provider_name',
      'provider_code',
      'is_internal',
      'country',
      'support_webhooks',
      'api_docs',
      'contact_info',
      'notes',
      'created_at',
      'updated_at',
    ],
  });

  const findByProviderCode = async (providerCode) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`provider_code\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [providerCode]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findInternalBanks = async () => {
    return baseModel.findAll({ filters: { is_internal: 1 } });
  };

  const findFirstInternalBank = async () => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`is_internal\` = 1 LIMIT 1`;
    const rows = await baseModel.execute(sql, []);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findExternalBanks = async () => {
    return baseModel.findAll({ filters: { is_internal: 0 } });
  };

  return {
    ...baseModel,
    findByProviderCode,
    findInternalBanks,
    findFirstInternalBank,
    findExternalBanks,
  };
};

module.exports = createBankModel;
