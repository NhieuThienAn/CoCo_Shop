const createBaseModel = require('./BaseModel');

const createPaymentModel = () => {
  const baseModel = createBaseModel({
    tableName: 'payments',
    primaryKey: 'payment_id',
    columns: [
      'payment_id',
      'order_id',
      'payment_method_id',
      'gateway',
      'gateway_transaction_id',
      'gateway_status',
      'gateway_response',
      'is_captured',
      'refunded_amount',
      'attempt_count',
      'last_attempt_at',
      'metadata',
      'amount',
      'payment_status_id',
      'paid_at',
      'transaction_reference',
      'payment_logs',
      'created_at',
    ],
  });

  const findByOrderId = async (orderId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [orderId]);
  };

  const findByOrderIds = async (orderIds) => {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return [];
    }
    const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
    if (uniqueOrderIds.length === 0) {
      return [];
    }
    const placeholders = uniqueOrderIds.map(() => '?').join(',');
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` IN (${placeholders}) ORDER BY \`order_id\` ASC, \`created_at\` DESC`;
    return await baseModel.execute(sql, uniqueOrderIds);
  };

  const findFirstByOrderId = async (orderId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? ORDER BY \`created_at\` DESC LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByGatewayTransactionId = async (gatewayTransactionId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`gateway_transaction_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [gatewayTransactionId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByOrderIdAndStatus = async (orderId, paymentStatusId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND \`payment_status_id\` = ? ORDER BY \`created_at\` DESC LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId, paymentStatusId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByOrderIdStatusAndGateway = async (orderId, paymentStatusId, gateway) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND \`payment_status_id\` = ? AND UPPER(\`gateway\`) = UPPER(?) ORDER BY \`created_at\` DESC LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId, paymentStatusId, gateway]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findAllByOrderIdStatusAndGateway = async (orderId, paymentStatusId, gateway) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND \`payment_status_id\` = ? AND UPPER(\`gateway\`) = UPPER(?) ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [orderId, paymentStatusId, gateway]);
  };

  const findByOrderIdAndGateway = async (orderId, gateway) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND UPPER(\`gateway\`) = UPPER(?) ORDER BY \`created_at\` DESC LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId, gateway]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByOrderIdStatusGatewayAndMethod = async (orderId, paymentStatusId, gateway, paymentMethodId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? AND \`payment_status_id\` = ? AND UPPER(\`gateway\`) = UPPER(?) AND \`payment_method_id\` = ? ORDER BY \`created_at\` DESC LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderId, paymentStatusId, gateway, paymentMethodId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const markAsPaid = async (paymentId, paidAt = null) => {

    const createPaymentStatusModel = require('./PaymentStatus');
    const paymentStatus = createPaymentStatusModel();
    let paidStatusId = null;
    try {
      const paidStatus = await paymentStatus.findByName('Paid');
      if (paidStatus && paidStatus.payment_status_id) {
        paidStatusId = paidStatus.payment_status_id;
      } else {
        const { paymentStatus } = require('../Models');
        const statusRow = await paymentStatus.findFirstByNameLike('paid');
        if (statusRow && statusRow.payment_status_id) {
          paidStatusId = statusRow.payment_status_id;
        } else {
          const [createStatusResult] = await db.execute(
            'INSERT INTO `paymentstatus` (`status_name`) VALUES (?)',
            ['Paid']
          );
          if (createStatusResult && createStatusResult.insertId) {
            paidStatusId = createStatusResult.insertId;
          }
        }
      }
    } catch (statusError) {
      console.error('[Payment Model] Error finding/creating payment status:', statusError.message);
    }

    if (!paidStatusId) {
      console.error('[Payment Model] Could not find or create Paid payment status');
      throw new Error('Không thể tìm thấy trạng thái thanh toán Paid');
    }

    const updateData = {
      payment_status_id: paidStatusId,
      paid_at: paidAt || new Date(),
    };
    return await baseModel.update(paymentId, updateData);
  };

  const updateGatewayResponse = async (paymentId, gatewayResponse, gatewayStatus = null) => {
    const updateData = {
      gateway_response: typeof gatewayResponse === 'string' 
        ? gatewayResponse 
        : JSON.stringify(gatewayResponse),
    };

    if (gatewayStatus) {
      updateData.gateway_status = gatewayStatus;
    }

    return await baseModel.update(paymentId, updateData);
  };

  return {
    ...baseModel,
    findByOrderId,
    findByOrderIds,
    findFirstByOrderId,
    findByGatewayTransactionId,
    findByOrderIdAndStatus,
    findByOrderIdStatusAndGateway,
    findAllByOrderIdStatusAndGateway,
    findByOrderIdAndGateway,
    findByOrderIdStatusGatewayAndMethod,
    markAsPaid,
    updateGatewayResponse,
  };
};

module.exports = createPaymentModel;
