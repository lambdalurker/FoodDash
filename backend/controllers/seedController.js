const bcrypt = require('bcrypt');
const { User, Restaurant, MenuItem, Order, OrderItem } = require('../models');

const SEED_DATA = {
  owners: [
    { username: 'mario_owner',  email: 'mario@fooddash.dev',   password: 'password123', role: 'owner' },
    { username: 'sakura_owner', email: 'sakura@fooddash.dev',  password: 'password123', role: 'owner' },
    { username: 'spice_owner',  email: 'spice@fooddash.dev',   password: 'password123', role: 'owner' },
  ],
  customers: [
    { username: 'alice',  email: 'alice@example.com',  password: 'password123', role: 'user' },
    { username: 'bob',    email: 'bob@example.com',    password: 'password123', role: 'user' },
  ],
  restaurants: [
    {
      ownerIndex: 0,
      name: "Mario's Italian Kitchen", cuisine: 'Italian',
      address: '12 Pasta Lane, London, W1A 1AA', phone: '020 7123 4567', isOpen: true,
      menuItems: [
        { name: 'Margherita Pizza',      category: 'Main Course', price: 11.99, isAvailable: true,  description: 'Classic tomato, mozzarella and fresh basil.' },
        { name: 'Pepperoni Pizza',       category: 'Main Course', price: 13.99, isAvailable: true,  description: 'Loaded with spicy pepperoni slices.' },
        { name: 'Spaghetti Carbonara',   category: 'Main Course', price: 12.50, isAvailable: true,  description: 'Creamy egg sauce, pancetta, black pepper.' },
        { name: 'Penne Arrabbiata',      category: 'Main Course', price: 10.99, isAvailable: true,  description: 'Spicy tomato sauce with garlic and chilli.' },
        { name: 'Garlic Bread',          category: 'Starter',     price:  4.50, isAvailable: true,  description: 'Toasted ciabatta with garlic butter.' },
        { name: 'Bruschetta',            category: 'Starter',     price:  5.99, isAvailable: true,  description: 'Grilled bread with tomatoes and olive oil.' },
        { name: 'Tiramisu',              category: 'Dessert',     price:  6.50, isAvailable: true,  description: 'Classic Italian coffee dessert.' },
        { name: 'Panna Cotta',           category: 'Dessert',     price:  5.99, isAvailable: false, description: 'Silky vanilla cream with berry coulis.' },
        { name: 'Still Water',           category: 'Drink',       price:  2.00, isAvailable: true,  description: '500ml bottle.' },
        { name: 'San Pellegrino',        category: 'Drink',       price:  2.50, isAvailable: true,  description: 'Sparkling mineral water.' },
      ],
    },
    {
      ownerIndex: 1,
      name: 'Sakura Japanese Dining', cuisine: 'Japanese',
      address: '8 Cherry Blossom St, London, E1 6RF', phone: '020 7987 6543', isOpen: true,
      menuItems: [
        { name: 'Salmon Nigiri (2 pcs)',  category: 'Starter',     price:  6.50, isAvailable: true,  description: 'Hand-pressed rice with fresh Atlantic salmon.' },
        { name: 'Tuna Maki (6 pcs)',      category: 'Starter',     price:  7.99, isAvailable: true,  description: 'Rolled sushi with premium tuna.' },
        { name: 'Ramen',                  category: 'Main Course', price: 13.50, isAvailable: true,  description: 'Rich tonkotsu broth, chashu pork, soft egg.' },
        { name: 'Chicken Teriyaki',       category: 'Main Course', price: 14.00, isAvailable: true,  description: 'Glazed chicken with steamed rice and salad.' },
        { name: 'Vegetable Gyoza (6 pcs)',category: 'Starter',     price:  6.99, isAvailable: true,  description: 'Pan-fried dumplings with ponzu dipping sauce.' },
        { name: 'Edamame',                category: 'Snack',       price:  3.50, isAvailable: true,  description: 'Salted steamed soybeans.' },
        { name: 'Matcha Ice Cream',       category: 'Dessert',     price:  5.00, isAvailable: true,  description: 'Three scoops of premium matcha.' },
        { name: 'Mochi',                  category: 'Dessert',     price:  4.50, isAvailable: false, description: 'Assorted mochi in three flavours.' },
        { name: 'Green Tea',              category: 'Drink',       price:  2.50, isAvailable: true,  description: 'Freshly brewed sencha.' },
        { name: 'Sake (small)',           category: 'Drink',       price:  5.99, isAvailable: true,  description: '180ml warm or cold.' },
      ],
    },
    {
      ownerIndex: 2,
      name: 'The Spice Route', cuisine: 'Indian',
      address: '44 Curry Mile, Manchester, M14 5NQ', phone: '0161 234 5678', isOpen: true,
      menuItems: [
        { name: 'Chicken Tikka Masala',  category: 'Main Course', price: 13.99, isAvailable: true,  description: 'Tender chicken in creamy spiced tomato sauce.' },
        { name: 'Lamb Rogan Josh',       category: 'Main Course', price: 14.99, isAvailable: true,  description: 'Slow-cooked lamb in aromatic Kashmiri spices.' },
        { name: 'Paneer Makhani',        category: 'Main Course', price: 12.50, isAvailable: true,  description: 'Cottage cheese in buttery tomato-cream sauce. (V)' },
        { name: 'Dal Tadka',             category: 'Main Course', price: 10.99, isAvailable: true,  description: 'Yellow lentils tempered with cumin and garlic. (V)' },
        { name: 'Samosas (2 pcs)',        category: 'Starter',    price:  5.50, isAvailable: true,  description: 'Crispy pastry with spiced potato and peas.' },
        { name: 'Onion Bhaji',           category: 'Starter',     price:  5.00, isAvailable: true,  description: 'Golden fried onion fritters with mint chutney.' },
        { name: 'Garlic Naan',           category: 'Side',        price:  3.00, isAvailable: true,  description: 'Soft leavened bread with garlic butter.' },
        { name: 'Pilau Rice',            category: 'Side',        price:  3.50, isAvailable: true,  description: 'Fragrant basmati rice with whole spices.' },
        { name: 'Gulab Jamun',           category: 'Dessert',     price:  4.50, isAvailable: true,  description: 'Soft milk dumplings in rose syrup.' },
        { name: 'Mango Lassi',           category: 'Drink',       price:  3.99, isAvailable: true,  description: 'Chilled yoghurt drink with Alphonso mango.' },
      ],
    },
    {
      ownerIndex: 0,
      name: "Mario's Pizza Express", cuisine: 'Italian',
      address: '5 Dough Street, Birmingham, B1 1BB', phone: '0121 456 7890', isOpen: false,
      menuItems: [
        { name: 'Four Cheese Pizza',  category: 'Main Course', price: 13.50, isAvailable: true, description: 'Mozzarella, gorgonzola, parmesan, ricotta.' },
        { name: 'Calzone',            category: 'Main Course', price: 12.00, isAvailable: true, description: 'Folded pizza with ham, ricotta and tomato.' },
        { name: 'Caesar Salad',       category: 'Starter',     price:  7.50, isAvailable: true, description: 'Romaine, croutons, anchovy dressing, parmesan.' },
        { name: 'Espresso',           category: 'Drink',       price:  2.50, isAvailable: true, description: 'Double shot.' },
      ],
    },
  ],
};

