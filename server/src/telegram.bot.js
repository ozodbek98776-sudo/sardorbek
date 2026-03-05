const TelegramBot = require('node-telegram-bot-api');
const Customer = require('./models/Customer');
const logger = require('./services/loggerService');

class POSTelegramBot {
  constructor() {
    // Bot tokenini environment variable dan olish
    this.token = process.env.POS_TELEGRAM_BOT_TOKEN;
    this.adminChatId = process.env.POS_ADMIN_CHAT_ID;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pollingEnabled = false;

    if (!this.token) {
      logger.error('❌ POS_TELEGRAM_BOT_TOKEN topilmadi .env faylida');
      return;
    }

    // Bot yaratish
    this.initBot();
  }

  // Bot ni ishga tushirish
  async initBot() {
    try {
      // Avval eski polling ni to'xtatish (agar mavjud bo'lsa)
      if (this.bot) {
        try {
          await this.bot.stopPolling();
        } catch (e) {}
      }

      // DOIM polling o'chirilgan holda bot yaratish
      // Faqat xabar yuborish uchun ishlatiladi
      this.bot = new TelegramBot(this.token, { polling: false });
      this.pollingEnabled = false;
      console.log('🤖 POS Telegram Bot ishga tushdi (faqat xabar yuborish rejimi)');

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('❌ Bot yaratishda xatolik:', error);
    }
  }

  // Qayta ulanishni rejalashtirish - O'CHIRILGAN
  scheduleReconnect() {
    // Polling o'chirilgan, qayta ulanish kerak emas
    return;
  }

  // Barcha event handlerlarni o'rnatish - O'CHIRILGAN
  setupHandlers() {
    // Polling o'chirilgan, event handlerlar kerak emas
    console.log('ℹ️  Event handlerlar o\'chirilgan (polling o\'chirilgan)');
    return;
  }

