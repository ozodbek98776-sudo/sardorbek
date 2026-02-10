import React, { useState, useEffect } from 'react';
import { X, DollarSign, FileText, Calendar, Zap, Droplet, Utensils, Truck, Package } from 'lucide-react';
import { formatInputNumber, parseNumber } from '../../utils/format';

interface Expense {
  _id?: string;
  category: string;
  amount: number;
  note?: string;
  date: string;
  type?: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, '_id'>) => Promise<void>;
  editingExpense?: Expense | null;
}

const categories = [
  { 
    value: 'komunal', 
    label: 'Komunal', 
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    types: [
      { value: 'elektr', label: 'Elektr' },
      { value: 'gaz', label: 'Gaz' },
      { value: 'suv', label: 'Suv' },
      { value: 'internet', label: 'Internet' },
      { value: 'telefon', label: 'Telefon' },
      { value: 'chiqindi', label: 'Chiqindi' },
      { value: 'boshqa', label: 'Boshqa' }
    ]
  },
  { 
    value: 'soliqlar', 
    label: 'Soliqlar', 
    icon: FileText,
    color: 'from-red-500 to-red-600',
    types: [
      { value: 'ndpi', label: 'NDPI' },
      { value: 'qqs', label: 'QQS' },
      { value: 'mulk_solig', label: 'Mulk solig\'i' },
      { value: 'transport_solig', label: 'Transport solig\'i' },
      { value: 'boshqa', label: 'Boshqa' }
    ]
  },
  { 
    value: 'ovqatlanish', 
    label: 'Ovqatlanish', 
    icon: Utensils,
    color: 'from-green-500 to-green-600'
  },
  { 
    value: 'dostavka', 
    label: 'Dostavka', 
    icon: Truck,
    color: 'from-yellow-500 to-yellow-600'
  },
  { 
    value: 'tovar_xarid', 
    label: 'Tovar xaridi', 
    icon: Package,
    color: 'from-purple-500 to-purple-600'
  }
];

export function ExpenseModal({ isOpen, onClose, onSave, editingExpense }: ExpenseModalProps) {
  const [step, setStep] = useState<'category' | 'form'>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Tahrirlash uchun ma'lumotlarni yuklash
  useEffect(() => {
    if (editingExpense) {
      setSelectedCategory(editingExpense.category);
      setAmount(editingExpense.amount.toString());
      setNote(editingExpense.note || '');
      setDate(editingExpense.date.split('T')[0]);
      setType(editingExpense.type || '');
      setStep('form');
    } else {
      resetForm();
    }
  }, [editingExpense, isOpen]);

  const resetForm = () => {
    setStep('category');
    setSelectedCategory('');
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('');
    setError('');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('form');
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatInputNumber(value);
    setAmount(formatted);
  };

  const validateForm = (): boolean => {
    setError('');

    if (!selectedCategory) {
      setError('Kategoriya tanlanishi shart');
      return false;
    }

    const numAmount = parseFloat(parseNumber(amount));
    if (!numAmount || numAmount <= 0) {
      setError('Summa musbat bo\'lishi kerak');
      return false;
    }

    if (numAmount > 1000000000) {
      setError('Summa juda katta (maksimal 1 milliard)');
      return false;
    }

    // Soliq uchun type majburiy
    if (selectedCategory === 'soliqlar' && !type) {
      setError('Soliq turi tanlanishi shart');
      return false;
    }

    // Komunal uchun type majburiy
    if (selectedCategory === 'komunal' && !type) {
      setError('Komunal turi tanlanishi shart');
      return false;
    }

    // Kelajak sanaga ruxsat bermaslik
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
      setError('Kelajak sanaga xarajat kiritish mumkin emas');
      return false;
    }

    if (note && note.length > 300) {
      setError('Izoh 300 belgidan oshmasligi kerak');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave({
        category: selectedCategory,
        amount: parseFloat(parseNumber(amount)),
        note: note.trim() || undefined,
        date,
        type: type || undefined
      });

      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedCategoryData = categories.find(c => c.value === selectedCategory);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      data-modal="true"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
        onClick={handleClose}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Modal */}
      <div 
        className="bg-white w-full sm:w-auto sm:min-w-[500px] sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          pointerEvents: 'auto',
          paddingBottom: 'max(0rem, env(safe-area-inset-bottom))'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between p-4 sm:p-6 gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {editingExpense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}
            </h3>
            {step === 'form' && selectedCategoryData && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedCategoryData.label}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll">
          {step === 'category' && !editingExpense ? (
            /* Kategoriya tanlash */
            <div className="p-4 sm:p-6">
              <p className="text-sm text-gray-600 mb-4">
                Xarajat kategoriyasini tanlang:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.value}
                      onClick={() => handleCategorySelect(category.value)}
                      className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
                            {category.label}
                          </h4>
                          {category.types && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {category.types.length} ta tur
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Forma */
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Type (agar kerak bo'lsa) */}
              {selectedCategoryData?.types && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedCategoryData.label} turi *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Tanlang...</option>
                    {selectedCategoryData.types.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Summa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Summa *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 pr-16 text-lg font-semibold border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    so'm
                  </span>
                </div>
              </div>

              {/* Sana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Sana *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Izoh (ixtiyoriy)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Qo'shimcha ma'lumot..."
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {note.length}/300 belgi
                </p>
              </div>

              {/* Xatolik */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex gap-3 p-4 sm:p-6">
            {!editingExpense && (
              <button
                type="button"
                onClick={() => setStep('category')}
                disabled={loading}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Orqaga
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
