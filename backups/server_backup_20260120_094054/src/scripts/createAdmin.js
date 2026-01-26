const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sardorbek_furnetura');
    console.log('MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ phone: '998123456789' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      name: 'Administrator',
      phone: '998123456789',
      password: '123456',
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Phone: +998123456789');
    console.log('Password: 123456');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();