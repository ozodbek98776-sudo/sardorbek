const BaseService = require('./BaseService');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isValidRole, ALL_ROLES, ROLES } = require('../../constants/roles');

/**
 * User Service
 * Foydalanuvchi bilan bog'liq barcha business logic
 */
class UserService extends BaseService {
  constructor() {
    super('UserService');
  }

  /**
   * Foydalanuvchi ma'lumotlarini validate qilish
   */
  validateUserData(data, isUpdate = false) {
    const { name, login, phone, email, password, role } = data;

    // Ism tekshirish
    if (!isUpdate && (!name || typeof name !== 'string' || name.trim().length < 2)) {
      throw this.createValidationError('Foydalanuvchi ismi kamida 2 ta belgi bo\'lishi kerak', 'name');
    }

    // Role tekshirish
    if (role && !isValidRole(role)) {
      throw this.createValidationError(`Role ${ALL_ROLES.join(', ')} dan biri bo'lishi kerak`, 'role');
    }

    // Login tekshirish (admin uchun)
    if (role === ROLES.ADMIN && !isUpdate) {
      if (!login || typeof login !== 'string' || login.trim().length < 3) {
        throw this.createValidationError('Admin login kamida 3 ta belgi bo\'lishi kerak', 'login');
      }
    }

    // Telefon raqam tekshirish (cashier va helper uchun)
    if (['cashier', 'helper'].includes(role) && !isUpdate) {
      if (!phone) {
        throw this.createValidationError('Telefon raqam kiritilishi kerak', 'phone');
      }
      
      // Telefon formatini tozalash va tekshirish
      const cleanPhone = phone.replace(/\D/g, '');
      console.log('🔍 Server: Clean phone:', cleanPhone, 'Original phone:', phone);
      
      // Telefon raqam uzunligini tekshirish
      if (cleanPhone.length < 9) {
        console.log('❌ Server: Phone too short:', phone, 'Clean:', cleanPhone);
        throw this.createValidationError(`Telefon raqam juda qisqa: ${phone}. Kamida 9 raqam bo'lishi kerak`, 'phone');
      }
      
      // Telefon raqamni standart formatga keltirish
      let formattedPhone = phone;
      if (cleanPhone.startsWith('998') && cleanPhone.length === 12) {
        // 998XXXXXXXXX format
        formattedPhone = `+${cleanPhone}`;
      } else if (cleanPhone.length === 9) {
        // XXXXXXXXX format (998 qo'shish kerak)
        formattedPhone = `+998${cleanPhone}`;
      } else if (!phone.startsWith('+998')) {
        // Boshqa formatlar uchun oxirgi 9 raqamni olish
        const digits = cleanPhone.slice(-9);
        if (digits.length === 9) {
          formattedPhone = `+998${digits}`;
        }
      }
      
      // Final validation
      if (!/^\+998\d{9}$/.test(formattedPhone)) {
        console.log('❌ Server: Invalid final format:', formattedPhone);
        throw this.createValidationError(`Telefon raqam noto'g'ri formatda: ${phone}. +998XXXXXXXXX formatida kiriting`, 'phone');
      }
      
      // Formatted phone ni qaytarish uchun data ni yangilash
      data.phone = formattedPhone;
      console.log('🔧 Server: Final formatted phone:', formattedPhone);
    }

    // Email tekshirish (ixtiyoriy)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw this.createValidationError('Email formati noto\'g\'ri', 'email');
    }

    // Parol tekshirish
    if (!isUpdate && (!password || password.length < 6)) {
      throw this.createValidationError('Parol kamida 6 ta belgi bo\'lishi kerak', 'password');
    }

