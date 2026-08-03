const express = require('express');
const router = express.Router();
const { getAll, getOne, create, update, remove } = require('../controllers/menuItemController');
const { authenticate } = require('../middleware/auth');
const { uploadMenuItem } = require('../middleware/upload');

// Public routes
router.get('/', getAll);
router.get('/:id', getOne);

// Protected routes
router.post('/', authenticate, uploadMenuItem.single('image'), create);
router.put('/:id', authenticate, uploadMenuItem.single('image'), update);
router.delete('/:id', authenticate, remove);

module.exports = router;
