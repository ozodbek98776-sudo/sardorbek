const axios = require('axios');
const Customer = require('../models/Customer');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    // Qarzlar uchun alohida bot
    this.debtBotToken = process.env.TELEGRAM_DEBT_BOT_TOKEN;
    this.debtChatId = process.env.TELEGRAM_DEBT_CHAT_ID;
    this.debtBaseUrl = `https://api.telegram.org/bot${this.debtBotToken}`;

    // Hamkorlar uchun alohida bot
    this.partnerBotToken = process.env.PARTNER_BOT_TOKEN;
    this.partnerChatId = process.env.PARTNER_CHAT_ID;
    this.partnerBaseUrl = `https://api.telegram.org/bot${this.partnerBotToken}`;

    // POS Bot uchun alohida bot (mijozlar uchun)
    this.posBotToken = process.env.POS_TELEGRAM_BOT_TOKEN;
    this.posAdminChatId = process.env.POS_ADMIN_CHAT_ID;
    this.posBaseUrl = `https://api.telegram.org/bot${this.posBotToken}`;
  }

  // Webhook orqali kelgan xabarlarni qayta ishlash
  async handleWebhook(update) {
    try {
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const user = update.message.from;

        // /start komandasi
        if (text === '/start') {
          await this.handleStartCommand(chatId, user);
        }
        // Telefon raqam yuborilganda
        else if (text.match(/^\+998\d{9}$/) || text.match(/^998\d{9}$/) || text.match(/^\d{9}$/)) {
          await this.handlePhoneRegistration(chatId, text, user);
        }
        // Yordam komandasi
        else if (text === '/help') {
          await this.sendHelpMessage(chatId);
        }
        else {
          await this.sendMessage('Telefon raqamingizni yuboring (masalan: +998901234567)', chatId);
        }
      }
    } catch (error) {
      console.error('Webhook handle error:', error);
    }
  }

  // POS Bot webhook orqali kelgan xabarlarni qayta ishlash
  async handlePOSWebhook(update) {
    try {
      if (update.message) {
        const chatId = update.message.chat.id;
        const user = update.message.from;

        console.log(`POS Bot: ${user.first_name} (${chatId}) dan xabar keldi`);

        // Agar contact (telefon raqam) yuborilgan bo'lsa
        if (update.message.contact) {
          const phoneNumber = update.message.contact.phone_number;
          console.log(`POS Bot: Contact yuborildi - ${phoneNumber}`);
          await this.handlePOSPhoneRegistration(chatId, phoneNumber, user);
          return;
        }

        // Agar matn yuborilgan bo'lsa
        if (update.message.text) {
          const text = update.message.text;
          console.log(`POS Bot: Matn yuborildi - ${text}`);

          // /start komandasi
          if (text === '/start') {
            await this.handlePOSStartCommand(chatId, user);
          }
          // Telefon raqam yuborilganda
          else if (text.match(/^\+998\d{9}$/) || text.match(/^998\d{9}$/) || text.match(/^\d{9}$/)) {
            await this.handlePOSPhoneRegistration(chatId, text, user);
          }
          // Yordam komandasi
          else if (text === '/help') {
            await this.sendPOSHelpMessage(chatId);
          }
          else {
            const keyboard = {
              keyboard: [
                [{
                  text: "📱 Telefon raqamni yuborish",
                  request_contact: true
                }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            };
            await this.sendPOSMessage('📱 Telefon raqamingizni yuboring yoki pastdagi tugmani bosing:', chatId, keyboard);
          }
        }
      }
    } catch (error) {
      console.error('POS Webhook handle error:', error);
    }
  }

  // /start komandasi
  async handleStartCommand(chatId, user) {
    const welcomeMessage = `
👋 Assalomu alaykum, ${user.first_name}!

🏪 Sardor Furnitura do'koniga xush kelibsiz!

📱 Cheklar va xabarlarni olish uchun telefon raqamingizni yuboring:
Masalan: +998901234567

ℹ️ Yordam uchun /help buyrug'ini yuboring.
    `;

    await this.sendMessage(welcomeMessage.trim(), chatId);
  }

  // Telefon raqam ro'yxatdan o'tkazish
  async handlePhoneRegistration(chatId, phone, user) {
    try {
      // Telefon raqamni formatlash
      let formattedPhone = phone.replace(/\D/g, ''); // Faqat raqamlar
      if (formattedPhone.startsWith('998')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.length === 9) {
        formattedPhone = '+998' + formattedPhone;
      } else {
        await this.sendMessage('❌ Noto\'g\'ri telefon raqam formati. Masalan: +998901234567', chatId);
        return;
      }

      // Mijozni topish
      const customer = await Customer.findOne({ phone: formattedPhone });

      if (customer) {
        // Telegram chat ID ni yangilash
        customer.telegramChatId = chatId.toString();
        await customer.save();

        const successMessage = `
✅ Muvaffaqiyat!

👤 Siz ${customer.name} sifatida ro'yxatdan o'tdingiz.
📱 Telefon: ${customer.phone}

🔔 Endi barcha cheklar va xabarlar shu yerga yuboriladi.
        `;

        await this.sendMessage(successMessage.trim(), chatId);
      } else {
        const notFoundMessage = `
❌ Kechirasiz, ${formattedPhone} raqami bilan mijoz topilmadi.

📞 Iltimos, do'kon bilan bog'laning yoki to'g'ri telefon raqamni kiriting.
        `;

        await this.sendMessage(notFoundMessage.trim(), chatId);
      }
    } catch (error) {
      console.error('Phone registration error:', error);
      await this.sendMessage('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.', chatId);
    }
  }

  // Yordam xabari
  async sendHelpMessage(chatId) {
    const helpMessage = `
ℹ️ <b>YORDAM</b>

🤖 <b>Mavjud buyruqlar:</b>
• /start - Botni ishga tushirish
• /help - Yordam

📱 <b>Ro'yxatdan o'tish:</b>
Telefon raqamingizni yuboring (masalan: +998901234567)

🧾 <b>Cheklar:</b>
Ro'yxatdan o'tgandan keyin barcha xaridlaringiz avtomatik yuboriladi.

📞 <b>Yordam:</b>
Muammolar bo'lsa do'kon bilan bog'laning.
    `;

    await this.sendMessage(helpMessage.trim(), chatId);
  }

  // POS Bot uchun /start komandasi
  async handlePOSStartCommand(chatId, user) {
    const welcomeMessage = `
👋 Assalomu alaykum, ${user.first_name}!

🏪 Sardor Furnitura do'koniga xush kelibsiz!

📱 Cheklar va xabarlarni olish uchun telefon raqamingizni yuboring yoki pastdagi tugmani bosing:
    `;

    const keyboard = {
      keyboard: [
        [{
          text: "📱 Telefon raqamni yuborish",
          request_contact: true
        }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };

    await this.sendPOSMessage(welcomeMessage.trim(), chatId, keyboard);
  }

  // POS Bot uchun telefon raqam ro'yxatdan o'tkazish
  async handlePOSPhoneRegistration(chatId, phone, user) {
    try {
      // Telefon raqamni formatlash
      let formattedPhone = phone.replace(/\D/g, ''); // Faqat raqamlar
      if (formattedPhone.startsWith('998')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.length === 9) {
        formattedPhone = '+998' + formattedPhone;
      } else {
        await this.sendPOSMessage('❌ Noto\'g\'ri telefon raqam formati. Masalan: +998901234567', chatId);
        return;
      }

      // Mijozni topish
      const customer = await Customer.findOne({ phone: formattedPhone });

      if (customer) {
        // Telegram chat ID ni yangilash
        customer.telegramChatId = chatId.toString();
        await customer.save();

        const successMessage = `
✅ Muvaffaqiyat!

👤 Siz ${customer.name} sifatida ro'yxatdan o'tdingiz.
📱 Telefon: ${customer.phone}

🔔 Endi barcha cheklar va xabarlar shu yerga yuboriladi.
        `;

        await this.sendPOSMessage(successMessage.trim(), chatId);
      } else {
        const notFoundMessage = `
❌ Kechirasiz, ${formattedPhone} raqami bilan mijoz topilmadi.

📞 Iltimos, do'kon bilan bog'laning yoki to'g'ri telefon raqamni kiriting.
        `;

        await this.sendPOSMessage(notFoundMessage.trim(), chatId);
      }
    } catch (error) {
      console.error('POS Phone registration error:', error);
      await this.sendPOSMessage('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.', chatId);
    }
  }

  // POS Bot uchun yordam xabari
  async sendPOSHelpMessage(chatId) {
    const helpMessage = `
ℹ️ <b>YORDAM</b>

🤖 <b>Mavjud buyruqlar:</b>
• /start - Botni ishga tushirish
• /help - Yordam

📱 <b>Ro'yxatdan o'tish:</b>
Telefon raqamingizni yuboring yoki "Telefon raqamni yuborish" tugmasini bosing

🧾 <b>Cheklar:</b>
Ro'yxatdan o'tgandan keyin barcha xaridlaringiz avtomatik yuboriladi.

📞 <b>Yordam:</b>
Muammolar bo'lsa do'kon bilan bog'laning.
    `;

    await this.sendPOSMessage(helpMessage.trim(), chatId);
  }

  // POS Bot uchun xabar yuborish
  async sendPOSMessage(message, chatId, keyboard = null) {
    if (!this.posBotToken) {
      console.log('POS Telegram bot token not configured');
      return;
    }

    if (!chatId) {
      console.log('POS Telegram chat ID not provided');
      return;
    }

    try {
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      };

      if (keyboard) {
        payload.reply_markup = keyboard;
      }

      const response = await axios.post(`${this.posBaseUrl}/sendMessage`, payload);
      return response.data;
    } catch (error) {
      console.error('POS Telegram send message error:', error.response?.data || error.message);
    }
  }

  // Mijozga chek yuborish (qarz ma'lumotisiz)
  async sendReceiptToCustomer(receiptData) {
    if (!receiptData.customer || !receiptData.customer.telegramChatId) {
      console.log('Customer does not have Telegram chat ID');
      return;
    }

    const message = `
🧾 <b>XARID CHEKI</b>

📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}
🏪 <b>Do'kon:</b> Sardor Furnitura
👤 <b>Mijoz:</b> ${receiptData.customer.name}

📦 <b>Xarid qilingan mahsulotlar:</b>
${receiptData.items.map(item =>
      `• ${item.name} - ${item.quantity} x ${this.formatNumber(item.price)} = ${this.formatNumber(item.quantity * item.price)} so'm`
    ).join('\n')}

💰 <b>Jami summa:</b> ${this.formatNumber(receiptData.total)} so'm
💳 <b>To'lov turi:</b> ${receiptData.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}

🙏 Xaridingiz uchun rahmat!
    `;

    return this.sendMessage(message.trim(), receiptData.customer.telegramChatId);
  }

  // Mijozga POS Bot orqali chek yuborish
  async sendReceiptToCustomerViaPOSBot(receiptData) {
    if (!receiptData.customer || !receiptData.customer.telegramChatId) {
      console.log('Customer does not have Telegram chat ID');
      return false;
    }

    const sellerName = receiptData.sellerName || 'Xodim';

    const message = `
╔═══════════════════════╗
║   🧾 <b>XARID CHEKI</b>   ║
╚═══════════════════════╝

📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ', { 
  day: '2-digit', 
  month: '2-digit', 
  year: 'numeric',
  hour: '2-digit', 
  minute: '2-digit' 
})}
🏪 <b>Do'kon:</b> Sardor Furnitura
👤 <b>Mijoz:</b> ${receiptData.customer.name}
👨‍💼 <b>Sotuvchi:</b> ${sellerName}
🧾 <b>Chek №:</b> <code>${receiptData.receiptNumber || `CHK-${Date.now()}`}</code>

