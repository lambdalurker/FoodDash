const express = require('express');
const router = express.Router();
const { register, login, me, getProfile, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, me);

// GET /api/auth/profile (protected)
router.get('/profile', authenticate, getProfile);

// PUT /api/auth/profile (protected)
router.put('/profile', authenticate, updateProfile);

module.exports = router;
