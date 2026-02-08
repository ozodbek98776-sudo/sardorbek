import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { MessageCircle, Send, CheckCircle2, Copy, RefreshCw, Link, Users } from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';

export default function TelegramSettings() {
  const { showAlert, AlertComponent } = useAlert();
  const [settings, setSettings] = useState({
    botToken: '',
    chatId: '',
    isEnabled: false
  });
  const [botInfo, setBotInfo] = useState<any>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [testMessage, setTestMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);

  useEffect(() => {
    fetchSettings();
    // Webhook URL ni avtomatik to'ldirish
    const baseUrl = window.location.origin.replace('5175', '3002'); // Client portdan server portga o'tish
    setWebhookUrl(`${baseUrl}/api/telegram/webhook`);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/telegram/settings');
      setSettings(res.data);
      if (res.data.botToken) {
        fetchBotInfo();
        fetchWebhookInfo();
      }
    } catch (err) {
      console.error('Error fetching telegram settings:', err);
    }
  };

  const fetchBotInfo = async () => {
    try {
      const res = await api.get('/telegram/bot-info');
      setBotInfo(res.data);
    } catch (err) {
      console.error('Error fetching bot info:', err);
    }
  };

  const fetchWebhookInfo = async () => {
    try {
      const res = await api.get('/telegram/webhook-info');
      setWebhookInfo(res.data);
    } catch (err) {
      console.error('Error fetching webhook info:', err);
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookUrl.trim()) {
      showAlert('Webhook URL ni kiriting', 'Xatolik', 'warning');
      return;
    }

    setSettingWebhook(true);
    try {
      await api.post('/telegram/set-webhook', { webhookUrl });
      showAlert('Webhook muvaffaqiyatli o\'rnatildi', 'Muvaffaqiyat', 'success');
      fetchWebhookInfo();
    } catch (err) {
      showAlert('Webhook o\'rnatishda xatolik', 'Xatolik', 'danger');
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/telegram/settings', settings);
      showAlert('Sozlamalar saqlandi', 'Muvaffaqiyat', 'success');
      if (settings.botToken) {
        fetchBotInfo();
      }
    } catch (err) {
      showAlert('Sozlamalarni saqlashda xatolik', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testMessage.trim()) {
      showAlert('Test xabarini kiriting', 'Xatolik', 'warning');
      return;
    }

    setTesting(true);
    try {
      await api.post('/telegram/test', { message: testMessage });
      showAlert('Test xabari yuborildi', 'Muvaffaqiyat', 'success');
      setTestMessage('');
    } catch (err) {
      showAlert('Xabar yuborishda xatolik', 'Xatolik', 'danger');
    } finally {
      setTesting(false);
    }
  };

  const copyBotUsername = () => {
    if (botInfo?.username) {
      navigator.clipboard.writeText(`@${botInfo.username}`);
      showAlert('Bot username nusxalandi', 'Muvaffaqiyat', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 w-full h-full">
      {AlertComponent}
      <Header title="Telegram Sozlamalari" />

      <div className="p-1 sm:p-2 space-y-2 sm:space-y-3 w-full">
        {/* Bot Ma'lumotlari */}
        {botInfo && (
          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-surface-900">Bot Ma'lumotlari</h3>
                <p className="text-sm text-surface-500">Telegram bot holati</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-surface-50 p-3 rounded-lg">
                <p className="text-sm text-surface-500 mb-1">Bot nomi</p>
                <p className="font-medium text-surface-900">{botInfo.first_name}</p>
              </div>
              <div className="bg-surface-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-surface-500 mb-1">Username</p>
                    <p className="font-medium text-surface-900">@{botInfo.username}</p>
                  </div>
                  <button
                    onClick={copyBotUsername}
                    className="btn-icon-sm hover:bg-surface-200"
                    title="Nusxalash"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Bot faol</span>
              </div>
            </div>
          </div>
        )}

        {/* Sozlamalar */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-6">Telegram Sozlamalari</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Bot Token
              </label>
              <input
                type="password"
                className="input"
                placeholder="Bot tokenini kiriting"
                value={settings.botToken}
                onChange={e => setSettings({ ...settings, botToken: e.target.value })}
              />
              <p className="text-xs text-surface-500 mt-1">
                @BotFather dan olingan bot token
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Chat ID yoki Kanal Username
              </label>
              <input
                type="text"
                className="input"
                placeholder="@channel_name yoki -100xxxxxxxxx"
                value={settings.chatId}
                onChange={e => setSettings({ ...settings, chatId: e.target.value })}
              />
              <p className="text-xs text-surface-500 mt-1">
                Xabarlar yuboriladigan kanal yoki guruh
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="telegram-enabled"
                className="w-4 h-4 text-brand-600 border-surface-300 rounded focus:ring-brand-500"
                checked={settings.isEnabled}
                onChange={e => setSettings({ ...settings, isEnabled: e.target.checked })}
              />
              <label htmlFor="telegram-enabled" className="text-sm font-medium text-surface-700">
                Telegram xabarlarini yoqish
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  'Saqlash'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Sozlamalari */}
        {botInfo && (
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Link className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Webhook Sozlamalari</h3>
                <p className="text-surface-500">Mijozlarga chek yuborish uchun</p>
              </div>
            </div>

            {webhookInfo && (
              <div className="mb-4 p-3 bg-surface-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-surface-700">Joriy webhook:</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    webhookInfo.url ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {webhookInfo.url ? 'Faol' : 'O\'rnatilmagan'}
                  </span>
                </div>
                {webhookInfo.url && (
                  <p className="text-xs text-surface-500 break-all">{webhookInfo.url}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://your-domain.com/api/telegram/webhook"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-surface-500 mt-1">
                  Server webhook URL manzili
                </p>
              </div>

              <button
                onClick={handleSetWebhook}
                disabled={settingWebhook || !webhookUrl.trim()}
                className="btn-secondary"
              >
                {settingWebhook ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    O'rnatilmoqda...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Webhook O'rnatish
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mijozlar uchun yo'riqnoma */}
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-surface-900">Mijozlar uchun yo'riqnoma</h3>
              <p className="text-surface-500">Cheklar olish uchun</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-surface-600">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Mijozlar qanday qilib chek oladi:</h4>
              <ol className="list-decimal list-inside space-y-2 ml-4 text-blue-800">
                <li>Telegram da <strong>@{botInfo?.username || 'your_bot'}</strong> botini topish</li>
                <li><strong>/start</strong> buyrug'ini yuborish</li>
                <li>Telefon raqamini yuborish (masalan: +998901234567)</li>
                <li>Ro'yxatdan o'tgandan keyin barcha cheklar avtomatik keladi</li>
              </ol>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-900 mb-2">Muhim:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4 text-amber-800">
                <li>Mijoz avval botga /start berishi kerak</li>
                <li>Telefon raqam bazada mavjud bo'lishi kerak</li>
                <li>Webhook to'g'ri sozlangan bo'lishi kerak</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-6">Test Xabar</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Test xabari
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Test xabarini kiriting..."
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
              />
            </div>

            <button
              onClick={handleTest}
              disabled={testing || !settings.botToken || !settings.chatId}
              className="btn-secondary"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Test Xabar Yuborish
                </>
              )}
            </button>
          </div>
        </div>

        {/* Yo'riqnoma */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Sozlash Yo'riqnomasi</h3>
          
          <div className="space-y-4 text-sm text-surface-600">
            <div>
              <h4 className="font-medium text-surface-900 mb-2">1. Bot yaratish:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Telegram da @BotFather ga murojaat qiling</li>
                <li>/newbot buyrug'ini yuboring</li>
                <li>Bot nomini va username ni kiriting</li>
                <li>Olingan tokenni yuqoridagi maydonga kiriting</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-surface-900 mb-2">2. Kanal/Guruh sozlash:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Telegram da kanal yoki guruh yarating</li>
                <li>Botni kanalga admin qilib qo'shing</li>
                <li>Kanal username ini (@channel_name) yoki Chat ID ni kiriting</li>
                <li>Barcha xodimlar kanalga obuna bo'lsin</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-surface-900 mb-2">3. Mijozlarga chek yuborish:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Webhook URL ni to'g'ri o'rnating</li>
                <li>Mijozlar botga /start berib ro'yxatdan o'tsin</li>
                <li>Kassa panelida mijoz tanlanganda chek avtomatik yuboriladi</li>
                <li>Faqat ro'yxatdan o'tgan mijozlarga chek boradi</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-surface-900 mb-2">4. Xabar turlari:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Xarid cheklari (mijozlarga shaxsiy)</li>
                <li>Yangi qarz qo'shilganda (admin kanaliga)</li>
                <li>Qarz tasdiqlanganda (admin kanaliga)</li>
                <li>To'lov qilinganida (admin kanaliga)</li>
                <li>Kam qolgan mahsulotlar haqida (admin kanaliga)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