  // /start komandasi - telefon raqam so'rash
  async handleStartCommand(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Foydalanuvchi';

    console.log(`📱 /start komandasi: ${userName} (${chatId})`);

    // Xush kelibsiz xabari
    const welcomeMessage = `
👋 Assalomu alaykum, ${userName}!

🏪 **Sardor Furnitura POS tizimiga xush kelibsiz!**

📱 Cheklar va xabarlarni olish uchun telefon raqamingizni yuboring.

👇 Quyidagi tugmani bosing:
    `;

    // Telefon raqam so'rash uchun keyboard
    const keyboard = {
      keyboard: [
        [
          {
            text: '📞 Telefonni yuborish',
            request_contact: true // Telegram avtomatik telefon raqamni yuboradi
          }
        ]
      ],
      resize_keyboard: true, // Tugmani kichikroq qilish
      one_time_keyboard: true // Bir marta ishlatgandan keyin yashirish
    };

    try {
      await this.bot.sendMessage(chatId, welcomeMessage.trim(), {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('❌ Start xabar yuborishda xatolik:', error);
    }
  }

  // Kontakt (telefon raqam) qabul qilish
  async handleContact(msg) {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact.phone_number;
    const userName = msg.from.first_name || 'Foydalanuvchi';

    console.log(`📞 Telefon raqam qabul qilindi: "${phoneNumber}" (${userName})`);

    try {
      // DB'dan mijozni qidirish - yangi funksiya bilan
      const customer = await this.findCustomerByPhone(phoneNumber);

      if (customer) {
        // Mijoz topildi - telegramChatId ni yangilash
        customer.telegramChatId = chatId.toString();
        await customer.save();

        console.log(`✅ Mijoz bog'landi: ${customer.name} (${customer.phone})`);

        // Muvaffaqiyat xabari (qarz ma'lumotisiz)
        const successMessage = `
✅ **Muvaffaqiyat!**

👤 **Mijoz:** ${customer.name}
📞 **Telefon:** ${customer.phone}
💰 **Jami xaridlar:** ${this.formatNumber(customer.totalPurchases)} so'm

🔔 Endi barcha cheklar va xabarlar shu yerga yuboriladi!

🙏 Xaridlaringiz uchun rahmat!
        `;

        await this.bot.sendMessage(chatId, successMessage.trim(), {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true } // Keyboardni olib tashlash
        });

        // Adminga xabar yuborish (ixtiyoriy)
        if (this.adminChatId) {
          try {
            const adminMessage = `
🔗 **YANGI MIJOZ BOG'LANDI**

👤 **Mijoz:** ${customer.name}
📞 **Telefon:** ${customer.phone}
💬 **Telegram:** @${msg.from.username || 'username_yoq'}
🆔 **Chat ID:** ${chatId}
📅 **Vaqt:** ${new Date().toLocaleString('uz-UZ')}
            `;

            await this.bot.sendMessage(this.adminChatId, adminMessage.trim(), {
              parse_mode: 'Markdown'
            });
            console.log('✅ Admin ga xabar yuborildi');
          } catch (adminError) {
            console.error('❌ Admin ga xabar yuborishda xatolik:', adminError);
            // Admin xabar xatoligi asosiy jarayonni to'xtatmasin
          }
        }

      } else {
        // Mijoz topilmadi
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        console.log(`❌ Mijoz topilmadi: "${phoneNumber}" -> "${normalizedPhone}"`);

        const notFoundMessage = `
❌ **Kechirasiz!**

📞 **${phoneNumber}** raqami bilan mijoz tizimda topilmadi.

🔍 **Qidirilgan formatlar:**
• ${normalizedPhone}
• ${normalizedPhone.replace(/^\+/, '')}
• ${normalizedPhone.replace(/^\+998/, '')}

💡 **Yechim:**
• Do'kon bilan bog'laning
• Telefon raqamingiz to'g'riligini tekshiring
• Avval xarid qilgan bo'lishingiz kerak

📞 **Aloqa:** +998 XX XXX XX XX
        `;

        await this.bot.sendMessage(chatId, notFoundMessage.trim(), {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true }
        });

        // Adminga xabar yuborish (ixtiyoriy)
        if (this.adminChatId) {
          try {
            const adminMessage = `
⚠️ **NOMA'LUM MIJOZ**

📞 **Telefon:** ${phoneNumber}
🔄 **Normalized:** ${normalizedPhone}
💬 **Telegram:** @${msg.from.username || 'username_yoq'}
🆔 **Chat ID:** ${chatId}
👤 **Ism:** ${userName}
📅 **Vaqt:** ${new Date().toLocaleString('uz-UZ')}

❗ Bu mijoz tizimda yo'q!
            `;

            await this.bot.sendMessage(this.adminChatId, adminMessage.trim(), {
              parse_mode: 'Markdown'
            });
            console.log('✅ Admin ga noma\'lum mijoz haqida xabar yuborildi');
          } catch (adminError) {
            console.error('❌ Admin ga xabar yuborishda xatolik:', adminError);
            // Admin xabar xatoligi asosiy jarayonni to'xtatmasin
          }
        }
      }

    } catch (error) {
      console.error('❌ Kontakt qayta ishlashda xatolik:', error);

      // Xatolik xabari
      const errorMessage = `
❌ **Xatolik yuz berdi!**

Iltimos, qaytadan urinib ko'ring yoki do'kon bilan bog'laning.

🔄 Qaytadan boshlash uchun: /start
      `;

      await this.bot.sendMessage(chatId, errorMessage.trim(), {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      });
    }
  }

