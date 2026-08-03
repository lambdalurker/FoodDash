const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Restaurant = require('./Restaurant');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
      isDecimal: true,
    },
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'restaurants',
      key: 'id',
    },
  },
}, {
  tableName: 'menu_items',
  timestamps: true,
});

// Associations
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurantId', as: 'restaurant' });
Restaurant.hasMany(MenuItem, { foreignKey: 'restaurantId', as: 'menuItems' });

module.exports = MenuItem;
