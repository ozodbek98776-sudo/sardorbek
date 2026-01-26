import React, { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, ShoppingCart } from 'lucide-react';
import { CartItem, Customer } from '../types';
import { formatNumber, parseNumber } from '../utils/format';

interface Partner {
  id: string;
  name: string;
  icon: string;
  color: string;
  chatId: string;
}

interface PartnerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem;
  customer?: Customer | null;
  onSave: (partnerId: string, amount: number) => void;
}

const PartnerPaymentModal: React.FC<PartnerPaymentModalProps> = ({
  isOpen,
  onClose,
  item,
  customer,
  onSave
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const itemTotal = item.price * item.cartQuantity;
  const currentBreakdown = item.paymentBreakdown || { cash: 0, click: 0, card: 0, partner: 0 };
  const paidAmount = currentBreakdown.cash + currentBreakdown.click + currentBreakdown.card + (currentBreakdown.partner || 0);
  const remainingAmount = itemTotal - paidAmount;

  // Hamkorlar ro'yxatini yuklash
  useEffect(() => {
    if (isOpen) {
      fetchPartners();
      setAmount(remainingAmount.toString());
    }
  }, [isOpen, remainingAmount]);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners');
      const data = await response.json();
      
      if (data.success) {
        setPartners(data.partners);
      } else {
        setError('Hamkorlar ro\'yxatini yuklashda xatolik');
      }
    } catch (err) {
      console.error('Hamkorlar yuklash xatosi:', err);
      setError('Tarmoq xatoligi');
    }
  };

  const handleAmountChange = (value: string) => {
    const cleaned = parseNumber(value);
    const numValue = cleaned === '' ? 0 : parseFloat(cleaned) || 0;
    
    if (numValue > remainingAmount) {
      setAmount(remainingAmount.toString());
    } else {
      setAmount(cleaned);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPartner) {
      setError('Hamkorni tanlang');
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      setError('To\'lov summasi noto\'g\'ri');
      return;
    }

    if (numAmount > remainingAmount) {
      setError('To\'lov summasi qoldiq summadan ko\'p bo\'lishi mumkin emas');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partners/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner: selectedPartner,
          amount: numAmount,
          item: {
            name: item.name,
            code: item.code,
            price: item.price,
            quantity: item.cartQuantity
          },
          customer: customer ? {
            name: customer.name,
            phone: customer.phone
          } : null,
          receiptNumber: `CHK-${Date.now()}`
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSave(selectedPartner, numAmount);
        onClose();
        
        // Success notification
        const partner = partners.find(p => p.id === selectedPartner);
        alert(`✅ ${partner?.name} orqali ${formatNumber(numAmount)} so'm to'lov muvaffaqiyatli yuborildi!`);
      } else {
        setError(data.message || 'To\'lov yuborishda xatolik');
      }
    } catch (err) {
      console.error('Hamkor to\'lovi xatosi:', err);
      setError('Tarmoq xatoligi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const getPartnerIcon = (partnerId: string) => {
    switch (partnerId) {
      case 'uzum':
        return <ShoppingCart className="w-6 h-6" />;
      case 'ishonch':
        return <CreditCard className="w-6 h-6" />;
      default:
        return <Smartphone className="w-6 h-6" />;
    }
  };

  const getPartnerColor = (partnerId: string) => {
    switch (partnerId) {
      case 'uzum':
        return 'from-purple-500 to-purple-600';
      case 'ishonch':
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  const getPartnerDescription = (partnerId: string) => {
    switch (partnerId) {
      case 'uzum':
        return 'Muddatli to\'lov';
      case 'ishonch':
        return 'Kredit tizimi';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-white w-full sm:w-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between p-4 sm:p-6 gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Hamkor to'lovi</h3>
            <p className="text-sm text-gray-500 mt-1 truncate">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6">
          {/* Tovar ma'lumotlari */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Umumiy summa:</span>
              <span className="font-semibold text-gray-900">{formatNumber(itemTotal)} so'm</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">To'langan:</span>
              <span className="font-semibold text-gray-900">{formatNumber(paidAmount)} so'm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Qoldiq:</span>
              <span className="font-bold text-blue-600">{formatNumber(remainingAmount)} so'm</span>
            </div>
          </div>

          {/* Hamkorlar ro'yxati */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Hamkorni tanlang
            </label>
            <div className="grid grid-cols-1 gap-3">
              {partners.map((partner) => (
                <button
                  key={partner.id}
                  onClick={() => setSelectedPartner(partner.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedPartner === partner.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getPartnerColor(partner.id)} flex items-center justify-center text-white`}>
                      {getPartnerIcon(partner.id)}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                      <p className="text-sm text-gray-500">
                        {getPartnerDescription(partner.id)}
                      </p>
                    </div>
                    {selectedPartner === partner.id && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Summa kiritish */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To'lov summasi
            </label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                so'm
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <button
                onClick={() => setAmount((remainingAmount / 2).toString())}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Yarmini
              </button>
              <button
                onClick={() => setAmount(remainingAmount.toString())}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Hammasini
              </button>
            </div>
          </div>

          {/* Xatolik xabari */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex gap-3 p-4 sm:p-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedPartner || !amount}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            {loading ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerPaymentModal;