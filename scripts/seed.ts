import crypto from 'crypto';
import * as argon2 from '@node-rs/argon2';
import { db, queryClient } from '../src/db/client';
import {
  restaurants,
  restaurantSettings,
  users,
  tables,
  categories,
  menuItems,
  menuItemVariants,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
} from '../src/db/schema';
import { logger } from '../src/lib/logger';

export async function runSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Seed script refused to run when NODE_ENV is production');
  }

  logger.info('Starting database seed...');

  // 1. Create Demo Restaurant
  const [demoRestaurant] = await db
    .insert(restaurants)
    .values({
      name: 'Spice Garden Dine-In',
      legalName: 'Spice Garden Hospitality LLP',
      slug: 'spice-garden',
      logoUrl: '/images/demo-logo.png',
      brandColor: '#ea580c', // Warm orange
      address: '100ft Road, Indiranagar, Bengaluru, Karnataka 560038',
      stateCode: '29',
      phone: '+919876543210',
      gstin: '29ABCDE1234F1Z5',
      fssaiNumber: '11223344556677',
      taxScheme: 'REGULAR',
      timezone: 'Asia/Kolkata',
    })
    .onConflictDoNothing()
    .returning();

  const restaurantId = demoRestaurant?.id;
  if (!restaurantId) {
    logger.info('Restaurant already exists or seeded.');
    return;
  }

  // 2. Settings
  await db.insert(restaurantSettings).values({
    restaurantId,
    defaultTaxRateBp: 500, // 5%
    priceMode: 'EXCLUSIVE',
    serviceChargeBp: 0,
    serviceChargeTaxable: true,
    roundOffEnabled: true,
    invoicePrefix: 'INV',
    openingHours: {
      mon: [{ open: '11:00', close: '23:30' }],
      tue: [{ open: '11:00', close: '23:30' }],
      wed: [{ open: '11:00', close: '23:30' }],
      thu: [{ open: '11:00', close: '23:30' }],
      fri: [{ open: '11:00', close: '23:30' }],
      sat: [{ open: '11:00', close: '23:30' }],
      sun: [{ open: '11:00', close: '23:30' }],
    },
    lastOrderMinutesBeforeClose: 30,
    businessDayCutoff: '04:00',
    orderGuardMode: 'CONFIRM_NEW_DEVICE',
    autoAccept: false,
    cancelWindowSeconds: 60,
    sessionIdleMinutes: 120,
    maxActiveOrders: 5,
    maxOrderValue: 500000,
    maxSessionValue: 1500000,
    maxLinesPerOrder: 50,
    maxQtyPerLine: 20,
    ackWarnSeconds: 90,
    kdsWarnMinutes: 8,
    kdsLateMinutes: 15,
    kitchenCapacityTickets: 10,
    minutesPerExtraTicket: 2,
    extraDelayMinutes: 0,
  });

  // 3. Staff Users
  const passwordHash = await argon2.hash('Password123!');
  const pinHash = await argon2.hash('123456');

  await db.insert(users).values([
    {
      restaurantId,
      name: 'Ramesh Sharma (Owner)',
      email: 'owner@spicegarden.com',
      passwordHash,
      pinHash,
      role: 'OWNER',
    },
    {
      restaurantId,
      name: 'Chef Anil Kumar',
      email: 'kitchen@spicegarden.com',
      passwordHash,
      pinHash,
      role: 'KITCHEN',
    },
    {
      restaurantId,
      name: 'Suresh Gowda (Staff)',
      email: 'waiter@spicegarden.com',
      passwordHash,
      pinHash,
      role: 'WAITER',
    },
  ]);

  // 4. 8 Tables (T1 to T8)
  for (let i = 1; i <= 8; i++) {
    const token = crypto.randomBytes(16).toString('hex'); // 128-bit random token
    await db.insert(tables).values({
      restaurantId,
      label: `T${i}`,
      zone: i <= 4 ? 'Ground Floor' : 'Terrace Dining',
      capacity: i % 2 === 0 ? 4 : 2,
      token,
      isEnabled: true,
    });
  }

  // 5. 6 Categories
  const categoryDefs = [
    { name: 'Starters & Small Plates', sortOrder: 1 },
    { name: 'South Indian Specials', sortOrder: 2 },
    { name: 'Tandoor & Grills', sortOrder: 3 },
    { name: 'Curries & Dal', sortOrder: 4 },
    { name: 'Biryanis & Rice', sortOrder: 5 },
    { name: 'Desserts & Drinks', sortOrder: 6 },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const [inserted] = await db
      .insert(categories)
      .values({
        restaurantId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        isActive: true,
      })
      .returning();
    createdCategories[cat.name] = inserted.id;
  }

  // 6. 30 Menu Items with variants and modifier groups
  const menuDefs = [
    // Cat 1: Starters
    { cat: 'Starters & Small Plates', name: 'Paneer 65', price: 26000, veg: true, prep: 12 },
    { cat: 'Starters & Small Plates', name: 'Crispy Corn Pepper Fry', price: 22000, veg: true, prep: 10 },
    { cat: 'Starters & Small Plates', name: 'Gobi Manchurian', price: 21000, veg: true, prep: 12 },
    { cat: 'Starters & Small Plates', name: 'Chicken 65', price: 31000, veg: false, prep: 15 },
    { cat: 'Starters & Small Plates', name: 'Chilli Chicken Dry', price: 32000, veg: false, prep: 15 },

    // Cat 2: South Indian Specials
    { cat: 'South Indian Specials', name: 'Masala Dosa', price: 14000, veg: true, prep: 8 },
    { cat: 'South Indian Specials', name: 'Ghee Roast Dosa', price: 16000, veg: true, prep: 8 },
    { cat: 'South Indian Specials', name: 'Steamed Idli Vada Combo', price: 12000, veg: true, prep: 6 },
    { cat: 'South Indian Specials', name: 'Medu Vada (2 pcs)', price: 9000, veg: true, prep: 6 },
    { cat: 'South Indian Specials', name: 'Filter Coffee', price: 6000, veg: true, prep: 4 },

    // Cat 3: Tandoor & Grills
    { cat: 'Tandoor & Grills', name: 'Paneer Tikka', price: 28000, veg: true, prep: 18 },
    { cat: 'Tandoor & Grills', name: 'Tandoori Mushroom', price: 26000, veg: true, prep: 16 },
    { cat: 'Tandoor & Grills', name: 'Tandoori Chicken (Half)', price: 34000, veg: false, prep: 20 },
    { cat: 'Tandoor & Grills', name: 'Chicken Malai Tikka', price: 36000, veg: false, prep: 18 },
    { cat: 'Tandoor & Grills', name: 'Mutton Seekh Kebab', price: 42000, veg: false, prep: 20 },

    // Cat 4: Curries & Dal
    { cat: 'Curries & Dal', name: 'Dal Makhani', price: 24000, veg: true, prep: 15 },
    { cat: 'Curries & Dal', name: 'Paneer Butter Masala', price: 29000, veg: true, prep: 15 },
    { cat: 'Curries & Dal', name: 'Kadai Veg', price: 23000, veg: true, prep: 14 },
    { cat: 'Curries & Dal', name: 'Butter Chicken', price: 38000, veg: false, prep: 18 },
    { cat: 'Curries & Dal', name: 'Chicken Chettinad', price: 36000, veg: false, prep: 18 },

    // Cat 5: Biryanis & Rice
    { cat: 'Biryanis & Rice', name: 'Dum Veg Biryani', price: 26000, veg: true, prep: 15 },
    { cat: 'Biryanis & Rice', name: 'Paneer Dum Biryani', price: 29000, veg: true, prep: 16 },
    { cat: 'Biryanis & Rice', name: 'Hyderabadi Chicken Biryani', price: 36000, veg: false, prep: 18 },
    { cat: 'Biryanis & Rice', name: 'Mutton Dum Biryani', price: 46000, veg: false, prep: 20 },
    { cat: 'Biryanis & Rice', name: 'Jeera Rice', price: 18000, veg: true, prep: 10 },

    // Cat 6: Desserts & Drinks
    { cat: 'Desserts & Drinks', name: 'Gulab Jamun (2 pcs)', price: 9000, veg: true, prep: 5 },
    { cat: 'Desserts & Drinks', name: 'Rasmalai (2 pcs)', price: 12000, veg: true, prep: 5 },
    { cat: 'Desserts & Drinks', name: 'Mango Lassi', price: 11000, veg: true, prep: 5 },
    { cat: 'Desserts & Drinks', name: 'Sweet Fresh Lime Soda', price: 8000, veg: true, prep: 4 },
    { cat: 'Desserts & Drinks', name: 'Mineral Water (1L)', price: 4000, veg: true, prep: 1 },
  ];

  for (let i = 0; i < menuDefs.length; i++) {
    const def = menuDefs[i];
    const categoryId = createdCategories[def.cat];
    const [insertedItem] = await db
      .insert(menuItems)
      .values({
        restaurantId,
        categoryId,
        name: def.name,
        description: `Freshly prepared delicious ${def.name.toLowerCase()} with signature spices.`,
        basePrice: def.price,
        isVeg: def.veg,
        prepTimeMinutes: def.prep,
        sortOrder: i + 1,
        availability: 'AVAILABLE',
        dailyLimit: i === 22 ? 15 : null, // Limit Hyderabadi Chicken Biryani to 15 portions
      })
      .returning();

    // Add variants for Biryani (Regular vs Large)
    if (def.name.includes('Biryani')) {
      await db.insert(menuItemVariants).values([
        {
          itemId: insertedItem.id,
          name: 'Regular (Serves 1)',
          price: def.price,
          sortOrder: 1,
        },
        {
          itemId: insertedItem.id,
          name: 'Family Pack (Serves 3)',
          price: Math.round(def.price * 2.5),
          sortOrder: 2,
        },
      ]);
    }
  }

  // Add spice level modifier group
  const [spiceGroup] = await db
    .insert(modifierGroups)
    .values({
      restaurantId,
      name: 'Spice Level',
      minSelect: 0,
      maxSelect: 1,
    })
    .returning();

  await db.insert(modifierOptions).values([
    { groupId: spiceGroup.id, name: 'Mild', priceDelta: 0, sortOrder: 1 },
    { groupId: spiceGroup.id, name: 'Medium Spicy', priceDelta: 0, sortOrder: 2 },
    { groupId: spiceGroup.id, name: 'Extra Spicy', priceDelta: 0, sortOrder: 3 },
  ]);

  logger.info('Database seeded successfully with Demo Restaurant, Tables, Menu, and Staff!');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await queryClient.end();
    });
}
