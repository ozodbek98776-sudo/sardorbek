const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import models directly
const User = require('../../src/models/User');
const Product = require('../../src/models/Product');
const Customer = require('../../src/models/Customer');

// Import middleware
const { auth } = require('../../src/middleware/auth');

describe('🔐 ADMIN ROLE TESTS (Minimal)', () => {
  let app;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    // Create minimal Express app
    app = express();
    app.use(express.json());
    
    // Simple auth test route
    app.get('/api/auth/me', auth, (req, res) => {
      res.json({
        _id: req.user._id,
        name: req.user.name,
        role: req.user.role
      });
    });

    // Simple login route
    app.post('/api/auth/login', async (req, res) => {
      try {
        const { login, password } = req.body;
        
        // Fi