━━━━━━━━━━━━━━━━━━━━━
📦 <b>Sotilgan mahsulotlar:</b>
━━━━━━━━━━━━━━━━━━━━━

${receiptData.items.map((item, index) =>
      `${index + 1}. <b>${item.name}</b>
   ├ Miqdor: ${item.quantity} dona
   ├ Narx: ${this.formatNumber(item.price)} so'm
   └ Jami: ${this.formatNumber(item.quantity * item.price)} so'm`
    ).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━
💰 <b>Umumiy summa:</b> ${this.formatNumber(receiptData.total)} so'm
💳 <b>To'lov usuli:</b> ${receiptData.paymentMethod === 'cash' ? 'Naqd pul 💵' : receiptData.paymentMethod === 'card' ? 'Plastik karta 💳' : 'Click 📱'}
${receiptData.paidAmount ? `💵 <b>To'langan:</b> ${this.formatNumber(receiptData.paidAmount)} so'm` : ''}
${receiptData.remainingAmount && receiptData.remainingAmount > 0 ? `💸 <b>Qoldiq:</b> ${this.formatNumber(receiptData.remainingAmount)} so'm` : ''}
━━━━━━━━━━━━━━━━━━━━━

🙏 <b>Xaridingiz uchun rahmat!</b>
📞 <b>Aloqa:</b> Sardor Furnitura
    `;

    return this.sendPOSMessage(message.trim(), receiptData.customer.telegramChatId);
  }

  // Qarz to'lovi haqida mijozga xabar (o'chirildi - faqat admin uchun)
  async sendDebtPaymentToCustomer(paymentData) {
    // Mijozlarga qarz ma'lumotlari yuborilmaydi
    console.log('Debt payment notification to customer disabled - only admin receives debt info');
    return;
  }

  // Xabar yuborish
  async sendMessage(message, chatId = null) {
    if (!this.botToken) {
      console.log('Telegram bot token not configured');
      return;
    }

    const targetChatId = chatId || this.chatId;
    if (!targetChatId) {
      console.log('Telegram chat ID not configured');
      return;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML'
      });
      return response.data;
    } catch (error) {
      console.error('Telegram send message error:', error.response?.data || error.message);
    }
  }

  // Qarzlar uchun alohida xabar yuborish
  async sendDebtMessage(message, chatId = null) {
    if (!this.debtBotToken) {
      console.log('Telegram debt bot token not configured');
      return;
    }

    const targetChatId = chatId || this.debtChatId;
    if (!targetChatId) {
      console.log('Telegram debt chat ID not configured');
      return;
    }

    try {
      const response = await axios.post(`${this.debtBaseUrl}/sendMessage`, {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML'
      });
      return response.data;
    } catch (error) {
      console.error('Telegram debt bot send message error:', error.response?.data || error.message);
    }
  }

  // Hamkorlar uchun alohida xabar yuborish
  async sendPartnerMessage(message, chatId = null) {
    if (!this.partnerBotToken) {
      console.log('Telegram partner bot token not configured');
      return null;
    }

    const targetChatId = chatId || this.partnerChatId;
    if (!targetChatId) {
      console.log('Telegram partner chat ID not configured');
      return null;
    }

    try {
      const response = await axios.post(`${this.partnerBaseUrl}/sendMessage`, {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML'
      });
      return response.data;
    } catch (error) {
      console.error('Telegram partner bot send message error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Sotув cheki yuborish
  async sendSaleReceipt(saleData) {
    const message = `
🧾 <b>YANGI SOTУВ</b>

💰 <b>Jami summa:</b> ${this.formatNumber(saleData.total)} so'm
💳 <b>To'lov turi:</b> ${saleData.paymentMethod === 'cash' ? 'Naqd' : 'Plastik'}
👤 <b>Kassir:</b> ${saleData.cashierName}
📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

📦 <b>Mahsulotlar:</b>
${saleData.items.map(item =>
      `• ${item.name} - ${item.quantity} x ${this.formatNumber(item.price)} = ${this.formatNumber(item.quantity * item.price)} so'm`
    ).join('\n')}

${saleData.customer ? `👤 <b>Mijoz:</b> ${saleData.customer.name} (${saleData.customer.phone})` : ''}
${saleData.discount > 0 ? `🎯 <b>Chegirma:</b> ${this.formatNumber(saleData.discount)} so'm` : ''}
    `;

    return this.sendMessage(message.trim());
  }

  // Qarz qo'shilganda xabar
  async sendDebtNotification(debtData) {
    const isAddedToExisting = debtData.isAddedToExisting;
    const addedAmount = debtData.amount;
    const totalAmount = debtData.totalAmount || debtData.amount;

    const message = `
💳 <b>${isAddedToExisting ? 'QARZGA QO\'SHILDI' : 'YANGI QARZ QO\'SHILDI'}</b>

👤 <b>Mijoz:</b> ${debtData.customerName}
📞 <b>Telefon:</b> ${debtData.customerPhone}
${isAddedToExisting ?
        `💰 <b>Qo'shilgan summa:</b> ${this.formatNumber(addedAmount)} so'm
💳 <b>Jami qarz:</b> ${this.formatNumber(totalAmount)} so'm` :
        `💰 <b>Qarz summasi:</b> ${this.formatNumber(addedAmount)} so'm`
      }
${debtData.paidAmount > 0 ? `💵 <b>To'langan:</b> ${this.formatNumber(debtData.paidAmount)} so'm` : ''}
${debtData.remainingDebt ? `💸 <b>Qarz qoldi:</b> ${this.formatNumber(debtData.remainingDebt)} so'm` : ''}
📅 <b>Muddat:</b> ${new Date(debtData.dueDate).toLocaleDateString('uz-UZ')}
📝 <b>Sabab:</b> ${debtData.description || 'Xarid qoldig\'i'}
${debtData.collateral ? `🔒 <b>Garov:</b> ${debtData.collateral}` : ''}

${debtData.items && debtData.items.length > 0 ? `📦 <b>Mahsulotlar:</b>
${debtData.items.map(item =>
        `• ${item.name} - ${item.quantity} x ${this.formatNumber(item.price)} = ${this.formatNumber(item.quantity * item.price)} so'm`
      ).join('\n')}` : ''}

${isAddedToExisting ?
        '🔄 <b>Eslatma:</b> Bu summa mavjud qarzga qo\'shildi.' :
        '⚠️ <b>Eslatma:</b> Bu qarz avtomatik yaratildi va tasdiqlangan.'
      }
    `;

    return this.sendDebtMessage(message.trim());
  }

  // Qarz tasdiqlanganda xabar
  async sendDebtApprovalNotification(debtData) {
    const message = `
✅ <b>QARZ TASDIQLANDI</b>

👤 <b>Mijoz:</b> ${debtData.customerName}
💰 <b>Summa:</b> ${this.formatNumber(debtData.amount)} so'm
📅 <b>Muddat:</b> ${new Date(debtData.dueDate).toLocaleDateString('uz-UZ')}

✅ Admin tomonidan tasdiqlandi va mijozning umumiy qarziga qo'shildi.
    `;

    return this.sendDebtMessage(message.trim());
  }

  // Kam qolgan mahsulotlar haqida xabar
  async sendLowStockAlert(products) {
    if (!products || products.length === 0) return;

    const message = `
⚠️ <b>KAM QOLGAN MAHSULOTLAR</b>

📦 Quyidagi mahsulotlar 50 tadan kam qoldi:

${products.map(product =>
      `• <b>${product.name}</b> - ${product.quantity} ta qoldi`
    ).join('\n')}

🔄 Mahsulotlarni to'ldirish kerak!
    `;

    return this.sendMessage(message.trim());
  }

  // To'lov qilinganida xabar
  async sendPaymentNotification(paymentData) {
    const message = `
💰 <b>TO'LOV QILINDI</b>

👤 <b>Mijoz:</b> ${paymentData.customerName}
💳 <b>To'lov summasi:</b> ${this.formatNumber(paymentData.amount)} so'm
💰 <b>Qoldiq qarz:</b> ${this.formatNumber(paymentData.remainingDebt)} so'm
📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

${paymentData.remainingDebt === 0 ? '✅ Qarz to\'liq to\'landi!' : ''}
    `;

    return this.sendDebtMessage(message.trim());
  }

  // Raqamni formatlash
  formatNumber(num) {
    return new Intl.NumberFormat('uz-UZ').format(num);
  }

  async sendPresenceNotification(user, type) {
    const emoji = type === 'arrived' ? '🟢' : '🔴';
    const verb = type === 'arrived' ? 'Ishga KELDI' : 'Ishdan KETDI';
    const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'cashier' ? 'Kassir' : 'Yordamchi';
    const message = `
${emoji} <b>${verb}</b>

👤 <b>Xodim:</b> ${user.name}
🎭 <b>Rol:</b> ${roleLabel}
📞 <b>Telefon:</b> ${user.phone || '-'}
📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
    `;
    return this.sendMessage(message.trim());
  }

  // Bot ma'lumotlarini olish
  async getBotInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      return response.data;
    } catch (error) {
      console.error('Get bot info error:', error.response?.data || error.message);
      return null;
    }
  }

  // Webhook o'rnatish
  async setWebhook(webhookUrl) {
    try {
      const response = await axios.post(`${this.baseUrl}/setWebhook`, {
        url: webhookUrl
      });
      return response.data;
    } catch (error) {
      console.error('Set webhook error:', error.response?.data || error.message);
      return null;
    }
  }

  // Webhook ma'lumotlarini olish
  async getWebhookInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/getWebhookInfo`);
      return response.data;
    } catch (error) {
      console.error('Get webhook info error:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = new TelegramService();
