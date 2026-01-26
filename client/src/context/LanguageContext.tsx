import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'uz' | 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Tarjimalar
const translations = {
  uz: {
    // Login sahifasi
    'login.title': 'Sardorbek.Furnetura',
    'login.subtitle': 'Professional Biznes Boshqaruv Tizimi',
    'login.secure': 'Xavfsiz va Ishonchli',
    'login.welcome': 'Xush kelibsiz',
    'login.description': 'Davom etish uchun hisobingizga kiring',
    'login.phone': 'Telefon raqam',
    'login.password': 'Parol',
    'login.passwordPlaceholder': 'Parolingizni kiriting',
    'login.signing': 'Kirilmoqda...',
    'login.signin': 'Kirish',
    'login.error': 'Kirish xatosi',

    // Sidebar
    'sidebar.statistics': 'Statistika',
    'sidebar.products': 'Tovarlar',
    'sidebar.warehouses': 'Omborlar',
    'sidebar.customers': 'Mijozlar',
    'sidebar.debts': 'Qarz daftarcha',
    'sidebar.orders': 'Buyurtmalar',
    'sidebar.helpers': 'Yordamchilar',
    'sidebar.settings': 'Sozlamalar',
    'sidebar.pos': 'Kassa (POS)',
    'sidebar.receipts': 'Xodimlar cheklari',
    'sidebar.aiAssistant': 'AI Yordamchi',
    'sidebar.signout': 'Chiqish',
    'sidebar.editProfile': 'Profilni tahrirlash',
    'sidebar.fullName': 'To\'liq ism',
    'sidebar.namePlaceholder': 'Ismingizni kiriting',
    'sidebar.phoneNumber': 'Telefon raqam',
    'sidebar.newPassword': 'Yangi parol (Ixtiyoriy)',
    'sidebar.passwordHint': 'Joriy parolni saqlash uchun bo\'sh qoldiring',
    'sidebar.cancel': 'Bekor qilish',
    'sidebar.saveChanges': 'O\'zgarishlarni saqlash',

    // Dashboard
    'dashboard.title': 'Statistika paneli',
    'dashboard.overview': 'Biznes ko\'rsatkichlari',
    'dashboard.description': 'Biznesingizning ishlashi va asosiy ko\'rsatkichlarini kuzating',
    'dashboard.totalRevenue': 'Umumiy daromad',
    'dashboard.todaySales': 'Bugungi savdo',
    'dashboard.weeklySales': 'Haftalik savdo',
    'dashboard.totalOrders': 'Jami buyurtmalar',
    'dashboard.peakHour': 'Eng yuqori soat',
    'dashboard.today': 'Bugun',
    'dashboard.thisWeek': 'Bu hafta',
    'dashboard.refresh': 'Ma\'lumotlarni yangilash',
    'dashboard.totalProducts': 'Jami mahsulotlar',
    'dashboard.lowStock': 'Kam qolgan',
    'dashboard.outOfStock': 'Tugagan',
    'dashboard.inventoryStatus': 'Ombor holati',
    'dashboard.currentStock': 'Joriy zaxira ko\'rinishi',
    'dashboard.liveData': 'Jonli ma\'lumotlar',

    // Header
    'header.search': 'Qidirish...',
    'header.live': 'Jonli',

    // Common
    'common.loading': 'Yuklanmoqda...',
    'common.error': 'Xatolik yuz berdi',
    'common.success': 'Muvaffaqiyatli',
    'common.save': 'Saqlash',
    'common.cancel': 'Bekor qilish',
    'common.delete': 'O\'chirish',
    'common.edit': 'Tahrirlash',
    'common.add': 'Qo\'shish',
    'common.close': 'Yopish',
  },
  en: {
    // Login page
    'login.title': 'Sardorbek.Furnetura',
    'login.subtitle': 'Professional Business Management System',
    'login.secure': 'Secure & Reliable',
    'login.welcome': 'Welcome Back',
    'login.description': 'Sign in to your account to continue',
    'login.phone': 'Phone Number',
    'login.password': 'Password',
    'login.passwordPlaceholder': 'Enter your password',
    'login.signing': 'Signing in...',
    'login.signin': 'Sign In',
    'login.error': 'Authentication Error',

    // Sidebar
    'sidebar.statistics': 'Statistics',
    'sidebar.products': 'Products',
    'sidebar.warehouses': 'Warehouses',
    'sidebar.customers': 'Customers',
    'sidebar.debts': 'Debt Book',
    'sidebar.orders': 'Orders',
    'sidebar.helpers': 'Helpers',
    'sidebar.settings': 'Settings',
    'sidebar.pos': 'POS System',
    'sidebar.receipts': 'Staff Receipts',
    'sidebar.aiAssistant': 'AI Assistant',
    'sidebar.signout': 'Sign Out',
    'sidebar.editProfile': 'Edit Profile',
    'sidebar.fullName': 'Full Name',
    'sidebar.namePlaceholder': 'Enter your name',
    'sidebar.phoneNumber': 'Phone Number',
    'sidebar.newPassword': 'New Password (Optional)',
    'sidebar.passwordHint': 'Leave empty to keep current password',
    'sidebar.cancel': 'Cancel',
    'sidebar.saveChanges': 'Save Changes',

    // Dashboard
    'dashboard.title': 'Dashboard Analytics',
    'dashboard.overview': 'Business Overview',
    'dashboard.description': 'Monitor your business performance and key metrics',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.todaySales': 'Today Sales',
    'dashboard.weeklySales': 'Weekly Sales',
    'dashboard.totalOrders': 'Total Orders',
    'dashboard.peakHour': 'Peak Hour',
    'dashboard.today': 'Today',
    'dashboard.thisWeek': 'This Week',
    'dashboard.refresh': 'Refresh Data',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.lowStock': 'Low Stock',
    'dashboard.outOfStock': 'Out of Stock',
    'dashboard.inventoryStatus': 'Inventory Status',
    'dashboard.currentStock': 'Current stock overview',
    'dashboard.liveData': 'Live Data',

    // Header
    'header.search': 'Search...',
    'header.live': 'Live',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
  },
  ru: {
    // Login page
    'login.title': 'Sardorbek.Furnetura',
    'login.subtitle': 'Профессиональная система управления бизнесом',
    'login.secure': 'Безопасно и надежно',
    'login.welcome': 'Добро пожаловать',
    'login.description': 'Войдите в свой аккаунт, чтобы продолжить',
    'login.phone': 'Номер телефона',
    'login.password': 'Пароль',
    'login.passwordPlaceholder': 'Введите ваш пароль',
    'login.signing': 'Вход...',
    'login.signin': 'Войти',
    'login.error': 'Ошибка аутентификации',

    // Sidebar
    'sidebar.statistics': 'Статистика',
    'sidebar.products': 'Товары',
    'sidebar.warehouses': 'Склады',
    'sidebar.customers': 'Клиенты',
    'sidebar.debts': 'Долговая книга',
    'sidebar.orders': 'Заказы',
    'sidebar.helpers': 'Помощники',
    'sidebar.settings': 'Настройки',
    'sidebar.pos': 'POS система',
    'sidebar.receipts': 'Чеки сотрудников',
    'sidebar.aiAssistant': 'AI Помощник',
    'sidebar.signout': 'Выйти',
    'sidebar.editProfile': 'Редактировать профиль',
    'sidebar.fullName': 'Полное имя',
    'sidebar.namePlaceholder': 'Введите ваше имя',
    'sidebar.phoneNumber': 'Номер телефона',
    'sidebar.newPassword': 'Новый пароль (необязательно)',
    'sidebar.passwordHint': 'Оставьте пустым, чтобы сохранить текущий пароль',
    'sidebar.cancel': 'Отмена',
    'sidebar.saveChanges': 'Сохранить изменения',

    // Dashboard
    'dashboard.title': 'Панель аналитики',
    'dashboard.overview': 'Обзор бизнеса',
    'dashboard.description': 'Отслеживайте производительность вашего бизнеса и ключевые показатели',
    'dashboard.totalRevenue': 'Общий доход',
    'dashboard.todaySales': 'Продажи сегодня',
    'dashboard.weeklySales': 'Недельные продажи',
    'dashboard.totalOrders': 'Всего заказов',
    'dashboard.peakHour': 'Пиковый час',
    'dashboard.today': 'Сегодня',
    'dashboard.thisWeek': 'Эта неделя',
    'dashboard.refresh': 'Обновить данные',
    'dashboard.totalProducts': 'Всего товаров',
    'dashboard.lowStock': 'Мало на складе',
    'dashboard.outOfStock': 'Нет в наличии',
    'dashboard.inventoryStatus': 'Статус склада',
    'dashboard.currentStock': 'Текущий обзор склада',
    'dashboard.liveData': 'Живые данные',

    // Header
    'header.search': 'Поиск...',
    'header.live': 'В реальном времени',

    // Common
    'common.loading': 'Загрузка...',
    'common.error': 'Произошла ошибка',
    'common.success': 'Успешно',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.add': 'Добавить',
    'common.close': 'Закрыть',
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('uz');

  useEffect(() => {
    document.documentElement.lang = 'uz';
  }, []);

  const t = (key: string): string => {
    return translations['uz'][key as keyof typeof translations['uz']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};