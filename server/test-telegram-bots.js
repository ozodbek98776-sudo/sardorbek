// Telegram botlarni test qilish
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

async function testBot(name, token, chatId) {
  console.log(`\n🔍 ${name} ni test qilish...`);
  console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'YO\'Q'}`);
  console.log(`Chat ID: ${chatId || 'YO\'Q'}`);
  
  if (!token) {
    console.log(`❌ ${name} token topilmadi`);
    return false;
  }
  
  try {
    const bot = new TelegramBot(token, { polling: false });
    
    // Bot ma'lumotlarini olish
    const botInfo = await bot.getMe();
    console.log(`✅ Bot ishlayapti: @${botInfo.username}`);
    console.log(`   ID: ${botInfo.id}`);
    console.log(`   Ism: ${botInfo.first_name}`);
    
    // Test xabar yuborish (agar chat ID bo'lsa)
    if (chatId) {
      try {
        await bot.sendMessage(chatId, `✅ ${name} test xabari - ${new Date().toLocaleString('uz-UZ')}`);
        console.log(`✅ Test xabar yuborildi chat ID: ${chatId}`);
      } catch (sendError) {
        console.log(`⚠️  Xabar yuborishda xatolik: ${sendError.message}`);
        console.log(`   Chat ID to'g'ri emasmi yoki bot bilan /start qilinmaganmi?`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Xatolik: ${error.message}`);
    return false;
  }
}

async function testAllBots() {
  console.log('🤖 TELEGRAM BOTLAR TESTI\n');
  console.log('='.repeat(50));
  
  const results = {
    main: await testBot(
      'Asosiy Bot (Mijozlar uchun)',
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    ),
    debt: await testBot(
      'Qarz Bot',
      process.env.TELEGRAM_DEBT_BOT_TOKEN,
      process.env.TELEGRAM_DEBT_CHAT_ID
    ),
    pos: await testBot(
      'POS Bot (Cheklar uchun)',
      process.env.POS_TELEGRAM_BOT_TOKEN,
      process.env.POS_ADMIN_CHAT_ID
    )
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 NATIJALAR:');
  console.log(`Asosiy Bot: ${results.main ? '✅ Ishlayapti' : '❌ Ishlamayapti'}`);
  console.log(`Qarz Bot: ${results.debt ? '✅ Ishlayapti' : '❌ Ishlamayapti'}`);
  console.log(`POS Bot: ${results.pos ? '✅ Ishlayapti' : '❌ Ishlamayapti'}`);
  
  const allWorking = results.main && results.debt && results.pos;
  console.log(`\n${allWorking ? '✅ BARCHA BOTLAR ISHLAYAPTI!' : '⚠️  BA\'ZI BOTLAR ISHLAMAYAPTI'}`);
  
  if (!allWorking) {
    console.log('\n💡 YECHIMLAR:');
    console.log('1. Bot tokenlarini tekshiring (.env fayl)');
    console.log('2. Chat ID larni tekshiring');
    console.log('3. Bot bilan /start buyrug\'ini yuboring');
    console.log('4. Bot admin huquqlariga ega ekanligini tekshiring');
  }
  
  process.exit(allWorking ? 0 : 1);
}

testAllBots();
