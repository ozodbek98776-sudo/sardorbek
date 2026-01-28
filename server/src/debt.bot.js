const TelegramBot = require('node-telegram-bot-api');
const Debt = require('./models/Debt');
const Customer = require('./models/Customer');

class DebtTelegramBot {
  constructor() {
    // Bot tokenini environment variable dan olish
    this.token = process.env.TELEGRAM_DEBT_BOT_TOKEN;
    this.adminChatId = process.env.TELEGRAM_DEBT_CHAT_ID;

    if (!this.token) {
      console.error('❌ TELEGRAM_DEBT_BOT_TOKEN topilmadi .env faylida');
      return;
    }

    // Bot yaratish
    this.initBot();
  }

  // Bot ni ishga tushirish
  async initBot() {
    try {
      // Production da polling o'chirilgan - faqat xabar yuborish uchun
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        this.bot = new TelegramBot(this.token, { polling: false });
        console.log('🤖 Qarz Telegram Bot ishga tushdi (faqat xabar yuborish - production)');
      } else {
        this.bot = new TelegramBot(this.token, { 
          polling: {
            interval: 2000,
            autoStart: true,
            params: { timeout: 30 }
          }
        });
        console.log('🤖 Qarz Telegram Bot ishga tushdi (polling - development)');
        this.setupHandlers();
      }
    } catch (error) {
      console.error('❌ Qarz Bot yaratishda xatolik:', error);
    }
  }

  // Event handlerlar
  setupHandlers() {
    this.bot.onText(/\/start/, (msg) => {
      this.handleStartCommand(msg);
    });

    this.bot.on('error', (error) => {
      console.error('❌ Qarz Bot xatosi:', error.message || error);
    });

    this.bot.on('polling_error', (error) => {
      console.error('❌ Qarz Bot polling xatosi:', error.message || '');
    });
  }

  // /start komandasi
  async handleStartCommand(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Foydalanuvchi';

    const welcomeMessage = `
👋 Assalomu alaykum, ${userName}!

💰 **Qarz Boshqaruv Tizimi**

Bu bot orqali qarzlar haqida xabarlar olasiz.

📊 Qarz ma'lumotlari:
- Yangi qarz qo'shilganda
- Qarz to'langanda
- Qarz eslatmalari

✅ Bot tayyor!
    `;

    try {
      await this.bot.sendMessage(chatId, welcomeMessage.trim());
    } catch (error) {
      console.error('❌ Start xabar yuborishda xatolik:', error);
    }
  }

  // Yangi qarz haqida xabar yuborish
  async sendNewDebtNotification(debt, customer) {
    if (!this.bot || !this.adminChatId) return;

    try {
      const message = `
🆕 **YANGI QARZ**

👤 Mijoz: ${customer.name}
📞 Telefon: ${customer.phone}
💰 Summa: ${debt.amount.toLocaleString('uz-UZ')} som
📅 Sana: ${new Date(debt.date).toLocaleDateString('uz-UZ')}
${debt.description ? `📝 Izoh: ${debt.description}` : ''}

💳 Jami qarz: ${customer.totalDebt.toLocaleString('uz-UZ')} som
      `;

      await this.bot.sendMessage(this.adminChatId, message.trim());
      console.log(`✅ Yangi qarz xabari yuborildi: ${customer.name}`);
    } catch (error) {
      console.error('❌ Qarz xabari yuborishda xatolik:', error);
    }
  }

  // Qarz tolovi haqida xabar yuborish
  async sendDebtPaymentNotification(debt, customer, paymentAmount) {
    if (!this.bot || !this.adminChatId) return;

    try {
      const message = `
💵 **QARZ TOLANDI**

👤 Mijoz: ${customer.name}
📞 Telefon: ${customer.phone}
💰 Tolangan: ${paymentAmount.toLocaleString('uz-UZ')} som
📅 Sana: ${new Date().toLocaleDateString('uz-UZ')}

${debt.status === 'paid' ? '✅ Qarz toliq tolandi!' : `⏳ Qolgan qarz: ${debt.remainingAmount.toLocaleString('uz-UZ')} som`}

💳 Jami qarz: ${customer.totalDebt.toLocaleString('uz-UZ')} som
      `;

      await this.bot.sendMessage(this.adminChatId, message.trim());
      console.log(`✅ Qarz tolov xabari yuborildi: ${customer.name}`);
    } catch (error) {
      console.error('❌ Qarz tolov xabari yuborishda xatolik:', error);
    }
  }

  // Qarz eslatmasi yuborish
  async sendDebtReminder(customer) {
    if (!this.bot || !this.adminChatId) return;

    try {
      const message = `
⏰ **QARZ ESLATMASI**

👤 Mijoz: ${customer.name}
📞 Telefon: ${customer.phone}
💰 Jami qarz: ${customer.totalDebt.toLocaleString('uz-UZ')} som

📅 Eslatma sanasi: ${new Date().toLocaleDateString('uz-UZ')}

⚠️ Iltimos, mijozga qongiroq qiling!
      `;

      await this.bot.sendMessage(this.adminChatId, message.trim());
      console.log(`✅ Qarz eslatmasi yuborildi: ${customer.name}`);
    } catch (error) {
      console.error('❌ Qarz eslatmasi yuborishda xatolik:', error);
    }
  }
}

// Export
module.exports = DebtTelegramBot;
