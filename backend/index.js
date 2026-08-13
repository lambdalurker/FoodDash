require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { sequelize } = require('./models');

const authRoutes       = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const menuItemRoutes   = require('./routes/menuItems');
const orderRoutes      = require('./routes/orders');
const seedRoutes       = require('./routes/seed');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',        authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu-items',  menuItemRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/seed',        seedRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) =>
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  if (err.message?.includes('Only JPG'))
    return res.status(400).json({ error: err.message });
  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    await sequelize.sync();   // plain sync — safe on a fresh DB; avoids SQLite alter quirks
    console.log('Database synced.');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
