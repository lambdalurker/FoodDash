const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Restaurant = sequelize.define('Restaurant', {
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
  cuisine: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'restaurants',
  timestamps: true,
});

// Associations
Restaurant.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Restaurant, { foreignKey: 'ownerId', as: 'restaurants' });

module.exports = Restaurant;
