const express = require('express');
const router  = express.Router();
const { placeOrder, myOrders, ownerOrders, updateStatus } = require('../controllers/orderController');
const { authenticate, requireOwner } = require('../middleware/auth');

router.post('/',             authenticate, placeOrder);
router.get('/my',            authenticate, myOrders);
router.get('/owner',         authenticate, requireOwner, ownerOrders);
router.patch('/:id/status',  authenticate, requireOwner, updateStatus);

module.exports = router;
