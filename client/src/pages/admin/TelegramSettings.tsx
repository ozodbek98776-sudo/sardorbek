import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { MessageCircle, Send, CheckCircle2, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';

export default function TelegramSettings() {
  const { showAlert, AlertComponent } = useAlert();
  const [settings, setSettings] = useState({
    botToken: '',
    chatId: '',
    isEnabled: false
  });
  const [botInfo, setBotInfo] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/telegram/settings');
      setSettings(res.data);
      if (res.data.botToken) {
        fetchBotInfo();
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
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header title="Telegram Sozlamalari" />

      <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Bot Ma'lumotlari */}
        {botInfo && (
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Bot Ma'lumotlari</h3>
                <p className="text-surface-500">Telegram bot holati</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-50 p-4 rounded-lg">
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

        {/* Test Xabar */}
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
              <h4 className="font-medium text-surface-900 mb-2">3. Xabar turlari:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Yangi qarz qo'shilganda</li>
                <li>Qarz tasdiqlanganda</li>
                <li>To'lov qilinganida</li>
                <li>Kam qolgan mahsulotlar haqida</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}