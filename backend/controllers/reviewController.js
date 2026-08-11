const Joi = require('joi');
const { Review, User, Order } = require('../models');

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be at least 1.',
    'number.max': 'Rating must be at most 5.',
    'any.required': 'Rating is required.'
  }),
  comment: Joi.string().max(1000).optional().allow(''),
});

// POST /api/restaurants/:restaurantId/reviews (protected)
const createReview = async (req, res) => {
  const { error, value } = reviewSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const restaurantId = parseInt(req.params.restaurantId, 10);
  const { rating, comment } = value;

  try {
    // Prevent multiple reviews from the same user on a single restaurant
    const existing = await Review.findOne({ where: { userId: req.user.id, restaurantId } });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this restaurant.' });
    }

    const review = await Review.create({
      rating,
      comment,
      userId: req.user.id,
      restaurantId,
    });

    const fullReview = await Review.findByPk(review.id, {
      include: [{ model: User, as: 'customer', attributes: ['id', 'username'] }]
    });

    // Check if verified order
    const order = await Order.findOne({
      where: {
        userId: req.user.id,
        restaurantId,
        status: 'delivered'
      }
    });

    const result = {
      ...fullReview.toJSON(),
      isVerified: !!order
    };

    return res.status(201).json({ message: 'Review added successfully.', review: result });
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({ error: 'Failed to create review.' });
  }
};

// GET /api/restaurants/:restaurantId/reviews (public)
const getRestaurantReviews = async (req, res) => {
  const restaurantId = parseInt(req.params.restaurantId, 10);
  try {
    const reviews = await Review.findAll({
      where: { restaurantId },
      include: [{ model: User, as: 'customer', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']],
    });

    // Mark as verified if user had a delivered order
    const reviewsWithVerification = await Promise.all(reviews.map(async (rev) => {
      const order = await Order.findOne({
        where: {
          userId: rev.userId,
          restaurantId,
          status: 'delivered'
        }
      });
      return {
        ...rev.toJSON(),
        isVerified: !!order
      };
    }));

    return res.status(200).json({ reviews: reviewsWithVerification });
  } catch (err) {
    console.error('Get reviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
};

module.exports = { createReview, getRestaurantReviews };
