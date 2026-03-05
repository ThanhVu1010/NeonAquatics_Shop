const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../controllers/authController');

router.use(authenticateToken);

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);

module.exports = router;