    return {
      name: name?.trim(),
      login: login?.trim(),
      phone: data.phone || phone?.trim(), // Formatted phone ni ishlatish
      email: email?.trim().toLowerCase(),
      password,
      role: role || 'helper'
    };
  }

  /**
   * JWT token yaratish
   */
  generateToken(user) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    // Security config dan expiration olish
    const { securityConfig } = require('../../config/security');
    const expiresIn = securityConfig?.jwt?.expiresIn || '8h';

    return jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Foydalanuvchi yaratish
   */
  async createUser(userData, createdBy) {
    return this.executeOperation(async () => {
      console.log('🔍 Server: Creating user with data:', userData);
      console.log('🔍 Server: Created by:', createdBy);
      
      const validatedData = this.validateUserData(userData);
      console.log('🔍 Server: Validated data:', validatedData);

      // Login unique ekanligini tekshirish (admin uchun)
      if (validatedData.login) {
        console.log('🔍 Server: Checking login uniqueness:', validatedData.login);
        const existingUser = await User.findOne({ login: validatedData.login });
        if (existingUser) {
          console.log('❌ Server: Login already exists:', validatedData.login);
          throw this.createValidationError(`Login allaqachon ishlatilgan: ${validatedData.login}`, 'login');
        }
      }

      // Telefon unique ekanligini tekshirish (cashier/helper uchun)
      if (validatedData.phone) {
        console.log('🔍 Server: Checking phone uniqueness:', validatedData.phone);
        const existingUser = await User.findOne({ phone: validatedData.phone });
        if (existingUser) {
          console.log('❌ Server: Phone already exists:', validatedData.phone);
          throw this.createValidationError(`Telefon raqam allaqachon ishlatilgan: ${validatedData.phone}`, 'phone');
        }
      }

      // Foydalanuvchi yaratish
      const user = new User({
        ...validatedData,
        createdBy: createdBy._id
      });

      await user.save();

      // Parolni response dan olib tashlash
      const userResponse = user.toObject();
      delete userResponse.password;

      this.logOperation('User created', {
        userId: user._id,
        name: user.name,
        role: user.role,
        createdBy: createdBy._id
      });

      return {
        success: true,
        user: userResponse
      };
    }, 'createUser', { name: userData.name, role: userData.role, createdBy: createdBy._id });
  }

  /**
   * Universal login - barcha rollar uchun
   */
  async login(loginOrPhone, password) {
    return this.executeOperation(async () => {
      if (!loginOrPhone || !password) {
        throw this.createValidationError('Login/telefon va parol kiritilishi kerak');
      }

      // Hardcoded admin check
      const HARDCODED_ADMIN = {
        login: 'admin',
        password: 'admin123',
        name: 'System Admin',
        role: 'admin'
      };

      // Agar hardcoded admin bo'lsa
      if (loginOrPhone === HARDCODED_ADMIN.login && password === HARDCODED_ADMIN.password) {
        // Hardcoded admin uchun fake user object
        const adminUser = {
          _id: 'hardcoded-admin-id',
          name: HARDCODED_ADMIN.name,
          login: HARDCODED_ADMIN.login,
          role: HARDCODED_ADMIN.role
        };

        const token = this.generateToken(adminUser);

        this.logOperation('Hardcoded admin logged in', {
          login: HARDCODED_ADMIN.login,
          role: HARDCODED_ADMIN.role
        });

        return {
          success: true,
          token,
          user: adminUser
        };
      }

      // Database dan foydalanuvchi qidirish
      let user = null;
      
      // Login bilan qidirish (admin uchun)
      user = await User.findOne({ login: loginOrPhone }).select('+password');
      
      // Agar login bilan topilmasa, telefon bilan qidirish (cashier/helper uchun)
      if (!user) {
        // Telefon formatini tozalash
        const cleanPhone = loginOrPhone.replace(/\D/g, ''); // Faqat raqamlar
        const phoneVariants = [
          loginOrPhone, // Asl format
          `+${cleanPhone}`, // + bilan
          `+998${cleanPhone.slice(-9)}`, // +998 bilan
          cleanPhone.slice(-9) // Oxirgi 9 raqam
        ];

        for (const phoneVariant of phoneVariants) {
          user = await User.findOne({ phone: phoneVariant }).select('+password');
          if (user) break;
        }
      }

      if (!user) {
        throw this.createValidationError('Login/telefon yoki parol noto\'g\'ri');
      }

      // Parolni tekshirish
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw this.createValidationError('Login/telefon yoki parol noto\'g\'ri');
      }

      // Token yaratish
      const token = this.generateToken(user);

      // Response uchun user ma'lumotlari
      const userResponse = {
        _id: user._id,
        name: user.name,
        login: user.login,
        phone: user.phone,
        role: user.role,
        email: user.email
      };

      this.logOperation('User logged in', {
        userId: user._id,
        name: user.name,
        role: user.role,
        loginMethod: user.login ? 'login' : 'phone'
      });

      return {
        success: true,
        token,
        user: userResponse
      };
    }, 'login', { loginOrPhone: loginOrPhone ? (loginOrPhone.substring(0, 10) + '...') : 'undefined' });
  }

  /**
   * Foydalanuvchi ma'lumotlarini yangilash
   */
  async updateUser(userId, updateData, updatedBy) {
    return this.executeOperation(async () => {
      const user = await User.findById(userId);
      if (!user) {
        throw this.createNotFoundError('Foydalanuvchi', userId);
      }

      // Ma'lumotlarni validate qilish
      const validatedData = this.validateUserData(updateData, true);

      // Login unique ekanligini tekshirish (agar o'zgartirilayotgan bo'lsa)
      if (validatedData.login && validatedData.login !== user.login) {
        const existingUser = await User.findOne({ 
          login: validatedData.login,
          _id: { $ne: userId }
        });
        if (existingUser) {
          throw this.createValidationError(`Login allaqachon ishlatilgan: ${validatedData.login}`, 'login');
        }
      }

      // Telefon unique ekanligini tekshirish (agar o'zgartirilayotgan bo'lsa)
      if (validatedData.phone && validatedData.phone !== user.phone) {
        const existingUser = await User.findOne({ 
          phone: validatedData.phone,
          _id: { $ne: userId }
        });
        if (existingUser) {
          throw this.createValidationError(`Telefon raqam allaqachon ishlatilgan: ${validatedData.phone}`, 'phone');
        }
      }

      // Ma'lumotlarni yangilash
      Object.keys(validatedData).forEach(key => {
        if (validatedData[key] !== undefined && key !== 'password') {
          user[key] = validatedData[key];
        }
      });

      // Parolni alohida yangilash (agar berilgan bo'lsa)
      if (validatedData.password) {
        user.password = validatedData.password; // Pre-save hook hash qiladi
      }

      await user.save();

      // Response uchun user ma'lumotlari
      const userResponse = user.toObject();
      delete userResponse.password;

      this.logOperation('User updated', {
        userId: user._id,
        name: user.name,
        role: user.role,
        updatedBy: updatedBy._id
      });

      return {
        success: true,
        user: userResponse
      };
    }, 'updateUser', { userId, updatedBy: updatedBy._id });
  }

  /**
   * Foydalanuvchi parolini o'zgartirish
   */
  async changePassword(userId, oldPassword, newPassword) {
    return this.executeOperation(async () => {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw this.createNotFoundError('Foydalanuvchi', userId);
      }

      // Eski parolni tekshirish
      const isOldPasswordValid = await user.comparePassword(oldPassword);
      if (!isOldPasswordValid) {
        throw this.createValidationError('Eski parol noto\'g\'ri');
      }

      // Yangi parolni validate qilish
      if (!newPassword || newPassword.length < 6) {
        throw this.createValidationError('Yangi parol kamida 6 ta belgi bo\'lishi kerak', 'newPassword');
      }

      // Parolni yangilash
      user.password = newPassword; // Pre-save hook hash qiladi
      await user.save();

      this.logOperation('Password changed', {
        userId: user._id,
        name: user.name
      });

      return {
        success: true,
        message: 'Parol muvaffaqiyatli o\'zgartirildi'
      };
    }, 'changePassword', { userId });
  }

  /**
   * Foydalanuvchilar ro'yxatini olish
   */
  async getUsers(filters = {}, pagination = {}) {
    return this.executeOperation(async () => {
      const { page = 1, limit = 20 } = pagination;
      const { role, search, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

      // Pagination validate qilish
      const paginationData = this.validatePagination(page, limit);

      // Query yaratish
      const query = {};

      if (role) query.role = role;

      // Qidiruv
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { login: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Ma'lumotlarni olish
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password')
          .populate('createdBy', 'name role')
          .sort(sort)
          .skip(paginationData.skip)
          .limit(paginationData.limit)
          .lean(),
        User.countDocuments(query)
      ]);

      this.logOperation('Users retrieved', {
        filters,
        pagination: paginationData,
        resultCount: users.length,
        totalCount: total
      });

      return this.createPaginationResponse(users, total, paginationData.page, paginationData.limit);
    }, 'getUsers', { filters, pagination });
  }

  /**
   * Foydalanuvchi statistikasini olish
   */
  async getUserStats() {
    return this.executeOperation(async () => {
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            totalEarnings: { $sum: '$totalEarnings' },
            totalBonus: { $sum: '$totalBonus' },
            averageBonus: { $avg: '$bonusPercentage' }
          }
        }
      ]);

      // Stats ni object formatiga o'tkazish
      const result = {
        total: 0,
        byRole: {},
        totalEarnings: 0,
        totalBonus: 0
      };

      stats.forEach(stat => {
        result.total += stat.count;
        result.totalEarnings += stat.totalEarnings || 0;
        result.totalBonus += stat.totalBonus || 0;
        result.byRole[stat._id] = {
          count: stat.count,
          totalEarnings: stat.totalEarnings || 0,
          totalBonus: stat.totalBonus || 0,
          averageBonus: stat.averageBonus || 0
        };
      });

      this.logOperation('User stats calculated', result);
      return result;
    }, 'getUserStats');
  }

  /**
   * Foydalanuvchini o'chirish
   */
  async deleteUser(userId, deletedBy) {
    return this.executeOperation(async () => {
      const user = await User.findById(userId);
      if (!user) {
        throw this.createNotFoundError('Foydalanuvchi', userId);
      }

      // O'zini o'chirishni taqiqlash
      if (userId === deletedBy._id.toString()) {
        throw this.createBusinessError('O\'zingizni o\'chira olmaysiz');
      }

      // Admin rolini tekshirish (oxirgi admin o'chirilmasin)
      if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          throw this.createBusinessError('Oxirgi adminni o\'chira olmaysiz');
        }
      }

      await User.findByIdAndDelete(userId);

      this.logOperation('User deleted', {
        userId: user._id,
        name: user.name,
        role: user.role,
        deletedBy: deletedBy._id
      });

      return {
        success: true,
        message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi'
      };
    }, 'deleteUser', { userId, deletedBy: deletedBy._id });
  }

  /**
   * Birinchi adminni ro'yxatdan o'tkazish - DEPRECATED
   * Endi hardcoded admin ishlatiladi
   */
  async registerFirstAdmin(userData) {
    return this.executeOperation(async () => {
      throw this.createValidationError('Admin yaratish o\'chirildi. Hardcoded admin ishlatiladi: login=admin, parol=admin123');
    }, 'registerFirstAdmin', { deprecated: true });
  }

  /**
   * Admin mavjudligini tekshirish - DEPRECATED
   * Endi hardcoded admin ishlatiladi
   */
  async checkAdminExists() {
    return this.executeOperation(async () => {
      return { 
        hasAdmin: true, // Hardcoded admin har doim mavjud
        count: 1,
        isHardcoded: true
      };
    }, 'checkAdminExists');
  }

  /**
   * Admin ma'lumotlarini olish
   */
  async getAdminInfo(userId) {
    return this.executeOperation(async () => {
      // Hardcoded admin check
      if (userId === 'hardcoded-admin-id') {
        return {
          success: true,
          admin: {
            _id: 'hardcoded-admin-id',
            name: 'System Admin',
            login: 'admin',
            role: 'admin',
            isHardcoded: true,
            createdAt: new Date('2024-01-01')
          }
        };
      }

      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        throw this.createNotFoundError('Foydalanuvchi', userId);
      }
      
      this.logOperation('Admin info retrieved', {
        userId: user._id,
        name: user.name
      });
      
      return {
        success: true,
        admin: {
          _id: user._id,
          name: user.name,
          login: user.login,
          role: user.role,
          createdAt: user.createdAt
        }
      };
    }, 'getAdminInfo', { userId });
  }

  /**
   * Admin login va parolni o'zgartirish
   */
  async updateAdminCredentials(userId, updateData) {
    return this.executeOperation(async () => {
      // Hardcoded admin uchun credentials o'zgartirib bo'lmaydi
      if (userId === 'hardcoded-admin-id') {
        throw this.createValidationError('Hardcoded admin uchun login va parolni o\'zgartirib bo\'lmaydi');
      }

      const { currentPassword, newLogin, newPassword } = updateData;
      
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw this.createNotFoundError('Foydalanuvchi', userId);
      }
      
      // Joriy parolni tekshirish
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw this.createValidationError('Joriy parol noto\'g\'ri');
      }
      
      // Yangi login tekshirish (agar o'zgartirilsa)
      if (newLogin && newLogin !== user.login) {
        const existingUser = await User.findOne({ 
          login: newLogin, 
          _id: { $ne: user._id } 
        });
        
        if (existingUser) {
          throw this.createValidationError('Bu login allaqachon band');
        }
        
        user.login = newLogin;
      }
      
      // Yangi parolni o'rnatish
      if (newPassword) {
        user.password = newPassword;
      }
      
      await user.save();
      
      // Yangi token yaratish
      const token = this.generateToken(user);
      
      this.logOperation('Admin credentials updated', {
        userId: user._id,
        name: user.name,
        newLogin: user.login
      });
      
      return {
        success: true,
        message: 'Login va parol muvaffaqiyatli o\'zgartirildi',
        token,
        user: {
          _id: user._id,
          name: user.name,
          login: user.login,
          role: user.role
        }
      };
    }, 'updateAdminCredentials', { userId });
  }
}

module.exports = UserService;