const { DataTypes } = require('sequelize');
const sequelize   = require('../config/database');
const User        = require('./User');
const Restaurant  = require('./Restaurant');

const Order = sequelize.define('Order', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:          { type: DataTypes.INTEGER, allowNull: false,
                     references: { model: 'users', key: 'id' } },
  restaurantId:    { type: DataTypes.INTEGER, allowNull: false,
                     references: { model: 'restaurants', key: 'id' } },
  status:          {
    type: DataTypes.ENUM('pending','confirmed','preparing','out_for_delivery','delivered','cancelled'),
    defaultValue: 'pending',
  },
  totalAmount:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  deliveryAddress: { type: DataTypes.STRING(300), allowNull: false },
  notes:           { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'orders', timestamps: true });

Order.belongsTo(User,       { foreignKey: 'userId',       as: 'customer'   });
Order.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
User.hasMany(Order,         { foreignKey: 'userId',       as: 'orders'     });
Restaurant.hasMany(Order,   { foreignKey: 'restaurantId', as: 'orders'     });

module.exports = Order;
