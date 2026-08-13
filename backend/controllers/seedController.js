const bcrypt = require('bcrypt');
const { User, Restaurant, MenuItem, Order, OrderItem, Review } = require('../models');

/* ─── Static seed data ─────────────────────────────────────── */
const OWNERS = [
  { username: 'mario_owner',   email: 'mario@fooddash.dev',    password: 'password123', role: 'owner', defaultAddress: null },
  { username: 'sakura_owner',  email: 'sakura@fooddash.dev',   password: 'password123', role: 'owner', defaultAddress: null },
  { username: 'spice_owner',   email: 'spice@fooddash.dev',    password: 'password123', role: 'owner', defaultAddress: null },
  { username: 'burger_owner',  email: 'burger@fooddash.dev',   password: 'password123', role: 'owner', defaultAddress: null },
  { username: 'taco_owner',    email: 'taco@fooddash.dev',     password: 'password123', role: 'owner', defaultAddress: null },
];

const CUSTOMERS = [
  { username: 'alice',   email: 'alice@example.com',   password: 'password123', role: 'user', defaultAddress: '10 Baker Street, London, NW1 6XE' },
  { username: 'bob',     email: 'bob@example.com',     password: 'password123', role: 'user', defaultAddress: '22 Oxford Road, Manchester, M1 5WQ' },
  { username: 'carol',   email: 'carol@example.com',   password: 'password123', role: 'user', defaultAddress: '5 High Street, Edinburgh, EH1 1TB' },
  { username: 'david',   email: 'david@example.com',   password: 'password123', role: 'user', defaultAddress: '88 Broad Lane, Sheffield, S1 4AQ' },
  { username: 'emma',    email: 'emma@example.com',    password: 'password123', role: 'user', defaultAddress: '3 Park Avenue, Bristol, BS1 5NF' },
  { username: 'frank',   email: 'frank@example.com',   password: 'password123', role: 'user', defaultAddress: '14 Castle Road, Leeds, LS1 4JQ' },
  { username: 'grace',   email: 'grace@example.com',   password: 'password123', role: 'user', defaultAddress: '9 Victoria Street, Liverpool, L1 6DE' },
  { username: 'henry',   email: 'henry@example.com',   password: 'password123', role: 'user', defaultAddress: '31 Queens Road, Nottingham, NG1 2BN' },
  { username: 'iris',    email: 'iris@example.com',    password: 'password123', role: 'user', defaultAddress: '7 Canal Walk, Birmingham, B1 3HQ' },
  { username: 'james',   email: 'james@example.com',   password: 'password123', role: 'user', defaultAddress: '19 Elm Grove, Norwich, NR1 4RQ' },
];

