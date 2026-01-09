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

  // Mijozga chek yuborish
  async sendReceiptToCustomer(receiptData) {
    if (!receiptData.customer || !receiptData.customer.telegramChatId) {
      console.log('Customer does not have Telegram chat ID');
      return;
    }

    // Mijozning qarzini tekshirish
    const debtInfo = receiptData.customer.debt > 0 ?
      `\n💳 <b>Qarz holati:</b> ${this.formatNumber(receiptData.customer.debt)} so'm qarz mavjud` :
      '\n✅ <b>Qarz holati:</b> Qarz yo\'q';

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
💳 <b>To'lov turi:</b> ${receiptData.paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}${debtInfo}

🙏 Xaridingiz uchun rahmat!
    `;

    return this.sendMessage(message.trim(), receiptData.customer.telegramChatId);
  }

  // Qarz to'lovi haqida mijozga xabar
  async sendDebtPaymentToCustomer(paymentData) {
    if (!paymentData.customer || !paymentData.customer.telegramChatId) {
      console.log('Customer does not have Telegram chat ID');
      return;
    }

    const message = `
💰 <b>QARZ TO'LOVI</b>

👤 <b>Mijoz:</b> ${paymentData.customer.name}
💳 <b>To'lov summasi:</b> ${this.formatNumber(paymentData.amount)} so'm
💰 <b>Qoldiq qarz:</b> ${this.formatNumber(paymentData.remainingDebt)} so'm
📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
📝 <b>Sabab:</b> Xarid orqali avtomatik to'lov

${paymentData.remainingDebt === 0 ? '✅ Qarzingiz to\'liq to\'landi!' : ''}

🙏 To'lovingiz uchun rahmat!
    `;

    return this.sendMessage(message.trim(), paymentData.customer.telegramChatId);
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
    const message = `
💳 <b>YANGI QARZ QO'SHILDI</b>

👤 <b>Mijoz:</b> ${debtData.customerName}
📞 <b>Telefon:</b> ${debtData.customerPhone}
💰 <b>Qarz summasi:</b> ${this.formatNumber(debtData.amount)} so'm
${debtData.paidAmount > 0 ? `💵 <b>To'langan:</b> ${this.formatNumber(debtData.paidAmount)} so'm` : ''}
${debtData.remainingDebt ? `💸 <b>Qarz qoldi:</b> ${this.formatNumber(debtData.remainingDebt)} so'm` : ''}
📅 <b>Muddat:</b> ${new Date(debtData.dueDate).toLocaleDateString('uz-UZ')}
${debtData.collateral ? `🔒 <b>Garov:</b> ${debtData.collateral}` : ''}
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
