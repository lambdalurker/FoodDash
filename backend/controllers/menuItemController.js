const Joi = require('joi');
const { Op } = require('sequelize');
const { MenuItem, Restaurant, User } = require('../models');
const fs = require('fs');
const path = require('path');

const menuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Item name must be at least 2 characters.',
    'string.max': 'Item name must be at most 100 characters.',
    'any.required': 'Item name is required.',
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Description must be at most 500 characters.',
  }),
  price: Joi.number().positive().precision(2).required().messages({
    'number.positive': 'Price must be a positive number.',
    'number.base': 'Price must be a valid number.',
    'any.required': 'Price is required.',
  }),
  category: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Category must be at least 2 characters.',
    'any.required': 'Category is required.',
  }),
  isAvailable: Joi.boolean().optional(),
  restaurantId: Joi.number().integer().positive().required().messages({
    'number.base': 'Restaurant ID must be a number.',
    'any.required': 'Restaurant ID is required.',
  }),
});

// GET /api/menu-items  (public — with search, category, restaurantId, availability filters)
const getAll = async (req, res) => {
  try {
    const { search, category, restaurantId, isAvailable } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (category) {
      where.category = { [Op.like]: `%${category}%` };
    }
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    const items = await MenuItem.findAll({
      where,
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'cuisine'],
          include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error('Get menu items error:', err);
    return res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
};

// GET /api/menu-items/:id  (public)
const getOne = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'cuisine', 'ownerId'],
          include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
        },
      ],
    });

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    return res.status(200).json({ item });
  } catch (err) {
    console.error('Get menu item error:', err);
    return res.status(500).json({ error: 'Failed to fetch menu item.' });
  }
};

// POST /api/menu-items  (protected)
const create = async (req, res) => {
  const body = { ...req.body };
  // Coerce numeric fields from multipart strings
  if (body.price) body.price = parseFloat(body.price);
  if (body.restaurantId) body.restaurantId = parseInt(body.restaurantId, 10);
  if (body.isAvailable !== undefined) body.isAvailable = body.isAvailable === 'true' || body.isAvailable === true;

  const { error, value } = menuItemSchema.validate(body, { abortEarly: false });
  if (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.details.map((d) => d.message),
    });
  }

  try {
    // Verify restaurant exists and user owns it
    const restaurant = await Restaurant.findByPk(value.restaurantId);
    if (!restaurant) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    if (restaurant.ownerId !== req.user.id && req.user.role !== 'admin') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You can only add items to your own restaurants.' });
    }

    const imageUrl = req.file
      ? `/uploads/menu-items/${req.file.filename}`
      : null;

    const item = await MenuItem.create({ ...value, imageUrl });

    const full = await MenuItem.findByPk(item.id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'cuisine'],
          include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
        },
      ],
    });

    return res.status(201).json({ message: 'Menu item created.', item: full });
  } catch (err) {
    console.error('Create menu item error:', err);
    return res.status(500).json({ error: 'Failed to create menu item.' });
  }
};

// PUT /api/menu-items/:id  (protected — restaurant owner only)
const update = async (req, res) => {
  const body = { ...req.body };
  if (body.price) body.price = parseFloat(body.price);
  if (body.restaurantId) body.restaurantId = parseInt(body.restaurantId, 10);
  if (body.isAvailable !== undefined) body.isAvailable = body.isAvailable === 'true' || body.isAvailable === true;

  const { error, value } = menuItemSchema.validate(body, { abortEarly: false });
  if (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: 'Validation failed.',
      details: error.details.map((d) => d.message),
    });
  }

  try {
    const item = await MenuItem.findByPk(req.params.id, {
      include: [{ model: Restaurant, as: 'restaurant' }],
    });

    if (!item) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    if (item.restaurant.ownerId !== req.user.id && req.user.role !== 'admin') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You can only edit items from your own restaurants.' });
    }

    if (req.file && item.imageUrl) {
      const oldPath = path.join(__dirname, '..', item.imageUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const imageUrl = req.file
      ? `/uploads/menu-items/${req.file.filename}`
      : item.imageUrl;

    await item.update({ ...value, imageUrl });

    const full = await MenuItem.findByPk(item.id, {
      include: [
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id', 'name', 'cuisine'],
          include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
        },
      ],
    });

    return res.status(200).json({ message: 'Menu item updated.', item: full });
  } catch (err) {
    console.error('Update menu item error:', err);
    return res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

// DELETE /api/menu-items/:id  (protected)
const remove = async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id, {
      include: [{ model: Restaurant, as: 'restaurant' }],
    });

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    if (item.restaurant.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete items from your own restaurants.' });
    }

    if (item.imageUrl) {
      const imgPath = path.join(__dirname, '..', item.imageUrl);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await item.destroy();
    return res.status(200).json({ message: 'Menu item deleted.' });
  } catch (err) {
    console.error('Delete menu item error:', err);
    return res.status(500).json({ error: 'Failed to delete menu item.' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