const RESTAURANTS = [
  {
    ownerIdx: 0, name: "Mario's Italian Kitchen", cuisine: 'Italian',
    address: '12 Pasta Lane, London, W1A 1AA', phone: '020 7123 4567', isOpen: true,
    items: [
      { name: 'Margherita Pizza',    category: 'Main Course', price: 11.99, isAvailable: true,  description: 'Classic tomato, mozzarella and fresh basil.' },
      { name: 'Pepperoni Pizza',     category: 'Main Course', price: 13.99, isAvailable: true,  description: 'Loaded with spicy pepperoni slices.' },
      { name: 'Spaghetti Carbonara', category: 'Main Course', price: 12.50, isAvailable: true,  description: 'Creamy egg sauce, pancetta, black pepper.' },
      { name: 'Penne Arrabbiata',    category: 'Main Course', price: 10.99, isAvailable: true,  description: 'Spicy tomato sauce with garlic and chilli.' },
      { name: 'Lasagne al Forno',    category: 'Main Course', price: 13.50, isAvailable: true,  description: 'Slow-cooked beef ragù, béchamel, pasta sheets.' },
      { name: 'Garlic Bread',        category: 'Starter',     price:  4.50, isAvailable: true,  description: 'Toasted ciabatta with garlic butter.' },
      { name: 'Bruschetta',          category: 'Starter',     price:  5.99, isAvailable: true,  description: 'Grilled bread with tomatoes and olive oil.' },
      { name: 'Tiramisu',            category: 'Dessert',     price:  6.50, isAvailable: true,  description: 'Classic Italian coffee dessert.' },
      { name: 'Panna Cotta',         category: 'Dessert',     price:  5.99, isAvailable: false, description: 'Silky vanilla cream with berry coulis.' },
      { name: 'San Pellegrino',      category: 'Drink',       price:  2.50, isAvailable: true,  description: 'Sparkling mineral water, 500 ml.' },
    ],
  },
  {
    ownerIdx: 1, name: 'Sakura Japanese Dining', cuisine: 'Japanese',
    address: '8 Cherry Blossom St, London, E1 6RF', phone: '020 7987 6543', isOpen: true,
    items: [
      { name: 'Salmon Nigiri (2 pcs)',   category: 'Starter',     price:  6.50, isAvailable: true,  description: 'Hand-pressed rice with fresh Atlantic salmon.' },
      { name: 'Tuna Maki (6 pcs)',       category: 'Starter',     price:  7.99, isAvailable: true,  description: 'Rolled sushi with premium tuna.' },
      { name: 'Ramen',                   category: 'Main Course', price: 13.50, isAvailable: true,  description: 'Rich tonkotsu broth, chashu pork, soft egg.' },
      { name: 'Chicken Teriyaki',        category: 'Main Course', price: 14.00, isAvailable: true,  description: 'Glazed chicken with steamed rice and salad.' },
      { name: 'Beef Gyudon',             category: 'Main Course', price: 13.00, isAvailable: true,  description: 'Tender beef over rice with pickled ginger.' },
      { name: 'Vegetable Gyoza (6 pcs)', category: 'Starter',     price:  6.99, isAvailable: true,  description: 'Pan-fried dumplings with ponzu dipping sauce.' },
      { name: 'Edamame',                 category: 'Snack',       price:  3.50, isAvailable: true,  description: 'Salted steamed soybeans.' },
      { name: 'Matcha Ice Cream',        category: 'Dessert',     price:  5.00, isAvailable: true,  description: 'Three scoops of premium matcha.' },
      { name: 'Mochi',                   category: 'Dessert',     price:  4.50, isAvailable: false, description: 'Assorted mochi in three flavours.' },
      { name: 'Green Tea',               category: 'Drink',       price:  2.50, isAvailable: true,  description: 'Freshly brewed sencha.' },
    ],
  },
  {
    ownerIdx: 2, name: 'The Spice Route', cuisine: 'Indian',
    address: '44 Curry Mile, Manchester, M14 5NQ', phone: '0161 234 5678', isOpen: true,
    items: [
      { name: 'Chicken Tikka Masala', category: 'Main Course', price: 13.99, isAvailable: true,  description: 'Tender chicken in creamy spiced tomato sauce.' },
      { name: 'Lamb Rogan Josh',      category: 'Main Course', price: 14.99, isAvailable: true,  description: 'Slow-cooked lamb in aromatic Kashmiri spices.' },
      { name: 'Paneer Makhani',       category: 'Main Course', price: 12.50, isAvailable: true,  description: 'Cottage cheese in buttery tomato-cream sauce. (V)' },
      { name: 'Dal Tadka',            category: 'Main Course', price: 10.99, isAvailable: true,  description: 'Yellow lentils tempered with cumin and garlic. (V)' },
      { name: 'Prawn Biryani',        category: 'Main Course', price: 15.50, isAvailable: true,  description: 'Fragrant basmati rice with king prawns and saffron.' },
      { name: 'Samosas (2 pcs)',      category: 'Starter',     price:  5.50, isAvailable: true,  description: 'Crispy pastry with spiced potato and peas.' },
      { name: 'Onion Bhaji',          category: 'Starter',     price:  5.00, isAvailable: true,  description: 'Golden fried onion fritters with mint chutney.' },
      { name: 'Garlic Naan',          category: 'Side',        price:  3.00, isAvailable: true,  description: 'Soft leavened bread with garlic butter.' },
      { name: 'Gulab Jamun',          category: 'Dessert',     price:  4.50, isAvailable: true,  description: 'Soft milk dumplings in rose syrup.' },
      { name: 'Mango Lassi',          category: 'Drink',       price:  3.99, isAvailable: true,  description: 'Chilled yoghurt drink with Alphonso mango.' },
    ],
  },
  {
    ownerIdx: 3, name: 'Big Bun Burgers', cuisine: 'American',
    address: '7 Grill Street, Birmingham, B2 4RY', phone: '0121 555 9900', isOpen: true,
    items: [
      { name: 'Classic Cheeseburger',  category: 'Main Course', price: 10.99, isAvailable: true,  description: 'Beef patty, cheddar, lettuce, tomato, pickles.' },
      { name: 'Bacon Double Stack',    category: 'Main Course', price: 13.99, isAvailable: true,  description: 'Two patties, smoked bacon, American cheese.' },
      { name: 'BBQ Pulled Pork Bun',   category: 'Main Course', price: 12.50, isAvailable: true,  description: 'Slow-smoked pork with smoky BBQ sauce and slaw.' },
      { name: 'Veggie Beyond Burger',  category: 'Main Course', price: 11.50, isAvailable: true,  description: 'Plant-based patty with guac and tomato salsa. (V)' },
      { name: 'Crispy Chicken Burger', category: 'Main Course', price: 11.99, isAvailable: true,  description: 'Southern-fried chicken fillet, sriracha mayo.' },
      { name: 'Loaded Fries',          category: 'Side',        price:  5.99, isAvailable: true,  description: 'Fries topped with cheese sauce, jalapeños and bacon.' },
      { name: 'Onion Rings',           category: 'Side',        price:  4.50, isAvailable: true,  description: 'Beer-battered crispy onion rings.' },
      { name: 'Coleslaw',              category: 'Side',        price:  2.50, isAvailable: true,  description: 'Creamy homemade coleslaw.' },
      { name: 'Chocolate Milkshake',   category: 'Drink',       price:  4.99, isAvailable: true,  description: 'Thick, creamy chocolate shake.' },
      { name: 'Strawberry Milkshake',  category: 'Drink',       price:  4.99, isAvailable: false, description: 'Thick, creamy strawberry shake.' },
    ],
  },
  {
    ownerIdx: 4, name: 'El Taco Loco', cuisine: 'Mexican',
    address: '3 Fiesta Road, Leeds, LS2 7HQ', phone: '0113 765 4321', isOpen: true,
    items: [
      { name: 'Beef Tacos (3 pcs)',      category: 'Main Course', price: 11.99, isAvailable: true,  description: 'Spiced beef mince, salsa, sour cream, guac.' },
      { name: 'Chicken Burrito',         category: 'Main Course', price: 10.99, isAvailable: true,  description: 'Grilled chicken, rice, beans, cheese, chipotle.' },
      { name: 'Veggie Quesadilla',       category: 'Main Course', price:  9.99, isAvailable: true,  description: 'Grilled pepper, black bean, cheese, jalapeño. (V)' },
      { name: 'Prawn Fajitas',           category: 'Main Course', price: 13.50, isAvailable: true,  description: 'Seasoned prawns with peppers and warm tortillas.' },
      { name: 'Nachos Supreme',          category: 'Starter',     price:  7.99, isAvailable: true,  description: 'Tortilla chips, cheese, jalapeños, guac, salsa.' },
      { name: 'Guacamole & Chips',       category: 'Starter',     price:  5.50, isAvailable: true,  description: 'Fresh-made guac with lime and coriander.' },
      { name: 'Mexican Street Corn',     category: 'Side',        price:  4.99, isAvailable: true,  description: 'Grilled corn with mayo, chilli powder and cotija.' },
      { name: 'Refried Beans',           category: 'Side',        price:  3.00, isAvailable: true,  description: 'Creamy spiced pinto beans.' },
      { name: 'Churros',                 category: 'Dessert',     price:  5.99, isAvailable: true,  description: 'Cinnamon-dusted churros with chocolate dipping sauce.' },
      { name: 'Horchata',                category: 'Drink',       price:  3.50, isAvailable: true,  description: 'Chilled rice milk with cinnamon and vanilla.' },
    ],
  },
];

