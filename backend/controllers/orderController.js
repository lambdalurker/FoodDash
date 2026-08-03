const Joi = require('joi');
const { Op } = require('sequelize');
const { Order, OrderItem, MenuItem, Restaurant, User } = require('../models');

const placeSchema = Joi.object({
  restaurantId:    Joi.number().integer().positive().required()
    .messages({ 'any.required': 'Restaurant ID is required.' }),
  deliveryAddress: Joi.string().min(5).max(300).required()
    .messages({ 'string.min': 'Delivery address must be at least 5 characters.',
                'any.required': 'Delivery address is required.' }),
  notes: Joi.string().max(500).optional().allow(''),
  items: Joi.array().items(Joi.object({
    menuItemId: Joi.number().integer().positive().required(),
    quantity:   Joi.number().integer().min(1).required(),
  })).min(1).required()
    .messages({ 'array.min': 'Your order must contain at least one item.',
                'any.required': 'Order items are required.' }),
});

const fullIncludes = [
  { model: User,       as: 'customer',   attributes: ['id','username','email'] },
  { model: Restaurant, as: 'restaurant', attributes: ['id','name','cuisine','address'] },
  { model: OrderItem,  as: 'items',
    include: [{ model: MenuItem, as: 'menuItem', attributes: ['id','name','category'] }] },
];

// POST /api/orders
const placeOrder = async (req, res) => {
  const body = {
    ...req.body,
    restaurantId: parseInt(req.body.restaurantId, 10),
    items: (req.body.items || []).map((i) => ({
      menuItemId: parseInt(i.menuItemId, 10),
      quantity:   parseInt(i.quantity,   10),
    })),
  };

  const { error, value } = placeSchema.validate(body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Validation failed.',
    details: error.details.map((d) => d.message) });

  const { restaurantId, deliveryAddress, notes, items } = value;
  try {
    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    if (!restaurant.isOpen) return res.status(400).json({ error: 'This restaurant is currently closed.' });

    const ids      = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.findAll({
      where: { id: { [Op.in]: ids }, restaurantId, isAvailable: true },
    });
    if (menuItems.length !== ids.length)
      return res.status(400).json({ error: 'One or more items are unavailable or do not belong to this restaurant.' });

    const map = {};
    menuItems.forEach((m) => { map[m.id] = m; });

    let total = 0;
    const lineItems = items.map((i) => {
      const price = parseFloat(map[i.menuItemId].price);
      total += price * i.quantity;
      return { menuItemId: i.menuItemId, itemName: map[i.menuItemId].name,
               unitPrice: price, quantity: i.quantity };
    });

    const order = await Order.create({
      userId: req.user.id, restaurantId, deliveryAddress,
      notes: notes || null, totalAmount: parseFloat(total.toFixed(2)), status: 'pending',
    });
    await OrderItem.bulkCreate(lineItems.map((l) => ({ ...l, orderId: order.id })));

    const full = await Order.findByPk(order.id, { include: fullIncludes });
    return res.status(201).json({ message: 'Order placed successfully.', order: full });
  } catch (err) {
    console.error('Place order error:', err);
    return res.status(500).json({ error: 'Failed to place order.' });
  }
};

// GET /api/orders/my  — customer's own orders
const myOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: fullIncludes,
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ orders });
  } catch (err) {
    console.error('My orders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// GET /api/orders/owner  — all orders across owner's restaurants
const ownerOrders = async (req, res) => {
  try {
    const myRestaurants = await Restaurant.findAll({
      where: { ownerId: req.user.id }, attributes: ['id'],
    });
    const ids = myRestaurants.map((r) => r.id);
    if (!ids.length) return res.status(200).json({ orders: [] });

    const where = { restaurantId: { [Op.in]: ids } };
    if (req.query.status) where.status = req.query.status;

    const orders = await Order.findAll({
      where, include: fullIncludes, order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ orders });
  } catch (err) {
    console.error('Owner orders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// PATCH /api/orders/:id/status  — owner updates status
const updateStatus = async (req, res) => {
  const allowed = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'];
  const { status } = req.body;
  if (!status || !allowed.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}.` });

  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: Restaurant, as: 'restaurant', attributes: ['ownerId'] }],
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.restaurant.ownerId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'You can only update orders for your own restaurants.' });

    await order.update({ status });
    const full = await Order.findByPk(order.id, { include: fullIncludes });
    return res.status(200).json({ message: 'Order status updated.', order: full });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
};

module.exports = { placeOrder, myOrders, ownerOrders, updateStatus };
