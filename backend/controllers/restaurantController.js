const Joi = require('joi');
const { Op } = require('sequelize');
const { Restaurant, User, MenuItem, Review } = require('../models');
const fs = require('fs');
const path = require('path');

const getRatingStats = async (restaurantId) => {
  const reviews = await Review.findAll({ where: { restaurantId } });
  if (reviews.length === 0) return { rating: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    rating: parseFloat((sum / reviews.length).toFixed(1)),
    count: reviews.length,
  };
};

const restaurantSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Restaurant name must be at least 2 characters.',
    'string.max': 'Restaurant name must be at most 100 characters.',
    'any.required': 'Restaurant name is required.',
  }),
  cuisine: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Cuisine type must be at least 2 characters.',
    'any.required': 'Cuisine type is required.',
  }),
  address: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Address must be at least 5 characters.',
    'any.required': 'Address is required.',
  }),
  phone: Joi.string()
    .pattern(/^[+\d\s\-().]{7,20}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number.',
    }),
  isOpen: Joi.boolean().optional(),
});

// GET /api/restaurants  (public — list with search/filter)
const getAll = async (req, res) => {
  try {
    const { search, cuisine, isOpen } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (cuisine) {
      where.cuisine = { [Op.like]: `%${cuisine}%` };
    }
    if (isOpen !== undefined) {
      where.isOpen = isOpen === 'true';
    }

    const restaurants = await Restaurant.findAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']],
    });

    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (r) => {
        const stats = await getRatingStats(r.id);
        return { ...r.toJSON(), ...stats };
      })
    );

    return res.status(200).json({ restaurants: restaurantsWithStats });
  } catch (err) {
    console.error('Get restaurants error:', err);
    return res.status(500).json({ error: 'Failed to fetch restaurants.' });
  }
};

// GET /api/restaurants/:id  (public)
const getOne = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'username'] },
        { model: MenuItem, as: 'menuItems', order: [['createdAt', 'DESC']] },
      ],
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    const stats = await getRatingStats(restaurant.id);
    const fullRestaurant = { ...restaurant.toJSON(), ...stats };

    return res.status(200).json({ restaurant: fullRestaurant });
  } catch (err) {
    console.error('Get restaurant error:', err);
    return res.status(500).json({ error: 'Failed to fetch restaurant.' });
  }
};

// POST /api/restaurants  (protected)
const create = async (req, res) => {
  const { error, value } = restaurantSchema.validate(req.body, { abortEarly: false });
  if (error) {
    // Clean up uploaded file on validation error
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.details.map((d) => d.message),
    });
  }

  try {
    const imageUrl = req.file
      ? `/uploads/restaurants/${req.file.filename}`
      : null;

    const restaurant = await Restaurant.create({
      ...value,
      imageUrl,
      ownerId: req.user.id,
    });

    const full = await Restaurant.findByPk(restaurant.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
    });

    return res.status(201).json({ message: 'Restaurant created.', restaurant: full });
  } catch (err) {
    console.error('Create restaurant error:', err);
    return res.status(500).json({ error: 'Failed to create restaurant.' });
  }
};

// PUT /api/restaurants/:id  (protected — owner only)
const update = async (req, res) => {
  const { error, value } = restaurantSchema.validate(req.body, { abortEarly: false });
  if (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.details.map((d) => d.message),
    });
  }

  try {
    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    if (restaurant.ownerId !== req.user.id && req.user.role !== 'admin') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You can only edit your own restaurants.' });
    }

    // Delete old image if a new one was uploaded
    if (req.file && restaurant.imageUrl) {
      const oldPath = path.join(__dirname, '..', restaurant.imageUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const imageUrl = req.file
      ? `/uploads/restaurants/${req.file.filename}`
      : restaurant.imageUrl;

    await restaurant.update({ ...value, imageUrl });

    const full = await Restaurant.findByPk(restaurant.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
    });

    return res.status(200).json({ message: 'Restaurant updated.', restaurant: full });
  } catch (err) {
    console.error('Update restaurant error:', err);
    return res.status(500).json({ error: 'Failed to update restaurant.' });
  }
};

// DELETE /api/restaurants/:id  (protected — owner only)
const remove = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    if (restaurant.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own restaurants.' });
    }

    // Clean up image
    if (restaurant.imageUrl) {
      const imgPath = path.join(__dirname, '..', restaurant.imageUrl);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await restaurant.destroy();
    return res.status(200).json({ message: 'Restaurant deleted.' });
  } catch (err) {
    console.error('Delete restaurant error:', err);
    return res.status(500).json({ error: 'Failed to delete restaurant.' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