// Orders to create: [customerIdx, restaurantIdx, itemIndices, qty, status, address, notes]
const ORDER_TEMPLATES = [
  // pending (2)
  [0, 0, [0,4], [1,1], 'pending',          '10 Baker Street, London, NW1 6XE', ''],
  [1, 2, [0,5], [2,1], 'pending',          '22 Oxford Road, Manchester, M1 5WQ', 'Extra spicy please'],
  // confirmed (2)
  [2, 1, [2,6], [1,1], 'confirmed',        '5 High Street, Edinburgh, EH1 1TB', ''],
  [3, 3, [0,5], [1,1], 'confirmed',        '88 Broad Lane, Sheffield, S1 4AQ', 'No onions'],
  // preparing (2)
  [4, 4, [0,4,8], [2,1,1], 'preparing',   '3 Park Avenue, Bristol, BS1 5NF', ''],
  [5, 0, [2,6],   [1,2],   'preparing',   '14 Castle Road, Leeds, LS1 4JQ', 'Ring buzzer'],
  // out_for_delivery (2)
  [6, 1, [0,7], [2,1], 'out_for_delivery','9 Victoria Street, Liverpool, L1 6DE', ''],
  [7, 2, [0,6], [1,2], 'out_for_delivery','31 Queens Road, Nottingham, NG1 2BN', ''],
  // delivered (2 — will also get reviews)
  [8, 3, [0,5,7], [1,2,1], 'delivered',   '7 Canal Walk, Birmingham, B1 3HQ', ''],
  [9, 4, [0,4,9], [2,1,1], 'delivered',   '19 Elm Grove, Norwich, NR1 4RQ', ''],
  // cancelled (2)
  [0, 2, [0,7], [1,1], 'cancelled',       '10 Baker Street, London, NW1 6XE', ''],
  [1, 4, [0,6], [1,1], 'cancelled',       '22 Oxford Road, Manchester, M1 5WQ', ''],
];

