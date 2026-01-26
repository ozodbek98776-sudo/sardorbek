import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Copy, Trash2, Download, Plus, History, Globe } from 'lucide-react';
import { useAlert } from '../../hooks/useAlert';
import { businessAnswers } from '../../utils/businessAnswers';
import { businessAnswers2 } from '../../utils/businessAnswers2';
import { businessAnswers3 } from '../../utils/businessAnswers3';
import { businessAnswers4 } from '../../utils/businessAnswers4';
import { businessAnswers5 } from '../../utils/businessAnswers5';
import { productUsageTips } from '../../utils/productUsageTips';
import { businessAnswersEnglish } from '../../utils/businessAnswersEnglish';
import { productUsageTipsEnglish } from '../../utils/productUsageTipsEnglish';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const BUSINESS_PROMPTS = [
  { title: 'Sotuvni oshirish', icon: '📈', prompt: 'Mening furnitura biznesimda sotuvni qanday oshirishim mumkin?' },
  { title: 'Qarz boshqaruvi', icon: '💰', prompt: 'Mijozlarning qarzlarini samarali qanday boshqarish kerak?' },
  { title: 'Inventar', icon: '📦', prompt: 'Tovarlar inventarini qanday optimallashtirishim mumkin?' },
  { title: 'Mijoz xizmati', icon: '👥', prompt: 'Mijozlar bilan munosabatlarni qanday yaxshilashim mumkin?' },
];

const BUSINESS_PROMPTS_EN = [
  { title: 'Increase Sales', icon: '📈', prompt: 'How can I increase sales in my furniture business?' },
  { title: 'Debt Management', icon: '💰', prompt: 'How should I manage customer debts effectively?' },
  { title: 'Inventory', icon: '📦', prompt: 'How can I optimize my inventory management?' },
  { title: 'Customer Service', icon: '👥', prompt: 'How can I improve customer relationships?' },
];

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: 'Assalomu alaykum! 👋 Men sizning furnitura biznesingiz uchun AI maslaxatchi. Sotuvni oshirish, qarz boshqaruvi, inventar optimallashtiruvi va boshqa biznes masalalariga maslaxat berishim mumkin. Nima haqida so\'rasmoqchisiz?',
  timestamp: new Date(),
};

const INITIAL_MESSAGE_EN: Message = {
  id: '1',
  role: 'assistant',
  content: 'Hello! 👋 I\'m your AI business advisor for furniture business. I can help with sales growth, debt management, inventory optimization, and other business matters. What would you like to know?',
  timestamp: new Date(),
};

