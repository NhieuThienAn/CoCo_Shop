const createBaseModel = require('./BaseModel');

const createShipmentModel = () => {
  const baseModel = createBaseModel({
    tableName: 'shipments',
    primaryKey: 'shipment_id',
    columns: [
      'shipment_id',
      'order_id',
      'shipper_id',
      'shipped_date',
      'delivered_date',
      'tracking_number',
      'shipment_status',
      'created_at',
    ],
  });

  const findByOrderId = async (orderId) => {
    return baseModel.findAll({ filters: { order_id: orderId }, orderBy: 'created_at DESC' });
  };

  const findByShipperId = async (shipperId) => {
    return baseModel.findAll({ filters: { shipper_id: shipperId }, orderBy: 'created_at DESC' });
  };

  const findByTrackingNumber = async (trackingNumber) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`tracking_number\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [trackingNumber]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  /**
   * Find shipment by order_id and shipper_id (SQL WHERE clause)
   */
  const findByOrderIdAndShipperId = async (orderId, shipperId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND \`shipper_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId, shipperId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  /**
   * Check if order has any shipment with shipper_id (SQL WHERE clause instead of JavaScript some)
   */
  const hasShipperForOrder = async (orderId) => {
    const sql = `SELECT COUNT(*) as count FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND \`shipper_id\` IS NOT NULL LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId]);
    const count = Array.isArray(rows) && rows[0] ? parseInt(rows[0].count || 0) : 0;
    return count > 0;
  };

  const updateShipmentStatus = async (shipmentId, status, shippedDate = null, deliveredDate = null) => {
    const updateData = { shipment_status: status };
    if (shippedDate) updateData.shipped_date = shippedDate;
    if (deliveredDate) updateData.delivered_date = deliveredDate;
    return baseModel.update(shipmentId, updateData);
  };

  return {
    ...baseModel,
    findByOrderId,
    findByShipperId,
    findByTrackingNumber,
    findByOrderIdAndShipperId,
    hasShipperForOrder,
    updateShipmentStatus,
  };
};

module.exports = createShipmentModel;
