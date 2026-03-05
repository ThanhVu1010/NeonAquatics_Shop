const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefrontController');

// Public endpoints (No auth required)
router.post('/auth/register', storefrontController.registerCustomer);
router.post('/auth/login', storefrontController.loginCustomer);
router.get('/categories', storefrontController.getCategories);
router.get('/products', storefrontController.getProducts);

// Protected storefront endpoints (Customer auth required)
router.get('/my-orders', storefrontController.authenticateCustomer, storefrontController.getMyOrders);
router.post('/checkout', storefrontController.authenticateCustomer, storefrontController.processCheckout);

module.exports = router;