export default function AIAssistant() {
  const { showAlert, AlertComponent } = useAlert();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [language, setLanguage] = useState<'uz' | 'en'>('uz');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Yangi chat session yaratish
  const createNewSession = () => {
    const initialMsg = language === 'uz' ? INITIAL_MESSAGE : INITIAL_MESSAGE_EN;
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: language === 'uz' ? 'Yangi Chat' : 'New Chat',
      messages: [initialMsg],
      createdAt: new Date(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([initialMsg]);
    localStorage.setItem('aiChatSessions', JSON.stringify([newSession, ...chatSessions]));
  };

  // Chat session'ni o'chirish
  const deleteSession = (sessionId: string) => {
    const updated = chatSessions.filter(s => s.id !== sessionId);
    setChatSessions(updated);
    localStorage.setItem('aiChatSessions', JSON.stringify(updated));
    
    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        createNewSession();
      }
    }
    showAlert('Chat o\'chirildi', 'Muvaffaqiyat', 'success');
  };

  // Chat session'ni o'zgartirish
  const switchSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setShowSidebar(false);
    }
  };

  // localStorage'dan chat historiyasini yuklash
  useEffect(() => {
    const saved = localStorage.getItem('aiChatSessions');
    const savedLang = localStorage.getItem('aiLanguage') as 'uz' | 'en' || 'uz';
    setLanguage(savedLang);
    
    if (saved) {
      try {
        const sessions = JSON.parse(saved);
        // Timestamp'larni Date object'ga o'zgartirish
        const parsedSessions = sessions.map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setChatSessions(parsedSessions);
        if (parsedSessions.length > 0) {
          setCurrentSessionId(parsedSessions[0].id);
          setMessages(parsedSessions[0].messages);
        }
      } catch (e) {
        console.error('Error loading chat sessions:', e);
        createNewSession();
      }
    } else {
      // Yangi session yaratish
      createNewSession();
    }
  }, []);

  // Messages o'zgarsa localStorage'ga saqlash
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const updated = chatSessions.map(s => 
        s.id === currentSessionId ? { ...s, messages } : s
      );
      setChatSessions(updated);
      localStorage.setItem('aiChatSessions', JSON.stringify(updated));
    }
  }, [messages]);

  // Tovarlarni yuklash
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=1000');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Tovarlarni qidirish
    const searchProducts = (query: string) => {
      return products.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.code?.toString().includes(query) ||
        p.description?.toLowerCase().includes(query)
      ).slice(0, 5);
    };

    // Agar tovar nomi yoki kodi bo'lsa
    const foundProducts = searchProducts(lowerMessage);
    if (foundProducts.length > 0) {
      let response = language === 'uz' ? `🛍️ **Topilgan Tovarlar:**\n\n` : `🛍️ **Found Products:**\n\n`;
      foundProducts.forEach((product, index) => {
        response += `${index + 1}. **${product.name}** (${language === 'uz' ? 'Kod' : 'Code'}: ${product.code})\n`;
        response += `   💰 ${language === 'uz' ? 'Narx' : 'Price'}: ${product.price?.toLocaleString('uz-UZ')} ${language === 'uz' ? 'so\'m' : 'UZS'}\n`;
        if (product.description) {
          response += `   📝 ${language === 'uz' ? 'Tavsifi' : 'Description'}: ${product.description}\n`;
        }
        if (product.category) {
          response += `   📦 ${language === 'uz' ? 'Kategoriya' : 'Category'}: ${product.category}\n`;
        }
        if (product.stock !== undefined) {
          response += `   📊 ${language === 'uz' ? 'Omborda' : 'In Stock'}: ${product.stock} ${language === 'uz' ? 'ta' : 'pcs'}\n`;
        }
        response += `\n`;
      });
      return response;
    }

    // Mahsulot foydalanish sirrlari
    const tips = language === 'uz' ? productUsageTips : productUsageTipsEnglish;
    for (const [key, tip] of Object.entries(tips)) {
      const keywords = key.split(' ');
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return tip;
      }
    }

    // Combine all knowledge bases
    const allAnswers = language === 'uz' 
      ? { ...businessAnswers, ...businessAnswers2, ...businessAnswers3, ...businessAnswers4, ...businessAnswers5 }
      : businessAnswersEnglish;
    
    // Search for matching keywords in all answers
    for (const [key, answer] of Object.entries(allAnswers)) {
      const keywords = key.split(' ');
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return answer;
      }
    }

    // Default response
    if (language === 'uz') {
      return `🤖 **Sizning Savolingiz:**
"${userMessage}"

Iltimos, quyidagi mavzulardan birini tanlang yoki o'z savolingizni batafsil yozing:

**📈 SOTUVNI OSHIRISH**
- Sotuvni qanday oshirishim mumkin?
- Yangi mijozlarni qanday topish kerak?
- Reklama qayerda samaraliroq?
- Narxni qanday belgilash kerak?
- Chegirma qanday berish kerak?

**💰 MOLIYA VA DAROMAD**
- Daromadni qanday hisoblash kerak?
- Foyda va tushum farqi nimada?
- Xarajatlarni qanday kamaytirish mumkin?
- Qanday soliq to'lash kerak?
- Byudjet qanday tuziladi?

**📦 INVENTAR VA TOVARLAR**
- Tovarlarni qanday boshqarish kerak?
- Ombor qanday tashkil qilish kerak?
- Tovar sifatini qanday tekshirish kerak?
- Tovar rotatsiyasi nima?
- Eski tovarlarni qanday sotish kerak?

**👥 MIJOZ XIZMATI**
- Mijozlarni qanday qo'llab-quvvatlash kerak?
- Shikoyatlarni qanday hal qilish kerak?
- Mijozlar bilan munosabatlarni qanday yaxshilash kerak?
- Loyallik dasturi qanday tuziladi?
- Mijozlarni qanday saqlash kerak?

**💼 BIZNES BOSHQARUVI**
- Xodimlarni qanday tanlash kerak?
- Jamoani qanday motivatsiya qilish mumkin?
- Rahbar qanday bo'lishi kerak?
- Shartnoma qanday tuziladi?
- Biznes rejasi qanday tuziladi?

**🛍️ TOVARLARNI QIDIRISH**
- Tovar nomini yozing (masalan: "stol", "stul", "divan")
- Tovar kodini yozing (masalan: "101", "205")
- Tovar tavsifini yozing

**💡 MASLAHAT:**
Savolingizni aniq va batafsil yozing.`;
    } else {
      return `🤖 **Your Question:**
"${userMessage}"

Please select one of the topics below or ask your question in detail:

**📈 INCREASE SALES**
- How can I increase sales?
- How to find new customers?
- Where is advertising most effective?
- How to set prices?
- How to offer discounts?

**💰 FINANCE AND REVENUE**
- How to calculate revenue?
- What's the difference between profit and revenue?
- How to reduce expenses?
- What taxes should I pay?
- How to create a budget?

**📦 INVENTORY AND PRODUCTS**
- How to manage products?
- How to organize warehouse?
- How to check product quality?
- What is product rotation?
- How to sell old products?

**👥 CUSTOMER SERVICE**
- How to support customers?
- How to resolve complaints?
- How to improve customer relationships?
- How to create loyalty program?
- How to retain customers?

**💼 BUSINESS MANAGEMENT**
- How to hire employees?
- How to motivate team?
- What makes a good manager?
- How to create contracts?
- How to create business plan?

**🛍️ SEARCH PRODUCTS**
- Type product name (e.g.: "table", "chair", "sofa")
- Type product code (e.g.: "101", "205")
- Type product description

**💡 TIP:**
Ask your question clearly and in detail.`;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Session title'ni yangilash (birinchi savol bo'lsa)
    if (messages.length === 1) {
      const updated = chatSessions.map(s => 
        s.id === currentSessionId 
          ? { ...s, title: input.substring(0, 30) + (input.length > 30 ? '...' : '') }
          : s
      );
      setChatSessions(updated);
      localStorage.setItem('aiChatSessions', JSON.stringify(updated));
    }

    // Simulate AI response delay
    setTimeout(() => {
      const assistantResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(input),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantResponse]);
      setLoading(false);
    }, 800);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const toggleLanguage = () => {
    const newLang = language === 'uz' ? 'en' : 'uz';
    setLanguage(newLang);
    localStorage.setItem('aiLanguage', newLang);
    showAlert(
      newLang === 'uz' ? 'Til o\'zbekchaga o\'zgartirildi' : 'Language changed to English',
      'Success',
      'success'
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert('Nusxa olindi', 'Muvaffaqiyat', 'success');
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    const updated = chatSessions.map(s => 
      s.id === currentSessionId ? { ...s, messages: [INITIAL_MESSAGE] } : s
    );
    setChatSessions(updated);
    localStorage.setItem('aiChatSessions', JSON.stringify(updated));
    showAlert('Chat tozalandi', 'Muvaffaqiyat', 'success');
  };

  const downloadChat = () => {
    const chatText = messages.map(m => `${m.role === 'user' ? 'Siz' : 'AI'}: ${m.content}`).join('\n\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(chatText));
    element.setAttribute('download', 'chat_history.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showAlert('Chat yuklab olindi', 'Muvaffaqiyat', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 pb-20 lg:pb-0 flex">
      {AlertComponent}

      {/* Sidebar - Chat History */}
      <div className={`fixed lg:relative left-0 top-0 h-screen w-64 bg-white border-r-2 border-slate-200 flex flex-col transition-transform duration-300 z-50 ${
        showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b-2 border-slate-200">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>{language === 'uz' ? 'Yangi Chat' : 'New Chat'}</span>
          </button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatSessions.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">{language === 'uz' ? 'Hech qanday chat yo\'q' : 'No chats yet'}</p>
          ) : (
            chatSessions.map(session => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all group ${
                  currentSessionId === session.id
                    ? 'bg-gradient-to-r from-brand-100 to-brand-50 border-2 border-brand-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{session.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(session.createdAt).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'en-US')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all"
                    title={language === 'uz' ? 'O\'chirish' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t-2 border-slate-200">
          <button
            onClick={() => setShowSidebar(false)}
            className="w-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all lg:hidden"
          >
            {language === 'uz' ? 'Yopish' : 'Close'}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-50 via-purple-50 to-pink-50 border-b-2 border-brand-200 p-4 lg:p-6 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <History className="w-5 h-5 text-brand-600" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-brand-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
                  {language === 'uz' ? 'AI Maslaxatchi' : 'AI Advisor'}
                </h1>
                <p className="text-sm text-brand-600 font-medium">
                  {language === 'uz' ? '🚀 Biznes uchun aqlli maslahatlar' : '🚀 Smart business advice'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleLanguage}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors text-brand-600"
                title={language === 'uz' ? 'Inglizchaga o\'tish' : 'Switch to Uzbek'}
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                onClick={downloadChat}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors text-brand-600"
                title={language === 'uz' ? 'Chat yuklab olish' : 'Download chat'}
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={clearChat}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                title={language === 'uz' ? 'Chat tozalash' : 'Clear chat'}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl rounded-2xl p-4 lg:p-5 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-br-none'
                  : 'bg-white border-2 border-slate-200 text-slate-900 rounded-bl-none shadow-md'
              }`}>
                <div className="prose prose-sm max-w-none">
                  {message.role === 'assistant' ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content.split('\n').map((line, i) => (
                        <div key={i}>
                          {line.startsWith('**') ? (
                            <strong className="text-slate-900">{line.replace(/\*\*/g, '')}</strong>
                          ) : (
                            line
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString(language === 'uz' ? 'uz-UZ' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                      title={language === 'uz' ? 'Nusxa olish' : 'Copy'}
                    >
                      <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border-2 border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-md">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="px-4 lg:px-6 pb-4 grid grid-cols-2 gap-2">
            {(language === 'uz' ? BUSINESS_PROMPTS : BUSINESS_PROMPTS_EN).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleQuickPrompt(prompt.prompt)}
                className="bg-white border-2 border-slate-200 hover:border-brand-300 hover:shadow-md rounded-xl p-3 text-left transition-all"
              >
                <p className="text-2xl mb-1">{prompt.icon}</p>
                <p className="text-sm font-semibold text-slate-900">{prompt.title}</p>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="bg-gradient-to-r from-brand-50 to-purple-50 border-t-2 border-brand-200 p-4 lg:p-6 shadow-lg">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder={language === 'uz' ? "Savolingizni yozing... (masalan: sotuvni qanday oshirish mumkin?)" : "Type your question... (e.g.: How can I increase sales?)"}
              className="flex-1 px-4 py-3 border-2 border-brand-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center gap-2 hover:shadow-xl"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">{language === 'uz' ? 'Yuborish' : 'Send'}</span>
            </button>
          </div>
          <p className="text-xs text-brand-600 mt-2 font-medium">
            {language === 'uz' 
              ? '💡 AI maslaxatchi - biznes uchun aqlli maslahatlar. O\'z savol ham so\'rashingiz mumkin!' 
              : '💡 AI advisor - smart business advice. You can ask your own questions too!'}
          </p>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
