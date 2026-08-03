const { DataTypes } = require('sequelize');
const sequelize  = require('../config/database');
const Order      = require('./Order');
const MenuItem   = require('./MenuItem');

const OrderItem = sequelize.define('OrderItem', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId:    { type: DataTypes.INTEGER, allowNull: false,
                references: { model: 'orders', key: 'id' } },
  menuItemId: { type: DataTypes.INTEGER, allowNull: false,
                references: { model: 'menu_items', key: 'id' } },
  quantity:   { type: DataTypes.INTEGER,      allowNull: false, validate: { min: 1 } },
  unitPrice:  { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  // snapshot of name at order time – survives menu edits / deletions
  itemName:   { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'order_items', timestamps: false });

OrderItem.belongsTo(Order,    { foreignKey: 'orderId',    as: 'order'    });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });
Order.hasMany(OrderItem,      { foreignKey: 'orderId',    as: 'items'    });
MenuItem.hasMany(OrderItem,   { foreignKey: 'menuItemId', as: 'orderItems' });

module.exports = OrderItem;
