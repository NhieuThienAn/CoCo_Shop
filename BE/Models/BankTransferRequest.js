const createBaseModel = require('./BaseModel');
const createBankTransferRequestModel = () => {
  const baseModel = createBaseModel({
    tableName: 'bank_transfer_requests',
    primaryKey: 'transfer_id',
    columns: [
      'transfer_id',
      'account_from_id',
      'account_to_id',
      'account_to_details',
      'transfer_type',
      'amount',
      'currency',
      'fee',
      'status',
      'initiated_by',
      'initiated_at',
      'processed_at',
      'external_ref',
      'metadata',
    ],
  });
  const findByAccountFrom = async (accountFromId) => {
    return baseModel.findAll({ filters: { account_from_id: accountFromId }, orderBy: 'initiated_at DESC' });
  };
  const findByAccountTo = async (accountToId) => {
    return baseModel.findAll({ filters: { account_to_id: accountToId }, orderBy: 'initiated_at DESC' });
  };
  const findByStatus = async (status) => {
    return baseModel.findAll({ filters: { status }, orderBy: 'initiated_at DESC' });
  };
  const updateStatus = async (transferId, status, processedAt = null) => {
    return baseModel.update(transferId, {
      status,
      processed_at: processedAt || new Date(),
    });
  };
  return {
    ...baseModel,
    findByAccountFrom,
    findByAccountTo,
    findByStatus,
    updateStatus,
  };
};
module.exports = createBankTransferRequestModel;
