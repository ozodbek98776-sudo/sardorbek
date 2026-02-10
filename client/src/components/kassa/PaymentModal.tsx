import { useState } from 'react';
import { X, Banknote, CreditCard, AlertTriangle } from 'lucide-react';
import { Customer, CartItem } from '../../types';
import { formatNumber } from '../../utils/format';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  cart: CartItem[];
  customers: Customer[];
  onPayment: (data: PaymentData) => void;
  onCreateCustomer: (name: string, phone: string) => Promise<void>;
}

export interface PaymentData {
  customer: Customer | null;
  cashAmount: number;
  cardAmount: number;
  total: number;
  debtAmount: number;
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  total, 
  cart,
  customers,
  onPayment,
  onCreateCustomer
}: PaymentModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  
  // Modal scroll lock
  useModalScrollLock(isOpen);
  
  // Debug: Mijozlar sonini ko'rsatish
  console.log('🔵 PaymentModal render:', {
    isOpen,
    customersCount: Array.isArray(customers) ? customers.length : 'NOT ARRAY',
    customers: customers
  });
  
  const totalPaid = cashAmount + cardAmount;
  const debtAmount = Math.max(0, total - totalPaid);
  const changeAmount = Math.max(0, totalPaid - total);
  
  const handleSubmit = () => {
    console.log('🔵 PaymentModal handleSubmit boshlandi');
    console.log('   - Total:', total);
    console.log('   - Cash:', cashAmount);
    console.log('   - Card:', cardAmount);
    console.log('   - Total Paid:', totalPaid);
    console.log('   - Debt:', debtAmount);
    console.log('   - Customer:', selectedCustomer);
    
    if (totalPaid <= 0) {
      console.error('❌ Total paid 0 yoki manfiy!');
      alert('To\'lov summasi 0 dan katta bo\'lishi kerak!');
      return;
    }
    
    if (debtAmount > 0 && !selectedCustomer) {
      console.error('❌ Qarz bor lekin mijoz tanlanmagan!');
      alert('Qarzga sotish uchun mijozni tanlang!');
      return;
    }
    
    console.log('✅ Validatsiya o\'tdi, onPayment chaqirilmoqda...');
    
    onPayment({
      customer: selectedCustomer,
      cashAmount,
      cardAmount,
      total,
      debtAmount
    });
    
    // Reset
    handleClose();
  };
  
  const handleClose = () => {
    setSelectedCustomer(null);
    setCashAmount(0);
    setCardAmount(0);
    setShowNewCustomerForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    onClose();
  };
  
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      alert('Ism va telefon raqamini kiriting!');
      return;
    }
    
    await onCreateCustomer(newCustomerName.trim(), newCustomerPhone.trim());
    setShowNewCustomerForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      data-modal="true"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto"
      style={{ pointerEvents: 'auto', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 overflow-hidden"
        style={{ pointerEvents: 'auto', marginBottom: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between">
          <h3 className="text-xl font-bold">To'lov</h3>
          <button onClick={handleClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto scroll-smooth-instagram momentum-scroll thin-scrollbar">
          {/* Total */}
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-600 mb-1">Jami summa</p>
            <p className="text-3xl font-bold text-brand-600">{formatNumber(total)} so'm</p>
          </div>

          {/* Customer select */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Mijoz</label>
            
            {!showNewCustomerForm ? (
              <div className="space-y-2">
                {/* Debug info */}
                {(!Array.isArray(customers) || customers.length === 0) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800 mb-2">
                    ⚠️ Mijozlar yuklanmagan. Yangi mijoz qo'shing.
                  </div>
                )}
                
                <select
                  value={selectedCustomer?._id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c._id === e.target.value);
                    setSelectedCustomer(customer || null);
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Oddiy mijoz</option>
                  {Array.isArray(customers) && customers.map(customer => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => setShowNewCustomerForm(true)}
                  className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors text-sm"
                >
                  + Yangi mijoz qo'shish
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-blue-50 rounded-xl">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Ism</label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Mijoz ismi..."
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Telefon</label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCustomer}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                  >
                    Saqlash
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCustomerForm(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                    }}
                    className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                Naqd pul
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-lg font-semibold"
                />
                <button
                  onClick={() => setCashAmount(total)}
                  className="px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl transition-all whitespace-nowrap"
                >
                  To'liq
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Karta
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cardAmount || ''}
                  onChange={(e) => setCardAmount(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-lg font-semibold"
                />
                <button
                  onClick={() => setCardAmount(total)}
                  className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-xl transition-all whitespace-nowrap"
                >
                  To'liq
                </button>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          {totalPaid > 0 && (
            <div className="space-y-2">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Jami to'lanadi:</span>
                  <span className="font-bold text-slate-900">{formatNumber(totalPaid)} so'm</span>
                </div>
                
                {debtAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600">Qarz:</span>
                    <span className="font-bold text-amber-600">{formatNumber(debtAmount)} so'm</span>
                  </div>
                )}
                
                {changeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Qaytim:</span>
                    <span className="font-bold text-green-600">{formatNumber(changeAmount)} so'm</span>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {debtAmount > 0 && !selectedCustomer && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 text-sm">Oddiy mijozga qarzga sotib bo'lmaydi!</p>
                    <p className="text-xs text-red-700 mt-1">To'liq to'lov qiling yoki mijozni tanlang</p>
                  </div>
                </div>
              )}

              {debtAmount > 0 && selectedCustomer && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Qisman to'lov</p>
                    <p className="text-xs text-amber-700 mt-1">
                      {formatNumber(debtAmount)} so'm <span className="font-bold">{selectedCustomer.name}</span> nomiga qarzga yoziladi
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={totalPaid <= 0 || (debtAmount > 0 && !selectedCustomer)}
              className="flex-1 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Tasdiqlash
            </button>
            <button
              onClick={handleClose}
              className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Bekor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
