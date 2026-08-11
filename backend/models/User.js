const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50),  allowNull: false, unique: true,
              validate: { len: [3, 50], notEmpty: true } },
  email:    { type: DataTypes.STRING(100), allowNull: false, unique: true,
              validate: { isEmail: true, notEmpty: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  // 'user'  – regular customer
  // 'owner' – restaurant owner
  // 'admin' – superuser
  role:     { type: DataTypes.ENUM('admin', 'user', 'owner'), defaultValue: 'user' },
  defaultAddress: { type: DataTypes.STRING(300), allowNull: true },
}, { tableName: 'users', timestamps: true });

module.exports = User;
