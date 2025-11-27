/**
 * Statistics Routes
 * Tất cả routes yêu cầu quyền Admin (role_id = 1)
 */

const express = require('express');
const router = express.Router();
const { StatisticsController } = require('../Controllers');
const { authenticate, authorize } = require('../Middlewares');

/**
 * Tổng quan hệ thống
 * GET /api/statistics/overview
 */
router.get('/overview', authenticate, authorize(1), StatisticsController.getOverview);

/**
 * Thống kê đơn hàng
 * GET /api/statistics/orders
 */
router.get('/orders', authenticate, authorize(1), StatisticsController.getOrderStatistics);

/**
 * Thống kê doanh thu
 * GET /api/statistics/revenue
 */
router.get('/revenue', authenticate, authorize(1), StatisticsController.getRevenueStatistics);

/**
 * Thống kê người dùng
 * GET /api/statistics/users
 */
router.get('/users', authenticate, authorize(1), StatisticsController.getUserStatistics);

/**
 * Thống kê sản phẩm
 * GET /api/statistics/products
 */
router.get('/products', authenticate, authorize(1), StatisticsController.getProductStatistics);

module.exports = router;

