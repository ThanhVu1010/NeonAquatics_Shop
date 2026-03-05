const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../controllers/authController');

router.use(authenticateToken);

router.get('/stats', dashboardController.getStats);

module.exports = router;
