const express = require('express');
const router = express.Router();
const { OrderController } = require('../Controllers');
const { authenticate, authorize, optionalAuthenticate } = require('../Middlewares');

router.get('/me', authenticate, OrderController.getMyOrders);
router.get('/me/:id', authenticate, OrderController.getMyOrderById);
router.post('/me/create', authenticate, OrderController.createMyOrder);
router.post('/me/cart/create', authenticate, OrderController.createFromMyCart);
router.put('/me/:id/cancel', authenticate, OrderController.cancelMyOrder);
router.put('/me/:id/return', authenticate, OrderController.returnMyOrder);

router.get('/', authenticate, authorize(1), OrderController.getAll);
router.get('/:id', authenticate, OrderController.getById);
router.post('/', authenticate, authorize(1), OrderController.create);
router.put('/:id', authenticate, authorize(1), OrderController.update);
router.delete('/:id', authenticate, authorize(1), OrderController.delete);

router.get('/number/:orderNumber', authenticate, OrderController.getByOrderNumber);
router.get('/user/:userId', authenticate, authorize(1), OrderController.getByUser); 
router.get('/status/:statusId', authenticate, authorize(1, 2), OrderController.getByStatus);
router.get('/statuses/list', authenticate, OrderController.getOrderStatuses);

router.put('/:id/status', authenticate, authorize(1), OrderController.updateStatus); 
router.put('/:id/confirm', authenticate, authorize(1), OrderController.confirmOrder); 
router.put('/:id/confirm-payment', authenticate, authorize(1), OrderController.confirmPayment);
router.put('/:id/complete', authenticate, authorize(1), OrderController.completeOrder);
router.put('/:id/shipping', authenticate, authorize(1, 2), OrderController.startShipping);
router.put('/:id/delivered', authenticate, authorize(1, 2), OrderController.markAsDelivered);
router.put('/:id/cancel', authenticate, authorize(1), OrderController.cancelOrder); 
router.put('/:id/return', authenticate, authorize(1), OrderController.returnOrder); 

router.put('/:id/shipper/shipping', authenticate, authorize(2), OrderController.updateOrderToShipping); 
router.put('/:id/shipper/delivered', authenticate, authorize(2), OrderController.updateOrderToDelivered); 

router.get('/pending/products-summary', authenticate, authorize(1), OrderController.getPendingOrderProductsSummary); 
module.exports = router;