  // Oddiy matn xabarlari
  async handleTextMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Telefon raqam kiritilgan bo'lishi mumkin
    if (this.isPhoneNumber(text)) {
      console.log(`📱 Matn orqali telefon raqam: ${text}`);

      // Telefon raqamni kontakt sifatida qayta ishlash
      const fakeContactMsg = {
        ...msg,
        contact: {
          phone_number: text
        }
      };

      await this.handleContact(fakeContactMsg);
    } else {
      // Boshqa xabarlar uchun yordam
      const helpMessage = `
ℹ️ **Yordam**

📱 Telefon raqamingizni yuborish uchun:
• "📞 Telefonni yuborish" tugmasini bosing
• Yoki raqamni to'g'ridan-to'g'ri yozing

📞 **Qabul qilinadigan formatlar:**
• +998 (XX) XXX-XX-XX
• +998XXXXXXXXX
• 998XXXXXXXXX
• XXXXXXXXX

🔄 Qaytadan boshlash: /start
      `;

      await this.bot.sendMessage(chatId, helpMessage.trim(), {
        parse_mode: 'Markdown'
      });
    }
  }

  // Telefon raqamni normalize qilish - YAXSHILANGAN VERSIYA
  normalizePhoneNumber(phone) {
    // Barcha bo'sh joylar va maxsus belgilarni olib tashlash
    let cleaned = phone.replace(/\D/g, ''); // Faqat raqamlar qoldirish

    console.log(`🔄 Normalize: "${phone}" -> "${cleaned}"`);

    // Turli formatlarni standart formatga o'tkazish
    if (cleaned.startsWith('998') && cleaned.length === 12) {
      // 998901234567 -> +998901234567
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('8') && cleaned.length === 10) {
      // 8901234567 -> +998901234567
      cleaned = '+99' + cleaned;
    } else if (cleaned.length === 9) {
      // 901234567 -> +998901234567
      cleaned = '+998' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      // 0901234567 -> +998901234567
      cleaned = '+998' + cleaned.substring(1);
    } else if (cleaned.length === 13 && cleaned.startsWith('998')) {
      // 9989901234567 -> +998901234567 (extra 998 boshi)
      cleaned = '+' + cleaned.substring(3);
    } else if (!cleaned.startsWith('998') && cleaned.length === 12) {
      // 999901234567 -> +998901234567 (noto'g'ri kod)
      cleaned = '+998' + cleaned.substring(3);
    }

    // Agar + belgisi yo'q bo'lsa va 998 bilan boshlansa
    if (!cleaned.startsWith('+') && cleaned.startsWith('998')) {
      cleaned = '+' + cleaned;
    }

    console.log(`✅ Normalize natija: "${cleaned}"`);
    return cleaned;
  }

  // Database da qidirish uchun barcha mumkin bo'lgan formatlarni yaratish
  async findCustomerByPhone(inputPhone) {
    const normalizedPhone = this.normalizePhoneNumber(inputPhone);

    // Turli formatlarni yaratish
    const phoneVariants = [
      normalizedPhone, // +998901234567
      normalizedPhone.replace(/^\+/, ''), // 998901234567
      normalizedPhone.replace(/^\+998/, ''), // 901234567
    ];

    // Agar +998901234567 formatida bo'lsa, formatted versiyasini ham qo'shish
    if (normalizedPhone.match(/^\+998\d{9}$/)) {
      const digits = normalizedPhone.substring(4); // 901234567
      const formatted = `+998 (${digits.substring(0, 2)}) ${digits.substring(2, 5)}-${digits.substring(5, 7)}-${digits.substring(7, 9)}`;
      phoneVariants.push(formatted); // +998 (90) 123-45-67
    }

    console.log(`🔍 Qidirilayotgan telefon variantlari:`, phoneVariants);

    // Har bir variant bo'yicha qidirish
    for (const variant of phoneVariants) {
      const customer = await Customer.findOne({ phone: variant });
      if (customer) {
        console.log(`✅ Mijoz topildi variant bilan: "${variant}"`);
        return customer;
      }
    }

    console.log(`❌ Hech qanday variant bilan mijoz topilmadi`);
    return null;
  }

  // Matn telefon raqam ekanligini tekshirish
  isPhoneNumber(text) {
    // Telefon raqam pattern'lari
    const phonePatterns = [
      /^\+998\d{9}$/, // +998901234567
      /^998\d{9}$/, // 998901234567
      /^\d{9}$/, // 901234567
      /^8\d{9}$/, // 8901234567
      /^0\d{9}$/ // 0901234567
    ];

    const cleaned = text.replace(/\D/g, '');
    return phonePatterns.some(pattern => pattern.test(cleaned));
  }

  // Raqamni formatlash
  formatNumber(num) {
    return new Intl.NumberFormat('uz-UZ').format(num);
  }

  // Mijozga chek yuborish (asosiy funksiya)
  async sendReceiptToCustomer(receiptData) {
    if (!receiptData.customer || !receiptData.customer.telegramChatId) {
      console.log('⚠️ Mijozda telegram ID yo\'q, chek yuborilmadi');
      return false;
    }

    const chatId = receiptData.customer.telegramChatId;

    try {
      // Chek xabarini tayyorlash
      const receiptMessage = this.formatReceiptMessage(receiptData);

      // Chekni yuborish
      await this.bot.sendMessage(chatId, receiptMessage, {
        parse_mode: 'Markdown'
      });

      console.log(`✅ Chek yuborildi: ${receiptData.customer.name}`);
      return true;

    } catch (error) {
      console.error(`❌ Chek yuborishda xatolik (${receiptData.customer.name}):`, error);
      return false;
    }
  }

  // Chek xabarini formatlash - MIJOZ UCHUN TUSHUNARLI (qarz ma'lumotisiz)
  formatReceiptMessage(receiptData) {
    const customer = receiptData.customer;
    const items = receiptData.items || [];
    const total = receiptData.total || 0;
    const paidAmount = receiptData.paidAmount || 0;
    const remainingAmount = receiptData.remainingAmount || 0;
    const receiptNumber = receiptData.receiptNumber || `CHK-${Date.now()}`;
    const sellerName = receiptData.sellerName || receiptData.createdBy?.name || 'Xodim';

    // To'lov ma'lumotlari
    let paymentInfo = '';
    if (paidAmount > 0) {
      paymentInfo += `💵 *To'langan:* ${this.formatNumber(paidAmount)} so'm\n`;
    }

    // To'lov turi
    const paymentMethod = this.getPaymentMethodText(receiptData.paymentMethod);

    const message = `
╔═══════════════════════╗
║   🧾 *XARID CHEKI*   ║
╚═══════════════════════╝

📅 *Sana:* ${new Date().toLocaleString('uz-UZ', { 
  day: '2-digit', 
  month: '2-digit', 
  year: 'numeric',
  hour: '2-digit', 
  minute: '2-digit' 
})}
🏪 *Do'kon:* Sardor Furnitura
👤 *Mijoz:* ${customer.name}
👨‍💼 *Sotuvchi:* ${sellerName}
🧾 *Chek №:* \`${receiptNumber}\`

━━━━━━━━━━━━━━━━━━━━━
📦 *Sotilgan mahsulotlar:*
━━━━━━━━━━━━━━━━━━━━━

${items.map((item, index) =>
      `${index + 1}. *${item.name}*
   ├ Miqdor: ${item.quantity} dona
   ├ Narx: ${this.formatNumber(item.price)} so'm
   └ Jami: ${this.formatNumber(item.quantity * item.price)} so'm`
    ).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━
