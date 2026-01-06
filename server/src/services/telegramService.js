const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.baseURL = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId, message, options = {}) {
    if (!this.botToken) {
      console.log('Telegram bot token not configured');
      return null;
    }

    try {
      const response = await axios.post(`${this.baseURL}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Telegram send message error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendPurchaseNotification(customer, items, total, paymentMethod) {
    if (!customer.telegramChatId) {
      console.log(`Customer ${customer.name} doesn't have telegram chat ID`);
      return null;
    }

    const itemsList = items.map(item =>
      `• ${item.name} - ${item.quantity} ta x ${this.formatNumber(item.price)} = ${this.formatNumber(item.price * item.quantity)} so'm`
    ).join('\n');

    const message = `
🛒 <b>Yangi xarid!</b>

👤 <b>Mijoz:</b> ${customer.name}
📞 <b>Telefon:</b> ${customer.phone}

📦 <b>Mahsulotlar:</b>
${itemsList}

💰 <b>Jami summa:</b> ${this.formatNumber(total)} so'm
💳 <b>To'lov usuli:</b> ${paymentMethod === 'cash' ? 'Naqd pul' : 'Plastik karta'}
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

✅ Xaridingiz uchun rahmat!
    `.trim();

    return await this.sendMessage(customer.telegramChatId, message);
  }

  async sendDebtNotification(customer, debtAmount, dueDate) {
    if (!customer.telegramChatId) {
      console.log(`Customer ${customer.name} doesn't have telegram chat ID`);
      return null;
    }

    const message = `
💳 <b>Qarz eslatmasi</b>

👤 <b>Mijoz:</b> ${customer.name}
💰 <b>Qarz miqdori:</b> ${this.formatNumber(debtAmount)} so'm
📅 <b>To'lov muddati:</b> ${new Date(dueDate).toLocaleDateString('uz-UZ')}

⚠️ Iltimos, belgilangan muddatda to'lovni amalga oshiring.

📞 Savollar bo'lsa: +998 XX XXX XX XX
    `.trim();

    return await this.sendMessage(customer.telegramChatId, message);
  }

  async sendPaymentReminder(customer, debtAmount, overdueDays) {
    if (!customer.telegramChatId) {
      console.log(`Customer ${customer.name} doesn't have telegram chat ID`);
      return null;
    }

    const message = `
🚨 <b>Qarz to'lovi eslatmasi</b>

👤 <b>Mijoz:</b> ${customer.name}
💰 <b>Qarz miqdori:</b> ${this.formatNumber(debtAmount)} so'm
⏰ <b>Muddati:</b> ${overdueDays} kun o'tgan

❗️ Qarzingiz muddati o'tgan. Iltimos, tezroq to'lovni amalga oshiring.

📞 Bog'lanish: +998 XX XXX XX XX
    `.trim();

    return await this.sendMessage(customer.telegramChatId, message);
  }

  formatNumber(num) {
    return new Intl.NumberFormat('uz-UZ').format(num);
  }
}

module.exports = new TelegramService();