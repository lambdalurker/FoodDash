const sequelize  = require('../config/database');
const User       = require('./User');
const Restaurant = require('./Restaurant');
const MenuItem   = require('./MenuItem');
const Order      = require('./Order');
const OrderItem  = require('./OrderItem');
const Review     = require('./Review');

// Establish Review Associations
Review.belongsTo(User, { foreignKey: 'userId', as: 'customer' });
Review.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Restaurant.hasMany(Review, { foreignKey: 'restaurantId', as: 'reviews' });

module.exports = { sequelize, User, Restaurant, MenuItem, Order, OrderItem, Review };
