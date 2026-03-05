// Daily product report scheduler - sends all products to POS Telegram bot at 22:00

function scheduleProductReport() {
  const now = new Date();
  let scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    22, 0, 0
  );

  // Agar 22:00 o'tgan bo'lsa, ertangi kunga o'tkazish
  if (now >= scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const timeUntilReport = scheduledTime.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      const posBot = global.posBot;
      if (posBot && posBot.bot) {
        await posBot.sendProductReport();
      } else {
        console.log('⚠️ POS Bot mavjud emas, hisobot yuborilmadi');
      }
    } catch (error) {
      console.error('❌ Mahsulot hisoboti schedulerda xatolik:', error);
    }

    // Keyingi kun uchun qayta rejalashtirish
    scheduleProductReport();
  }, timeUntilReport);

  console.log(`📊 Keyingi mahsulot hisoboti: ${scheduledTime.toLocaleString('uz-UZ')}`);
}

module.exports = { scheduleProductReport };