// Reviews: [customerIdx, restaurantIdx, rating, comment]  (only for delivered orders)
const REVIEW_TEMPLATES = [
  [8, 3, 5, 'Absolutely loved the burgers — fast delivery and piping hot!'],
  [9, 4, 4, 'Great tacos, churros were a dream. Will order again.'],
  [0, 0, 5, 'Best pizza in London, hands down.'],
  [1, 2, 4, 'Spice level was perfect, Mango Lassi is a must.'],
  [2, 1, 5, 'Ramen was rich and authentic, arrived in great condition.'],
  [3, 3, 3, 'Burger was good but fries arrived a bit cold.'],
  [4, 4, 5, 'El Taco Loco never disappoints. Incredible value.'],
  [5, 0, 4, 'Carbonara was delicious. Garlic bread slightly overdone.'],
  [6, 1, 5, 'Teriyaki chicken was perfectly glazed. Would recommend.'],
  [7, 2, 4, 'Tikka Masala was rich and creamy — generous portion too.'],
];

/* ─── Seed handler ─────────────────────────────────────────── */
const seed = async (req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(403).json({ error: 'Seeding is disabled in production.' });

  try {
    /* 1. Users */
    const allDefs = [...OWNERS, ...CUSTOMERS];
    const users = [];
    for (const def of allDefs) {
      let u = await User.findOne({ where: { email: def.email } });
      if (!u) {
        const hashed = await bcrypt.hash(def.password, 10);
        u = await User.create({ ...def, password: hashed });
      }
      users.push(u);
    }
    const ownerUsers    = users.slice(0, OWNERS.length);
    const customerUsers = users.slice(OWNERS.length);

    /* 2. Restaurants + Menu Items */
    const restaurants = [];
    const menuItemsByRestaurant = []; // array of MenuItem[] per restaurant
    for (const rDef of RESTAURANTS) {
      let r = await Restaurant.findOne({ where: { name: rDef.name, ownerId: ownerUsers[rDef.ownerIdx].id } });
      if (!r) {
        r = await Restaurant.create({
          name: rDef.name, cuisine: rDef.cuisine,
          address: rDef.address, phone: rDef.phone,
          isOpen: rDef.isOpen, ownerId: ownerUsers[rDef.ownerIdx].id,
        });
      }
      restaurants.push(r);

      const items = [];
      for (const iDef of rDef.items) {
        let item = await MenuItem.findOne({ where: { name: iDef.name, restaurantId: r.id } });
        if (!item) item = await MenuItem.create({ ...iDef, restaurantId: r.id });
        items.push(item);
      }
      menuItemsByRestaurant.push(items);
    }

    /* 3. Orders + OrderItems */
    for (const [cIdx, rIdx, itemIdxs, qtys, status, address, notes] of ORDER_TEMPLATES) {
      const customer    = customerUsers[cIdx];
      const restaurant  = restaurants[rIdx];
      const items       = menuItemsByRestaurant[rIdx];

      const lines = itemIdxs.map((iIdx, k) => ({
        item: items[iIdx],
        quantity: qtys[k],
      }));

      const totalAmount = lines.reduce((s, l) => s + parseFloat(l.item.price) * l.quantity, 0);

      // Skip duplicate orders (idempotent re-seed)
      const existing = await Order.findOne({
        where: { userId: customer.id, restaurantId: restaurant.id, status, deliveryAddress: address },
      });
      if (existing) continue;

      const order = await Order.create({
        userId: customer.id,
        restaurantId: restaurant.id,
        status,
        deliveryAddress: address,
        notes,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      });

      for (const { item, quantity } of lines) {
        await OrderItem.create({
          orderId:    order.id,
          menuItemId: item.id,
          itemName:   item.name,
          unitPrice:  item.price,
          quantity,
        });
      }
    }

    /* 4. Reviews */
    for (const [cIdx, rIdx, rating, comment] of REVIEW_TEMPLATES) {
      const customer   = customerUsers[cIdx];
      const restaurant = restaurants[rIdx];
      const exists = await Review.findOne({ where: { userId: customer.id, restaurantId: restaurant.id } });
      if (!exists) {
        await Review.create({ userId: customer.id, restaurantId: restaurant.id, rating, comment });
      }
    }

    /* 5. Summary */
    const counts = {
      users:       await User.count(),
      restaurants: await Restaurant.count(),
      menuItems:   await MenuItem.count(),
      orders:      await Order.count(),
      reviews:     await Review.count(),
    };

    return res.status(200).json({
      message: 'Database seeded successfully.',
      counts,
      credentials: {
        owners:    OWNERS.map((o) => ({ email: o.email, password: o.password })),
        customers: CUSTOMERS.map((c) => ({ email: c.email, password: c.password })),
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ error: 'Seeding failed.', detail: err.message });
  }
};

module.exports = { seed };
