const express = require('express');
const router = express.Router();
const shopeeController = require('../controllers/shopeeController');
const { authenticateToken } = require('../controllers/authController');

// Open routes
router.get('/auth/status', shopeeController.getStatus);
router.get('/auth/connect', shopeeController.connect);
router.get('/auth/callback', shopeeController.callback); // Callback does not need auth to work when redirected from external

// Protected routes
router.use(authenticateToken);
router.post('/auth/disconnect', shopeeController.disconnect);
router.get('/shop/info', shopeeController.getShopInfo);
router.get('/products', shopeeController.getProducts);
router.post('/products/add', shopeeController.addProduct);
router.put('/products/update-price', shopeeController.updatePrice);
router.put('/products/update-stock', shopeeController.updateStock);
router.get('/orders', shopeeController.getOrders);
router.get('/categories', shopeeController.getCategories);

module.exports = router;
