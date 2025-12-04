const { getDatabase } = require('../Config/database');
const {
  order,
  payment,
  user,
  product,
  orderItem,
  orderStatus,
  paymentStatus,
  paymentMethod,
  coupon,
  review,
  bankTransaction,
  bankAccount,
} = require('../Models');
const parseDateRange = (startDate, endDate) => {
  let start = null;
  let end = null;
  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      start = null;
    } else {
      start.setHours(0, 0, 0, 0);
    }
  }
  if (endDate) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      end = null;
    } else {
      end.setHours(23, 59, 59, 999);
    }
  }
  return { start, end };
};
const buildDateFilter = (column, start, end) => {
  const conditions = [];
  const values = [];
  if (start) {
    conditions.push(`${column} >= ?`);
    values.push(start);
  }
  if (end) {
    conditions.push(`${column} <= ?`);
    values.push(end);
  }
  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : null,
    values,
  };
};
const convertDateFilterForAlias = (clause, alias) => {
  if (!clause || !alias) return clause;
  return clause.replace(/\bcreated_at\b/g, `${alias}.created_at`);
};
const getPaidStatusId = async () => {
  try {
    const paidStatus = await paymentStatus.findByName('Paid');
    if (paidStatus && paidStatus.payment_status_id) {
      return paidStatus.payment_status_id;
    }
    const { paymentStatus } = require('../Models');
    const statusRow = await paymentStatus.findFirstByNameLike('paid');
    if (statusRow && statusRow.payment_status_id) {
      return statusRow.payment_status_id;
    }
    console.warn('[StatisticsController] ⚠️ Could not find Paid status, using default 2');
    return 2;
  } catch (error) {
    console.error('[StatisticsController] Error finding Paid status:', error.message);
    return 2;
  }
};
const getOverview = async (req, res) => {
  console.log('[StatisticsController] ========================================');
  console.log('[StatisticsController] getOverview called');
  console.log('[StatisticsController] Query params:', req.query);
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    console.log('[StatisticsController] Parsed dates:', { start, end });
    const db = getDatabase();
    const dateFilter = buildDateFilter('created_at', start, end);
    const dateWhere = dateFilter.clause ? `WHERE ${dateFilter.clause}` : '';
    const dateValues = dateFilter.values;
    console.log('[StatisticsController] Query 1: Total orders');
    console.log('[StatisticsController] SQL:', `SELECT COUNT(*) as total FROM \`orders\` ${dateWhere}`);
    console.log('[StatisticsController] Values:', dateValues);
    const [orderCountRows] = await db.execute(
      `SELECT COUNT(*) as total FROM \`orders\` ${dateWhere}`,
      dateValues
    );
    console.log('[StatisticsController] Order count result:', orderCountRows);
    const totalOrders = parseInt(orderCountRows?.[0]?.total || 0);
    console.log('[StatisticsController] Total orders:', totalOrders);
    const paidStatusId = await getPaidStatusId();
    console.log('[StatisticsController] Paid status ID:', paidStatusId);
    const revenueDateClause = dateFilter.clause ? `AND ${convertDateFilterForAlias(dateFilter.clause, 'o')}` : '';
    const revenueQuery = `SELECT COALESCE(SUM(p.amount), 0) as total_revenue 
       FROM \`payments\` p
       INNER JOIN \`orders\` o ON p.order_id = o.order_id
       WHERE p.payment_status_id = ? ${revenueDateClause}`;
    console.log('[StatisticsController] Query 2: Total revenue');
    console.log('[StatisticsController] SQL:', revenueQuery);
    console.log('[StatisticsController] Values:', [paidStatusId, ...dateValues]);
    const [revenueResult] = await db.execute(revenueQuery, [paidStatusId, ...dateValues]);
    console.log('[StatisticsController] Revenue result:', revenueResult);
    const totalRevenue = parseFloat(revenueResult?.[0]?.total_revenue || 0);
    console.log('[StatisticsController] Total revenue:', totalRevenue);
    const userDateFilter = buildDateFilter('created_at', start, end);
    const userWhere = userDateFilter.clause ? `WHERE role_id = 3 AND ${userDateFilter.clause}` : 'WHERE role_id = 3';
    console.log('[StatisticsController] Query 3: Total customers');
    console.log('[StatisticsController] SQL:', `SELECT COUNT(*) as total FROM \`users\` ${userWhere}`);
    console.log('[StatisticsController] Values:', userDateFilter.values);
    const [userCountResult] = await db.execute(
      `SELECT COUNT(*) as total FROM \`users\` ${userWhere}`,
      userDateFilter.values
    );
    console.log('[StatisticsController] User count result:', userCountResult);
    const totalCustomers = parseInt(userCountResult?.[0]?.total || 0);
    console.log('[StatisticsController] Total customers:', totalCustomers);
    let productCountQuery = 'SELECT COUNT(*) as total FROM `products`';
    let productCountValues = [];
    if (dateFilter.clause) {
      productCountQuery = `SELECT COUNT(*) as total FROM \`products\` WHERE created_at IS NOT NULL AND ${dateFilter.clause}`;
      productCountValues = dateValues;
    }
    console.log('[StatisticsController] Query 4: Total products');
    console.log('[StatisticsController] SQL:', productCountQuery);
    console.log('[StatisticsController] Values:', productCountValues);
    const [productCountResult] = await db.execute(productCountQuery, productCountValues);
    console.log('[StatisticsController] Product count result:', productCountResult);
    const totalProducts = parseInt(productCountResult?.[0]?.total || 0);
    console.log('[StatisticsController] Total products:', totalProducts);
    const orderStatusOnClause = dateFilter.clause 
      ? `ON os.status_id = o.status_id AND ${convertDateFilterForAlias(dateFilter.clause, 'o')}`
      : `ON os.status_id = o.status_id`;
    const orderStatusQuery = `SELECT 
        os.status_id,
        os.status_name,
        COUNT(o.order_id) as count
       FROM \`orderstatus\` os
       LEFT JOIN \`orders\` o ${orderStatusOnClause}
       GROUP BY os.status_id, os.status_name
       ORDER BY os.status_id`;
    console.log('[StatisticsController] Query 5: Order status counts');
    console.log('[StatisticsController] SQL:', orderStatusQuery);
    console.log('[StatisticsController] Values:', dateValues);
    const [orderStatusCountsRows] = await db.execute(orderStatusQuery, dateValues);
    console.log('[StatisticsController] Order status counts result:', orderStatusCountsRows?.length || 0, 'rows');
    const orderStatusCounts = orderStatusCountsRows || [];
    const paymentMethodPaidStatusId = await getPaidStatusId();
    const paymentMethodOrderJoin = dateFilter.clause
      ? `LEFT JOIN \`orders\` o ON p.order_id = o.order_id AND ${convertDateFilterForAlias(dateFilter.clause, 'o')}`
      : `LEFT JOIN \`orders\` o ON p.order_id = o.order_id`;
    const paymentMethodQuery = `SELECT 
        pm.payment_method_id,
        pm.method_name,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COUNT(p.payment_id) as payment_count
       FROM \`paymentmethods\` pm
       LEFT JOIN \`payments\` p ON pm.payment_method_id = p.payment_method_id 
         AND p.payment_status_id = ?
       ${paymentMethodOrderJoin}
       GROUP BY pm.payment_method_id, pm.method_name
       ORDER BY total_revenue DESC`;
    console.log('[StatisticsController] Query 6: Revenue by payment method');
    console.log('[StatisticsController] SQL:', paymentMethodQuery);
    console.log('[StatisticsController] Values:', [paymentMethodPaidStatusId, ...dateValues]);
    let revenueByPaymentMethodRows;
    try {
      [revenueByPaymentMethodRows] = await db.execute(paymentMethodQuery, [paymentMethodPaidStatusId, ...dateValues]);
      console.log('[StatisticsController] Revenue by payment method result:', revenueByPaymentMethodRows?.length || 0, 'rows');
    } catch (paymentMethodError) {
      console.error('[StatisticsController] ❌ Payment method revenue query failed:', paymentMethodError.message);
      console.error('[StatisticsController] Error stack:', paymentMethodError.stack);
      throw paymentMethodError;
    }
    const revenueByPaymentMethod = revenueByPaymentMethodRows || [];
    const topProductsWhere = dateFilter.clause ? `WHERE ${convertDateFilterForAlias(dateFilter.clause, 'o')}` : '';
    const topProductsQuery = `SELECT 
        p.id as product_id,
        p.product_id,
        p.name,
        p.slug,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue
       FROM \`orderitems\` oi
       INNER JOIN \`products\` p ON oi.product_id = p.id
       INNER JOIN \`orders\` o ON oi.order_id = o.order_id
       ${topProductsWhere}
       GROUP BY p.id, p.product_id, p.name, p.slug
       HAVING total_sold > 0
       ORDER BY total_sold DESC
       LIMIT 10`;
    console.log('[StatisticsController] Query 7: Top products');
    console.log('[StatisticsController] SQL:', topProductsQuery);
    console.log('[StatisticsController] Values:', dateValues);
    let topProductsRows;
    try {
      [topProductsRows] = await db.execute(topProductsQuery, dateValues);
      console.log('[StatisticsController] Top products result:', topProductsRows?.length || 0, 'rows');
      if (topProductsRows && topProductsRows.length > 0) {
        console.log('[StatisticsController] First product sample:', JSON.stringify(topProductsRows[0], null, 2));
      }
    } catch (topProductsError) {
      console.error('[StatisticsController] ❌ Top products query failed:', topProductsError.message);
      console.error('[StatisticsController] Error stack:', topProductsError.stack);
      throw topProductsError;
    }
    const topProducts = topProductsRows || [];
    const revenueByDayPaidStatusId = await getPaidStatusId();
    let revenueByDay;
    if (start && end) {
      const revenueByDayQuery = `SELECT 
          DATE(o.created_at) as date,
          COALESCE(SUM(p.amount), 0) as revenue,
          COUNT(DISTINCT o.order_id) as order_count
         FROM \`orders\` o
         LEFT JOIN \`payments\` p ON o.order_id = p.order_id AND p.payment_status_id = ?
         WHERE o.created_at >= ? AND o.created_at <= ?
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`;
      console.log('[StatisticsController] Query 8: Revenue by day (date range)');
      console.log('[StatisticsController] SQL:', revenueByDayQuery);
      console.log('[StatisticsController] Values:', [revenueByDayPaidStatusId, start, end]);
      const [revenueByDayRows] = await db.execute(revenueByDayQuery, [revenueByDayPaidStatusId, start, end]);
      console.log('[StatisticsController] Revenue by day result:', revenueByDayRows?.length || 0, 'rows');
      revenueByDay = revenueByDayRows || [];
    } else {
      const revenueByDayQuery = `SELECT 
          DATE(o.created_at) as date,
          COALESCE(SUM(p.amount), 0) as revenue,
          COUNT(DISTINCT o.order_id) as order_count
         FROM \`orders\` o
         LEFT JOIN \`payments\` p ON o.order_id = p.order_id AND p.payment_status_id = ?
         WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`;
      console.log('[StatisticsController] Query 8: Revenue by day (last 7 days)');
      console.log('[StatisticsController] SQL:', revenueByDayQuery);
      console.log('[StatisticsController] Values:', [revenueByDayPaidStatusId]);
      const [revenueByDayRows] = await db.execute(revenueByDayQuery, [revenueByDayPaidStatusId]);
      console.log('[StatisticsController] Revenue by day result:', revenueByDayRows?.length || 0, 'rows');
      revenueByDay = revenueByDayRows || [];
    }
    const responseData = {
      summary: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
      },
      orderStatusCounts: orderStatusCounts,
      revenueByPaymentMethod: revenueByPaymentMethod,
      topProducts: topProducts,
      revenueByDay: revenueByDay,
      dateRange: {
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
      },
    };
    console.log('[StatisticsController] ✅ Overview response prepared');
    console.log('[StatisticsController] Summary:', JSON.stringify(responseData.summary, null, 2));
    console.log('[StatisticsController] ========================================');
    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('[StatisticsController] ❌ ERROR IN getOverview:', error.message);
    console.error('[StatisticsController] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tổng quan',
      error: error.message,
    });
  }
};
const getOrderStatistics = async (req, res) => {
  console.log('[StatisticsController] ========================================');
  console.log('[StatisticsController] getOrderStatistics called');
  console.log('[StatisticsController] Query params:', req.query);
  try {
    const { startDate, endDate, statusId, paymentMethodId } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    console.log('[StatisticsController] Parsed dates:', { start, end });
    const db = getDatabase();
    const conditions = [];
    const values = [];
    if (start) {
      conditions.push('o.created_at >= ?');
      values.push(start);
    }
    if (end) {
      conditions.push('o.created_at <= ?');
      values.push(end);
    }
    if (statusId) {
      conditions.push('o.status_id = ?');
      values.push(parseInt(statusId));
    }
    const orderConditions = [];
    const orderValues = [];
    if (start) {
      orderConditions.push('o.created_at >= ?');
      orderValues.push(start);
    }
    if (end) {
      orderConditions.push('o.created_at <= ?');
      orderValues.push(end);
    }
    if (statusId) {
      orderConditions.push('o.status_id = ?');
      orderValues.push(parseInt(statusId));
    }
    const orderWhereClause = orderConditions.length > 0 ? `AND ${orderConditions.join(' AND ')}` : '';
    let paymentJoin = '';
    let paymentFilter = '';
    if (paymentMethodId) {
      paymentJoin = 'INNER JOIN `payments` p ON o.order_id = p.order_id';
      paymentFilter = 'AND p.payment_method_id = ?';
      orderValues.push(parseInt(paymentMethodId));
    }
    const [ordersByStatusRows] = await db.execute(
      `SELECT 
        os.status_id,
        os.status_name,
        COUNT(DISTINCT o.order_id) as count,
        COALESCE(SUM(o.total_amount), 0) as total_amount
       FROM \`orderstatus\` os
       LEFT JOIN \`orders\` o ON os.status_id = o.status_id ${orderWhereClause}
       ${paymentJoin}
       ${paymentFilter}
       GROUP BY os.status_id, os.status_name
       ORDER BY os.status_id`,
      orderValues
    );
    const ordersByStatus = ordersByStatusRows || [];
    let ordersByDay;
    const ordersByDayConditions = [...orderConditions];
    const ordersByDayValues = [...orderValues];
    if (paymentMethodId) {
      ordersByDayConditions.push('p.payment_method_id = ?');
      ordersByDayValues.push(parseInt(paymentMethodId));
    }
    const ordersByDayWhere = ordersByDayConditions.length > 0 ? `WHERE ${ordersByDayConditions.join(' AND ')}` : '';
    const ordersByDayPaymentJoin = paymentMethodId ? 'INNER JOIN `payments` p ON o.order_id = p.order_id' : '';
    if (start && end) {
      const [ordersByDayRows] = await db.execute(
        `SELECT 
          DATE(o.created_at) as date,
          COUNT(DISTINCT o.order_id) as count,
          COALESCE(SUM(o.total_amount), 0) as total_amount
         FROM \`orders\` o
         ${ordersByDayPaymentJoin}
         ${ordersByDayWhere}
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`,
        ordersByDayValues
      );
      ordersByDay = ordersByDayRows || [];
    } else {
      const [ordersByDayRows] = await db.execute(
        `SELECT 
          DATE(o.created_at) as date,
          COUNT(DISTINCT o.order_id) as count,
          COALESCE(SUM(o.total_amount), 0) as total_amount
         FROM \`orders\` o
         ${ordersByDayPaymentJoin}
         ${ordersByDayWhere}
         GROUP BY DATE(o.created_at)
         ORDER BY date DESC
         LIMIT 30`,
        ordersByDayValues
      );
      ordersByDay = ordersByDayRows || [];
    }
    const [ordersByMonthRows] = await db.execute(
      `SELECT 
        DATE_FORMAT(o.created_at, '%Y-%m') as month,
        COUNT(DISTINCT o.order_id) as count,
        COALESCE(SUM(o.total_amount), 0) as total_amount
       FROM \`orders\` o
       ${ordersByDayPaymentJoin}
       ${ordersByDayWhere}
       GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      ordersByDayValues
    );
    const ordersByMonth = ordersByMonthRows || [];
    const responseData = {
      ordersByStatus: ordersByStatus,
      ordersByDay: ordersByDay,
      ordersByMonth: ordersByMonth,
      filters: {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        statusId: statusId ? parseInt(statusId) : null,
        paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : null,
      },
    };
    console.log('[StatisticsController] ✅ Order statistics response prepared');
    console.log('[StatisticsController] Orders by status:', ordersByStatus.length, 'statuses');
    console.log('[StatisticsController] ========================================');
    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('[StatisticsController] ❌ ERROR IN getOrderStatistics:', error.message);
    console.error('[StatisticsController] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê đơn hàng',
      error: error.message,
    });
  }
};
const getRevenueStatistics = async (req, res) => {
  console.log('[StatisticsController] ========================================');
  console.log('[StatisticsController] getRevenueStatistics called');
  console.log('[StatisticsController] Query params:', req.query);
  try {
    const { startDate, endDate, paymentMethodId, groupBy = 'day' } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    console.log('[StatisticsController] Parsed dates:', { start, end });
    const db = getDatabase();
    const conditions = [];
    const values = [];
    if (start) {
      conditions.push('o.created_at >= ?');
      values.push(start);
    }
    if (end) {
      conditions.push('o.created_at <= ?');
      values.push(end);
    }
    if (paymentMethodId) {
      conditions.push('p.payment_method_id = ?');
      values.push(parseInt(paymentMethodId));
    }
    const paidStatusId = await getPaidStatusId();
    conditions.push('p.payment_status_id = ?');
    values.push(paidStatusId);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let revenueData;
    let groupByClause;
    switch (groupBy) {
      case 'day':
        groupByClause = 'DATE(o.created_at)';
        break;
      case 'month':
        groupByClause = "DATE_FORMAT(o.created_at, '%Y-%m')";
        break;
      case 'year':
        groupByClause = "DATE_FORMAT(o.created_at, '%Y')";
        break;
      default:
        groupByClause = 'DATE(o.created_at)';
    }
    const [revenueDataRows] = await db.execute(
      `SELECT 
        ${groupByClause} as period,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT p.payment_id) as payment_count,
        COUNT(DISTINCT o.order_id) as order_count
       FROM \`payments\` p
       INNER JOIN \`orders\` o ON p.order_id = o.order_id
       ${whereClause}
       GROUP BY ${groupByClause}
       ORDER BY period ${groupBy === 'day' ? 'ASC' : 'DESC'}
       ${groupBy === 'day' ? '' : 'LIMIT 50'}`,
      values
    );
    revenueData = revenueDataRows || [];
    const [totalRevenueResult] = await db.execute(
      `SELECT 
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COUNT(DISTINCT p.payment_id) as total_payments,
        COUNT(DISTINCT o.order_id) as total_orders,
        AVG(p.amount) as avg_order_value
       FROM \`payments\` p
       INNER JOIN \`orders\` o ON p.order_id = o.order_id
       ${whereClause}`,
      values
    );
    const revenuePaidStatusId = await getPaidStatusId();
    const paymentMethodConditions = [...conditions];
    const paymentMethodValues = [...values];
    paymentMethodValues.pop();
    paymentMethodConditions.pop();
    const paymentMethodWhere = paymentMethodConditions.length > 0 ? `WHERE ${paymentMethodConditions.join(' AND ')}` : '';
    const paymentMethodQuery = `SELECT 
        pm.payment_method_id,
        pm.method_name,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(p.payment_id) as payment_count
       FROM \`paymentmethods\` pm
       LEFT JOIN \`payments\` p ON pm.payment_method_id = p.payment_method_id 
         AND p.payment_status_id = ?
       LEFT JOIN \`orders\` o ON p.order_id = o.order_id
       ${paymentMethodWhere}
       GROUP BY pm.payment_method_id, pm.method_name
       ORDER BY revenue DESC`;
    let revenueByPaymentMethodRows;
    try {
      [revenueByPaymentMethodRows] = await db.execute(paymentMethodQuery, [revenuePaidStatusId, ...paymentMethodValues]);
    } catch (paymentMethodError) {
      console.error('[StatisticsController] ❌ Payment method revenue query (getRevenueStatistics) failed:', paymentMethodError.message);
      throw paymentMethodError;
    }
    const revenueByPaymentMethod = revenueByPaymentMethodRows || [];
    const responseData = {
      revenueData: revenueData,
      summary: totalRevenueResult?.[0] || {},
      revenueByPaymentMethod: revenueByPaymentMethod,
      filters: {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : null,
        groupBy,
      },
    };
    console.log('[StatisticsController] ✅ Revenue statistics response prepared');
    console.log('[StatisticsController] Revenue data points:', revenueData.length);
    console.log('[StatisticsController] Total revenue:', responseData.summary.total_revenue);
    console.log('[StatisticsController] ========================================');
    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('[StatisticsController] ❌ ERROR IN getRevenueStatistics:', error.message);
    console.error('[StatisticsController] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê doanh thu',
      error: error.message,
    });
  }
};
const getUserStatistics = async (req, res) => {
  console.log('[StatisticsController] ========================================');
  console.log('[StatisticsController] getUserStatistics called');
  console.log('[StatisticsController] Query params:', req.query);
  try {
    const { startDate, endDate, roleId } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);
    console.log('[StatisticsController] Parsed dates:', { start, end });
    const db = getDatabase();
    const dateConditions = [];
    const dateValues = [];
    const roleConditions = [];
    const roleValues = [];
    if (start) {
      dateConditions.push('u.created_at >= ?');
      dateValues.push(start);
    }
    if (end) {
      dateConditions.push('u.created_at <= ?');
      dateValues.push(end);
    }
    if (roleId) {
      roleConditions.push('u.role_id = ?');
      roleValues.push(parseInt(roleId));
    }
    const allConditions = [...dateConditions, ...roleConditions];
    const allValues = [...dateValues, ...roleValues];
    const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';
    const userSubqueryConditions = [];
    const userSubqueryValues = [];
    if (start) {
      userSubqueryConditions.push('created_at >= ?');
      userSubqueryValues.push(start);
    }
    if (end) {
      userSubqueryConditions.push('created_at <= ?');
      userSubqueryValues.push(end);
    }
    if (roleId) {
      userSubqueryConditions.push('role_id = ?');
      userSubqueryValues.push(parseInt(roleId));
    }
    const userSubqueryWhere = userSubqueryConditions.length > 0 
      ? `WHERE ${userSubqueryConditions.join(' AND ')}`
      : '';
    let usersByRoleQuery;
    let usersByRoleFinalValues;
    if (roleId) {
      usersByRoleQuery = `SELECT 
        r.role_id,
        r.role_name,
        COALESCE(COUNT(u.user_id), 0) as count
       FROM \`roles\` r
       LEFT JOIN (
         SELECT user_id, role_id 
         FROM \`users\` 
         ${userSubqueryWhere}
       ) u ON r.role_id = u.role_id
       WHERE r.role_id = ?
       GROUP BY r.role_id, r.role_name
       ORDER BY r.role_id`;
      usersByRoleFinalValues = [...userSubqueryValues, parseInt(roleId)];
    } else {
      usersByRoleQuery = `SELECT 
        r.role_id,
        r.role_name,
        COALESCE(COUNT(u.user_id), 0) as count
       FROM \`roles\` r
       LEFT JOIN (
         SELECT user_id, role_id 
         FROM \`users\` 
         ${userSubqueryWhere}
       ) u ON r.role_id = u.role_id
       GROUP BY r.role_id, r.role_name
       ORDER BY r.role_id`;
      usersByRoleFinalValues = userSubqueryValues;
    }
    console.log('[StatisticsController] Query: Users by role');
    console.log('[StatisticsController] SQL:', usersByRoleQuery);
    console.log('[StatisticsController] Values:', usersByRoleFinalValues);
    const [usersByRoleRows] = await db.execute(usersByRoleQuery, usersByRoleFinalValues);
    console.log('[StatisticsController] Users by role result:', usersByRoleRows?.length || 0, 'rows');
    const usersByRole = usersByRoleRows || [];
    const usersByDayConditions = [];
    const usersByDayValues = [];
    if (start) {
      usersByDayConditions.push('created_at >= ?');
      usersByDayValues.push(start);
    }
    if (end) {
      usersByDayConditions.push('created_at <= ?');
      usersByDayValues.push(end);
    }
    if (roleId) {
      usersByDayConditions.push('role_id = ?');
      usersByDayValues.push(parseInt(roleId));
    }
    const usersByDayWhere = usersByDayConditions.length > 0 
      ? `WHERE ${usersByDayConditions.join(' AND ')}`
      : '';
    let usersByDay;
    if (start && end) {
      const [usersByDayRows] = await db.execute(
        `SELECT 
          DATE(created_at) as date,
          COUNT(user_id) as count
         FROM \`users\`
         ${usersByDayWhere}
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        usersByDayValues
      );
      usersByDay = usersByDayRows || [];
    } else {
      const [usersByDayRows] = await db.execute(
        `SELECT 
          DATE(created_at) as date,
          COUNT(user_id) as count
         FROM \`users\`
         ${usersByDayWhere}
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        usersByDayValues
      );
      usersByDay = usersByDayRows || [];
    }
    const [totalUsersResult] = await db.execute(
      `SELECT COUNT(*) as total FROM \`users\` ${usersByDayWhere}`,
      usersByDayValues
    );
    return res.status(200).json({
      success: true,
      data: {
        usersByRole: usersByRole,
        usersByDay: usersByDay,
        totalUsers: parseInt(totalUsersResult?.[0]?.total || 0),
        filters: {
          startDate: start ? start.toISOString() : null,
          endDate: end ? end.toISOString() : null,
          roleId: roleId ? parseInt(roleId) : null,
        },
      },
    });
  } catch (error) {
    console.error('[StatisticsController] ❌ ERROR IN getUserStatistics:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê người dùng',
      error: error.message,
    });
  }
};
const getProductStatistics = async (req, res) => {
  console.log('[StatisticsController] ========================================');
  console.log('[StatisticsController] getProductStatistics called');
  console.log('[StatisticsController] Query params:', req.query);
  try {
    const { categoryId, brandId, limit = 10 } = req.query;
    const db = getDatabase();
    const conditions = [];
    const values = [];
    if (categoryId) {
      conditions.push('p.category_id = ?');
      values.push(parseInt(categoryId));
    }
    if (brandId) {
      try {
        const { brand } = require('../Models');
        const brandData = await brand.findById(parseInt(brandId));
        if (brandData && brandData.name) {
          conditions.push('p.brand = ?');
          values.push(brandData.name);
        }
      } catch (brandError) {
        console.error('[StatisticsController] ⚠️ Error fetching brand for filter:', brandError.message);
      }
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [topProductsRows] = await db.execute(
      `SELECT 
        p.id as product_id,
        p.product_id,
        p.name,
        p.slug,
        p.price,
        p.stock_quantity,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
       FROM \`products\` p
       LEFT JOIN \`orderitems\` oi ON p.id = oi.product_id
       ${whereClause}
       GROUP BY p.id, p.product_id, p.name, p.slug, p.price, p.stock_quantity
       HAVING total_sold > 0
       ORDER BY total_sold DESC
       LIMIT ?`,
      [...values, parseInt(limit)]
    );
    const topProducts = topProductsRows || [];
    const [productsByCategoryRows] = await db.execute(
      `SELECT 
        c.category_id,
        c.name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue
       FROM \`categories\` c
       LEFT JOIN \`products\` p ON c.category_id = p.category_id
       LEFT JOIN \`orderitems\` oi ON p.id = oi.product_id
       GROUP BY c.category_id, c.name
       ORDER BY total_sold DESC`
    );
    const productsByCategory = productsByCategoryRows || [];
    const [productsByBrandRows] = await db.execute(
      `SELECT 
        b.brand_id,
        b.name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue
       FROM \`brands\` b
       LEFT JOIN \`products\` p ON b.name = p.brand
       LEFT JOIN \`orderitems\` oi ON p.id = oi.product_id
       GROUP BY b.brand_id, b.name
       ORDER BY total_sold DESC`
    );
    const productsByBrand = productsByBrandRows || [];
    const [totalProductsResult] = await db.execute(
      `SELECT COUNT(*) as total FROM \`products\` ${whereClause}`,
      values
    );
    const responseData = {
      topProducts: topProducts,
      productsByCategory: productsByCategory,
      productsByBrand: productsByBrand,
      totalProducts: parseInt(totalProductsResult?.[0]?.total || 0),
      filters: {
        categoryId: categoryId ? parseInt(categoryId) : null,
        brandId: brandId ? parseInt(brandId) : null,
        limit: parseInt(limit),
      },
    };
    console.log('[StatisticsController] ✅ Product statistics response prepared');
    console.log('[StatisticsController] Total products:', responseData.totalProducts);
    console.log('[StatisticsController] Top products:', topProducts.length);
    console.log('[StatisticsController] ========================================');
    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('[StatisticsController] ❌ ERROR IN getProductStatistics:', error.message);
    console.error('[StatisticsController] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê sản phẩm',
      error: error.message,
    });
  }
};
module.exports = {
  getOverview,
  getOrderStatistics,
  getRevenueStatistics,
  getUserStatistics,
  getProductStatistics,
};