💰 *Umumiy summa:* ${this.formatNumber(total)} so'm
💳 *To'lov usuli:* ${paymentMethod}
${paymentInfo}━━━━━━━━━━━━━━━━━━━━━

🙏 *Xaridingiz uchun rahmat!*
📞 *Aloqa:* Sardor Furnitura
    `;

    return message.trim();
  }

  // To'lov turini matnda ko'rsatish
  getPaymentMethodText(paymentMethod) {
    switch (paymentMethod) {
      case 'cash': return 'Naqd pul 💵';
      case 'card': return 'Plastik karta 💳';
      case 'click': return 'Click to\'lov 📱';
      default: return paymentMethod || 'Noma\'lum';
    }
  }

  // Barcha mahsulotlarni POS botga yuborish (22:00 hisobot)
  async sendProductReport() {
    if (!this.bot || !this.adminChatId) {
      console.log('⚠️ Bot yoki adminChatId yo\'q, hisobot yuborilmadi');
      return false;
    }

    try {
      const Product = require('./models/Product');
      const products = await Product.find({ quantity: { $gt: 0 } }).lean();

      if (products.length === 0) {
        await this.bot.sendMessage(this.adminChatId, '📦 Omborda mahsulot yo\'q', { parse_mode: 'Markdown' });
        return true;
      }

      // Header xabar
      await this.bot.sendMessage(this.adminChatId,
        `📊 *KUNLIK MAHSULOT HISOBOTI*\n📅 ${new Date().toLocaleDateString('uz-UZ')}\n📦 Jami: ${products.length} ta mahsulot`,
        { parse_mode: 'Markdown' }
      );

      const path = require('path');
      const fs = require('fs');

      for (const product of products) {
        // Product info text
        const unitPrice = product.prices?.find(p => p.type === 'unit' && p.isActive);
        const boxPrice = product.prices?.find(p => p.type === 'box' && p.isActive);
        const discountPrices = product.prices?.filter(p => p.type?.startsWith('discount') && p.isActive) || [];

        let info = `📦 *${product.name}*\n`;
        info += `🔢 Kod: \`${product.code || '-'}\`\n`;
        info += `📏 Qoldiq: ${product.quantity} ${product.unit || 'dona'}\n`;
        if (unitPrice) info += `💰 Dona narx: ${this.formatNumber(unitPrice.amount)} so'm\n`;
        if (boxPrice) info += `📦 Karobka narx: ${this.formatNumber(boxPrice.amount)} so'm\n`;
        if (discountPrices.length > 0) {
          discountPrices.forEach((d, i) => {
            info += `🏷 Chegirma ${i + 1}: ${this.formatNumber(d.amount)} so'm (${d.minQuantity}+ dona)\n`;
          });
        }

        // Rasm bilan yoki rasmsiz yuborish
        const hasImage = product.images && product.images.length > 0;
        if (hasImage) {
          const imagePath = path.join(__dirname, '../uploads', product.images[0].path);
          if (fs.existsSync(imagePath)) {
            try {
              await this.bot.sendPhoto(this.adminChatId, imagePath, { caption: info, parse_mode: 'Markdown' });
            } catch {
              await this.bot.sendMessage(this.adminChatId, info, { parse_mode: 'Markdown' });
            }
          } else {
            await this.bot.sendMessage(this.adminChatId, info, { parse_mode: 'Markdown' });
          }
        } else {
          await this.bot.sendMessage(this.adminChatId, info, { parse_mode: 'Markdown' });
        }

        // Telegram API rate limit - 50ms delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log(`✅ Mahsulot hisoboti yuborildi: ${products.length} ta`);
      return true;
    } catch (error) {
      console.error('❌ Mahsulot hisoboti yuborishda xatolik:', error);
      return false;
    }
  }

  // Botni to'xtatish
  stopBot() {
    if (this.bot) {
      this.bot.stopPolling();
      console.log('🛑 POS Telegram Bot to\'xtatildi');
    }
  }

  // Bot holatini tekshirish
  async getBotInfo() {
    try {
      const botInfo = await this.bot.getMe();
      console.log('🤖 Bot ma\'lumotlari:', {
        username: botInfo.username,
        first_name: botInfo.first_name,
        id: botInfo.id
      });
      return botInfo;
    } catch (error) {
      console.error('❌ Bot ma\'lumotlarini olishda xatolik:', error);
      return null;
    }
  }
}

// Singleton pattern - faqat bitta instance
let botInstance = null;

// Bot yaratish funksiyasi
function createPOSBot() {
  if (!botInstance) {
    botInstance = new POSTelegramBot();
  }
  return botInstance;
}

// Bot instanceni olish
function getPOSBot() {
  return botInstance;
}

// Export - faqat class
module.exports = POSTelegramBot;