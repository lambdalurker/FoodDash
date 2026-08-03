const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const Joi    = require('joi');
const { User } = require('../models');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required().messages({
    'string.alphanum': 'Username must only contain letters and numbers.',
    'string.min':      'Username must be at least 3 characters.',
    'any.required':    'Username is required.',
  }),
  email: Joi.string().email({ tlds: { allow: false } }).required().messages({
    'string.email':  'Please provide a valid email address.',
    'any.required':  'Email is required.',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min':   'Password must be at least 6 characters.',
    'any.required': 'Password is required.',
  }),
  // true → register as restaurant owner
  isOwner: Joi.boolean().optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email({ tlds: { allow: false } }).required().messages({
    'string.email':  'Please provide a valid email address.',
    'any.required':  'Email is required.',
  }),
  password: Joi.string().required().messages({ 'any.required': 'Password is required.' }),
});

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Validation failed.',
    details: error.details.map((d) => d.message) });

  const { username, email, password, isOwner } = value;
  try {
    if (await User.findOne({ where: { email } }))
      return res.status(409).json({ error: 'An account with that email already exists.' });
    if (await User.findOne({ where: { username } }))
      return res.status(409).json({ error: 'That username is already taken.' });

    const hashed = await bcrypt.hash(password, 12);
    const role   = isOwner ? 'owner' : 'user';
    const user   = await User.create({ username, email, password: hashed, role });

    const token = signToken(user);
    return res.status(201).json({
      message: 'Account created successfully.', token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Validation failed.',
    details: error.details.map((d) => d.message) });

  const { email, password } = value;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = signToken(user);
    return res.status(200).json({
      message: 'Logged in successfully.', token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// GET /api/auth/me
const me = async (req, res) => res.status(200).json({ user: req.user });

module.exports = { register, login, me };
