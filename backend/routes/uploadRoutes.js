const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../controllers/authController');

router.get('/:imageId', uploadController.getImage);
router.post('/', authenticateToken, (req, res, next) => {
    uploadController.uploadMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        next();
    });
}, uploadController.uploadImage);

module.exports = router;
