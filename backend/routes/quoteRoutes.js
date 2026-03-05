const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { authenticateToken } = require('../controllers/authController');

router.use(authenticateToken);

router.get('/', quoteController.getQuotes);
router.post('/', quoteController.createQuote);
router.put('/:id', quoteController.updateQuote);
router.post('/:id/convert', quoteController.convertQuoteToOrder);
router.delete('/:id', quoteController.deleteQuote);
router.get('/next-number', quoteController.getNextQuoteNumber); // Note: path order. /next-number gets matched here.

module.exports = router;
