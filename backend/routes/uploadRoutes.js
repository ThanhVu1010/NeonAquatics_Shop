const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../controllers/authController');

router.use(authenticateToken);

router.post('/', uploadController.uploadMiddleware, uploadController.uploadImage);

module.exports = router;
