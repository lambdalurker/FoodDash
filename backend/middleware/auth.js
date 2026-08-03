const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided. Please log in.' });

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const user    = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token. Please log in.';
    return res.status(401).json({ error: msg });
  }
};

const requireOwner = (req, res, next) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Restaurant owner access required.' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
};

module.exports = { authenticate, requireOwner, requireAdmin };
