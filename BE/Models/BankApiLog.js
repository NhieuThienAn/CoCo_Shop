const createBaseModel = require('./BaseModel');
const createBankApiLogModel = () => {
  const baseModel = createBaseModel({
    tableName: 'bank_api_logs',
    primaryKey: 'log_id',
    columns: [
      'log_id',
      'bank_id',
      'account_id',
      'direction',
      'endpoint',
      'request_payload',
      'response_payload',
      'status_code',
      'duration_ms',
      'created_at',
    ],
  });
  const findByBankId = async (bankId, options = {}) => {
    const { limit, offset, orderBy = 'created_at DESC' } = options;
    return baseModel.findAll({
      filters: { bank_id: bankId },
      limit,
      offset,
      orderBy,
    });
  };
  const findByAccountId = async (accountId, options = {}) => {
    const { limit, offset, orderBy = 'created_at DESC' } = options;
    return baseModel.findAll({
      filters: { account_id: accountId },
      limit,
      offset,
      orderBy,
    });
  };
  return {
    ...baseModel,
    findByBankId,
    findByAccountId,
  };
};
module.exports = createBankApiLogModel;
