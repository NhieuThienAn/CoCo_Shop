const createBaseModel = require('./BaseModel');

const createReturnRequestModel = () => {
  const baseModel = createBaseModel({
    tableName: 'returnrequests',
    primaryKey: 'return_id',
    columns: [
      'return_id',
      'order_id',
      'user_id',
      'requested_at',
      'status',
      'reason',
      'processed_at',
      'processed_by',
      'items',
    ],
  });

  const findByOrderId = async (orderId) => {
    return baseModel.findAll({ filters: { order_id: orderId }, orderBy: 'requested_at DESC' });
  };

  const findByUserId = async (userId) => {
    return baseModel.findAll({ filters: { user_id: userId }, orderBy: 'requested_at DESC' });
  };

  const findByStatus = async (status) => {
    return baseModel.findAll({ filters: { status }, orderBy: 'requested_at DESC' });
  };

  const processReturn = async (returnId, processedBy, status) => {
    return baseModel.update(returnId, {
      status,
      processed_by: processedBy,
      processed_at: new Date(),
    });
  };

  return {
    ...baseModel,
    findByOrderId,
    findByUserId,
    findByStatus,
    processReturn,
  };
};

module.exports = createReturnRequestModel;