// POST /api/seed  — dev-only, idempotent
const seed = async (req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(403).json({ error: 'Seeding is disabled in production.' });

  try {
    // --- Users ---
    const allUserDefs = [...SEED_DATA.owners, ...SEED_DATA.customers];
    const userMap = {}; // username → User instance

    for (const def of allUserDefs) {
      const existing = await User.findOne({ where: { email: def.email } });
      if (existing) {
        userMap[def.username] = existing;
      } else {
        const hashed = await bcrypt.hash(def.password, 10);
        userMap[def.username] = await User.create({
          username: def.username, email: def.email,
          password: hashed, role: def.role,
        });
      }
    }

    // --- Restaurants + Menu Items ---
    const ownerUsernames = SEED_DATA.owners.map((o) => o.username);

    for (const rDef of SEED_DATA.restaurants) {
      const owner = userMap[ownerUsernames[rDef.ownerIndex]];

      let restaurant = await Restaurant.findOne({
        where: { name: rDef.name, ownerId: owner.id },
      });

      if (!restaurant) {
        restaurant = await Restaurant.create({
          name: rDef.name, cuisine: rDef.cuisine,
          address: rDef.address, phone: rDef.phone,
          isOpen: rDef.isOpen, ownerId: owner.id,
        });
      }

      for (const miDef of rDef.menuItems) {
        const exists = await MenuItem.findOne({
          where: { name: miDef.name, restaurantId: restaurant.id },
        });
        if (!exists) {
          await MenuItem.create({
            ...miDef, restaurantId: restaurant.id,
          });
        }
      }
    }

    const counts = {
      users:       await User.count(),
      restaurants: await Restaurant.count(),
      menuItems:   await MenuItem.count(),
    };

    return res.status(200).json({
      message: 'Database seeded successfully.',
      counts,
      credentials: {
        owners:    SEED_DATA.owners.map((o) => ({ email: o.email, password: o.password, role: o.role })),
        customers: SEED_DATA.customers.map((c) => ({ email: c.email, password: c.password, role: c.role })),
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: 'Seeding failed.', detail: err.message });
  }
};

module.exports = { seed };
