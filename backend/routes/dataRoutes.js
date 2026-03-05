const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { authenticateToken } = require('../controllers/authController');

router.use(authenticateToken);

router.get('/export', dataController.exportData);
router.post('/import', dataController.importData);

module.exports = router;
