const sequelize  = require('../config/database');
const User       = require('./User');
const Restaurant = require('./Restaurant');
const MenuItem   = require('./MenuItem');
const Order      = require('./Order');
const OrderItem  = require('./OrderItem');

module.exports = { sequelize, User, Restaurant, MenuItem, Order, OrderItem };
