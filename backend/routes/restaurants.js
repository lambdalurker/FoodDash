const express = require('express');
const router = express.Router();
const { getAll, getOne, create, update, remove } = require('../controllers/restaurantController');
const { createReview, getRestaurantReviews } = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const { uploadRestaurant } = require('../middleware/upload');

// Public routes
router.get('/', getAll);
router.get('/:id', getOne);
router.get('/:restaurantId/reviews', getRestaurantReviews);

// Protected routes
router.post('/', authenticate, uploadRestaurant.single('image'), create);
router.put('/:id', authenticate, uploadRestaurant.single('image'), update);
router.delete('/:id', authenticate, remove);
router.post('/:restaurantId/reviews', authenticate, createReview);

module.exports = router;
