const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const orderRoutes = require('./orderRoutes');
const cartRoutes = require('./cartRoutes');
const paymentRoutes = require('./paymentRoutes');
const addressRoutes = require('./addressRoutes');
const couponRoutes = require('./couponRoutes');
const reviewRoutes = require('./reviewRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const supportRoutes = require('./supportRoutes');
const bankRoutes = require('./bankRoutes');
const statisticsRoutes = require('./statisticsRoutes');

router.use('/auth', authRoutes);

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/cart', cartRoutes);
router.use('/payments', paymentRoutes);
router.use('/addresses', addressRoutes);
router.use('/coupons', couponRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);

router.use('/support', supportRoutes);

router.use('/bank', bankRoutes);

router.use('/statistics', statisticsRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CoCo API',
    version: '1.0.0',
    documentation: 'https://github.com/cocoshop-vn/Do-An-Tot-Nghiep-2025/blob/main/SO_DO_TONG_QUAN_HE_THONG_NGAN_GON.md',
    endpoints: {
      auth: {
        base: '/api/auth',
        public: [
          'POST /api/auth/login',
          'POST /api/auth/register',
          'POST /api/auth/refresh-token',
        ],
        protected: [
          'POST /api/auth/logout',
        ],
      },
      users: {
        base: '/api/users',
        public: [
          'GET /api/users/email/:email',
          'GET /api/users/username/:username',
        ],
        protected: [
          'GET /api/users/me',
          'PUT /api/users/me',
          'PUT /api/users/me/profile',
        ],
        admin: [
          'GET /api/users',
          'GET /api/users/:id',
          'PUT /api/users/:id',
          'DELETE /api/users/:id',
        ],
      },
      products: {
        base: '/api/products',
        public: [
          'GET /api/products',
          'GET /api/products/:id',
          'GET /api/products/slug/:slug',
          'GET /api/products/active/list',
          'GET /api/products/search/query',
        ],
        admin: [
          'POST /api/products',
          'PUT /api/products/:id',
          'DELETE /api/products/:id',
        ],
      },
      orders: {
        base: '/api/orders',
        protected: [
          'GET /api/orders/me',
          'GET /api/orders/me/:id',
          'POST /api/orders/me/create',
          'POST /api/orders/me/cart/create',
          'PUT /api/orders/me/:id/cancel',
        ],
      },
      cart: {
        base: '/api/cart',
        protected: [
          'GET /api/cart/me',
          'GET /api/cart/me/total',
          'POST /api/cart/me/add',
          'PUT /api/cart/me/product/:productId',
          'DELETE /api/cart/me/product/:productId',
          'DELETE /api/cart/me/clear',
        ],
      },
      addresses: {
        base: '/api/addresses',
        protected: [
          'GET /api/addresses/me',
          'POST /api/addresses/me',
          'PUT /api/addresses/me/:id',
          'DELETE /api/addresses/me/:id',
        ],
      },
      wishlist: {
        base: '/api/wishlist',
        protected: [
          'GET /api/wishlist/me',
          'POST /api/wishlist/me/add',
          'DELETE /api/wishlist/me/product/:productId',
        ],
      },
      reviews: {
        base: '/api/reviews',
        public: [
          'GET /api/reviews/product/:productId',
        ],
        protected: [
          'GET /api/reviews/me',
          'POST /api/reviews/me',
          'PUT /api/reviews/me/:id',
        ],
      },
      payments: {
        base: '/api/payments',
        protected: [
          'GET /api/payments/me',
          'POST /api/payments/momo/create',
        ],
      },
      coupons: {
        base: '/api/coupons',
        public: [
          'GET /api/coupons/active/list',
          'POST /api/coupons/validate',
        ],
      },
      categories: {
        base: '/api/categories',
        public: [
          'GET /api/categories',
          'GET /api/categories/tree/list',
        ],
      },
      support: '/api/support',
      bank: '/api/bank',
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      getToken: 'POST /api/auth/login',
      refreshToken: 'POST /api/auth/refresh-token',
    },
  });
});

module.exports = router;
