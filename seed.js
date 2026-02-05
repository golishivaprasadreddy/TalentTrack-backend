const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const users = [
  {
    name: 'Admin User',
    email: 'admin@amentcapital.com',
    password: 'admin@amentcapital.com',
    role: 'admin',
  },
  {
    name: 'HR',
    email: 'hr@amentcapital.com',
    password: 'hr@amentcapital.com',
    role: 'panel',
  },
  {
    name: 'Hemanth',
    email: 'hemanth@amentcapital.com',
    password: 'hemanth@amentcapital.com',
    role: 'panel',
  },
  {
    name: 'Employee 324439',
    email: 'emp324439@amentcapital.com',
    password: 'emp324439@amentcapital.com',
    role: 'panel',
  },
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create users
    for (const userData of users) {
      // Create user with plaintext password - the User model will hash it in the pre-save hook
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
      });

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }

    console.log('\n✨ Seeding completed successfully!');
    console.log('\n📋 Created Users:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach((user) => {
      console.log(`${user.role.toUpperCase().padEnd(10)} | ${user.email} | Password: ${user.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
