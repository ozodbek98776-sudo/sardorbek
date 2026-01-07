const axios = require('axios');

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
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
📅 <b>Muddat:</b> ${new Date(debtData.dueDate).toLocaleDateString('uz-UZ')}
📝 <b>Izoh:</b> ${debtData.description || 'Yo\'q'}
${debtData.collateral ? `🔒 <b>Garov:</b> ${debtData.collateral}` : ''}

⏳ <b>Holat:</b> Admin tasdiqlashini kutmoqda
    `;

    return this.sendMessage(message.trim());
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

    return this.sendMessage(message.trim());
  }

  // Kam qolgan mahsulotlar haqida xabar
  async sendLowStockAlert(products) {
    if (!products || products.length === 0) return;

    const message = `
⚠️ <b>KAM QOLGAN MAHSULOTLAR</b>

📦 Quyidagi mahsulotlar 100 tadan kam qoldi:

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

    return this.sendMessage(message.trim());
  }

  // Raqamni formatlash
  formatNumber(num) {
    return new Intl.NumberFormat('uz-UZ').format(num);
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

  // Chat ID ni olish (test uchun)
  async getUpdates() {
    try {
      const response = await axios.get(`${this.baseUrl}/getUpdates`);
      return response.data;
    } catch (error) {
      console.error('Get updates error:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = new TelegramService();