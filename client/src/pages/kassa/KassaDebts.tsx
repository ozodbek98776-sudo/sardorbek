import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, DollarSign, TrendingUp, X, RefreshCw, Package, Plus, Minus, Calendar, Eye, Trash2 } from 'lucide-react';
import { Debt, Customer, Product } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

interface DebtItem {
  product: Product;
  quantity: number;
  price: number;
}

export default function KassaDebts() {
  const { showAlert, AlertComponent } = useAlert();
  const location = useLocation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showNewDebtModal, setShowNewDebtModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newDebtForm, setNewDebtForm] = useState({
    paidAmount: '',
    dueDate: '',
    description: ''
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchDebts();
    fetchCustomers();
    fetchProducts();
    
    // Kassa sahifasida beforeunload eventini vaqtincha o'chirish
    const originalHandler = window.onbeforeunload;
    window.onbeforeunload = null;
    
    // Cleanup da qaytarish
    return () => {
      window.onbeforeunload = originalHandler;
    };
  }, []);

  // Route o'zgarganda ma'lumotlarni yangilash
  useEffect(() => {
    fetchDebts();
    fetchCustomers();
    fetchProducts();
  }, [location.pathname]);

  const handleNewCustomer = async () => {
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      showAlert('Mijoz ismi va telefon raqami majburiy', 'Xatolik', 'warning');
      return;
    }

    try {
      const response = await api.post('/customers/kassa', {
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim()
      });

      if (response.data.success) {
        showAlert('Mijoz muvaffaqiyatli qo\'shildi', 'Muvaffaqiyat', 'success');
        
        // Mijozlar ro'yxatini yangilash
        fetchCustomers();
        
        // Yangi mijozni avtomatik tanlash
        setSelectedCustomer(response.data.customer);
        
        // Formani tozalash va modalni yopish
        setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
        setShowNewCustomerModal(false);
      }
    } catch (err: any) {
      console.error('Error creating customer:', err);
      const errorMessage = err.response?.data?.message || 'Mijoz qo\'shishda xatolik yuz berdi';
      showAlert(errorMessage, 'Xatolik', 'danger');
    }
  };

  const resetNewCustomerForm = () => {
    setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
    setShowNewCustomerModal(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchDebts(),
        fetchCustomers(),
        fetchProducts()
      ]);
      showAlert('Ma\'lumotlar yangilandi', 'Muvaffaqiyat', 'success');
    } catch (error) {
      console.error('Refresh xatosi:', error);
      showAlert('Ma\'lumotlarni yangilashda xatolik', 'Xatolik', 'danger');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchDebts = async () => {
    try {
      const res = await api.get('/debts/kassa');
      setDebts(res.data);
    } catch (err) {
      console.error('Error fetching debts:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/kassa');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/kassa');
      // Handle both paginated and non-paginated responses
      const productsData = res.data.data || res.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    
    // Mijozning mavjud tasdiqlangan qarzini tekshirish
    const existingApprovedDebt = debts.find(debt => 
      debt.customer?._id === customer._id && 
      debt.status === 'approved'
    );
    
    if (existingApprovedDebt) {
      showAlert(
        `${customer.name} mijozining ${formatNumber(existingApprovedDebt.amount - existingApprovedDebt.paidAmount)} so'm tasdiqlangan qarzi mavjud. Yangi qarz to'g'ridan-to'g'ri mavjud qarzga qo'shiladi.`, 
        'Ma\'lumot', 
        'info'
      );
    }
    
    // Mijoz tanlanganda mijozlar ro'yxatini yashirish va qarz qo'shish formasi ko'rsatish
  };

  const resetModal = () => {
    setShowNewDebtModal(false);
    setSelectedCustomer(null);
    setDebtItems([]);
    setCustomerSearchQuery('');
    setProductSearchQuery('');
    setShowProductSearch(false);
    setShowNewCustomerModal(false);
    setNewDebtForm({
      paidAmount: '',
      dueDate: '',
      description: ''
    });
    setNewCustomerForm({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
  };

  const addProduct = (product: Product) => {
    const existingItem = debtItems.find(item => item.product._id === product._id);
    if (existingItem) {
      setDebtItems(prev => prev.map(item => 
        item.product._id === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setDebtItems(prev => [...prev, {
        product,
        quantity: 1,
        price: product.price
      }]);
    }
    
    // Qidirish maydonini tozalash
    setProductSearchQuery('');
    setShowProductSearch(false);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setDebtItems(prev => prev.filter(item => item.product._id !== productId));
      return;
    }

    setDebtItems(prev => prev.map(item => 
      item.product._id === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const removeProduct = (productId: string) => {
    setDebtItems(prev => prev.filter(item => item.product._id !== productId));
  };

  const handleViewDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowViewModal(true);
  };

  const handleDeleteDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowDeleteModal(true);
  };

  const confirmDeleteDebt = async () => {
    if (!selectedDebt) return;

    try {
      await api.delete(`/debts/kassa/${selectedDebt._id}`);
      showAlert('Qarz muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat', 'success');
      setShowDeleteModal(false);
      setSelectedDebt(null);
      fetchDebts();
    } catch (err: any) {
      console.error('Error deleting debt:', err);
      const errorMessage = err.response?.data?.message || 'Qarzni o\'chirishda xatolik yuz berdi';
      showAlert(errorMessage, 'Xatolik', 'danger');
    }
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedDebt(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedDebt(null);
  };

  const handleNewDebt = async () => {
    if (!selectedCustomer || debtItems.length === 0 || !newDebtForm.dueDate) {
      showAlert('Barcha majburiy maydonlarni to\'ldiring', 'Xatolik', 'warning');
      return;
    }

    try {
      const totalAmount = debtItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const paidAmount = parseFloat(parseNumber(newDebtForm.paidAmount)) || 0;

      // To'langan summa jami summadan ko'p bo'lsa ogohlantirish
      if (paidAmount > totalAmount) {
        showAlert(
          `To'langan summa (${formatNumber(paidAmount)} so'm) jami summadan (${formatNumber(totalAmount)} so'm) ko'p bo'lishi mumkin emas!`, 
          'Xatolik', 
          'danger'
        );
        return;
      }

      const debtData = {
        customer: selectedCustomer._id,
        amount: totalAmount,
        paidAmount: paidAmount,
        dueDate: newDebtForm.dueDate,
        description: newDebtForm.description,
        items: debtItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // 1. Qarzni saqlash
      const response = await api.post('/debts/kassa', debtData);
      const isExistingDebt = response.status === 200; // 200 = updated existing, 201 = created new
      
      // Muvaffaqiyat xabari
      const message = isExistingDebt 
        ? 'Qarz mavjud qarzga muvaffaqiyatli qo\'shildi! Bitta qarz sifatida ko\'rinadi.'
        : 'Yangi qarz yaratildi va admin tasdiqlashini kutmoqda.';
      showAlert(message, 'Muvaffaqiyat', 'success');
      
      resetModal();
      fetchDebts();
      
    } catch (err) {
      console.error('Error creating debt:', err);
      showAlert('Qarz qo\'shishda xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customerSearchQuery === '' ||
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone.includes(customerSearchQuery)
  );

  const filteredProducts = products.filter(product => {
    if (!productSearchQuery.trim()) return false;
    
    const query = productSearchQuery.toLowerCase().trim();
    const productName = product.name.toLowerCase();
    const productCode = product.code.toLowerCase();
    
    // Agar kod aniq mos kelsa, uni birinchi o'ringa qo'yish
    if (productCode === query) return true;
    
    // Agar kod bilan boshlanayotgan bo'lsa
    if (productCode.startsWith(query)) return true;
    
    // Agar kod ichida bo'lsa
    if (productCode.includes(query)) return true;
    
    // Agar nom ichida bo'lsa
    if (productName.includes(query)) return true;
    
    return false;
  }).sort((a, b) => {
    const query = productSearchQuery.toLowerCase().trim();
    const aCode = a.code.toLowerCase();
    const bCode = b.code.toLowerCase();
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // Aniq kod mos kelishi birinchi o'rinda
    if (aCode === query && bCode !== query) return -1;
    if (bCode === query && aCode !== query) return 1;
    
    // Kod bilan boshlanayotganlar keyingi o'rinda
    if (aCode.startsWith(query) && !bCode.startsWith(query)) return -1;
    if (bCode.startsWith(query) && !aCode.startsWith(query)) return 1;
    
    // Nom bilan boshlanayotganlar
    if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
    if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
    
    // Qolganlarini alifbo tartibida
    return a.name.localeCompare(b.name);
  });

  // Jami summa va qoldiq hisoblash
  const totalAmount = debtItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const paidAmount = parseFloat(parseNumber(newDebtForm.paidAmount)) || 0;
  const remainingDebt = totalAmount - paidAmount;

  // Qarzlarni filtrlash
  const filteredDebts = debts.filter(debt => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const customerName = debt.customer?.name?.toLowerCase() || '';
    const customerPhone = debt.customer?.phone || '';
    
    return customerName.includes(query) || customerPhone.includes(query);
  });

  return (
    <div className="p-3 sm:p-6 h-full flex flex-col overflow-hidden">
      {AlertComponent}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowNewDebtModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors w-full sm:w-auto"
          >
            <DollarSign className="w-4 h-4" />
            Yangi qarz
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Yangilanmoqda...' : 'Yangilash'}
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 flex-shrink-0">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-surface-500 truncate">Jami qarz</p>
              <p className="text-lg sm:text-xl font-bold text-surface-900 truncate">
                {formatNumber(debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-surface-500 truncate">Jami qarzlar soni</p>
              <p className="text-lg sm:text-xl font-bold text-surface-900">
                {debts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden flex flex-col h-[calc(100vh-400px)] min-h-[400px]">
        <div className="p-3 sm:p-4 border-b border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Mijoz qidirish..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredDebts.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-surface-400" />
              </div>
              <p className="font-medium text-lg mb-2">
                {searchQuery ? 'Qarz topilmadi' : 'Qarzlar ro\'yxati bo\'sh'}
              </p>
              <p className="text-sm">
                {searchQuery ? `"${searchQuery}" bo'yicha hech qanday qarz topilmadi` : 'Hozircha hech qanday qarz qo\'shilmagan'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden">
                {filteredDebts.map(debt => (
                  <div key={debt._id} className="p-4 border-b border-surface-100 last:border-b-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-brand-600">
                          {debt.customer?.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 truncate">{debt.customer?.name}</p>
                        <p className="text-sm text-surface-500">{debt.customer?.phone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-surface-500 mb-1">Qarz summasi</p>
                        <p className="font-medium text-surface-900">{formatNumber(debt.amount)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-1">Qoldiq</p>
                        <p className="font-medium text-danger-600">{formatNumber(debt.amount - debt.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 mb-1">Muddat</p>
                        <p className="text-surface-900">{new Date(debt.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleViewDebt(debt)}
                          className="p-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Qarz ma'lumotlarini ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead className="bg-surface-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Mijoz</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Qarz</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Qoldiq</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Muddat</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredDebts.map(debt => (
                      <tr key={debt._id} className="hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-semibold text-brand-600">
                                {debt.customer?.name.charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-surface-900 truncate">{debt.customer?.name}</p>
                              <p className="text-sm text-surface-500 truncate">{debt.customer?.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-surface-900">
                            {formatNumber(debt.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-danger-600">
                            {formatNumber(debt.amount - debt.paidAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-surface-500">
                            {new Date(debt.dueDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleViewDebt(debt)}
                              className="p-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Qarz ma'lumotlarini ko'rish"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>  
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Debt Modal - Mijoz tanlash va qarz qo'shish */}
      {showNewDebtModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => resetModal()} />
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-6xl shadow-2xl relative z-10 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-surface-200 bg-gradient-to-r from-brand-50 to-blue-50 rounded-t-2xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-surface-900 truncate">
                    {selectedCustomer ? `${selectedCustomer.name} uchun qarz qo'shish` : 'Mijoz tanlash'}
                  </h3>
                  <p className="text-xs sm:text-sm text-surface-600 truncate">
                    {selectedCustomer ? 'Mahsulotlarni tanlang va to\'lov ma\'lumotlarini kiriting' : 'Qarz berish uchun mijozni tanlang'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => resetModal()}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-white/50 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {!selectedCustomer ? (
              /* Mijozlar ro'yxati */
              <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-0">
                {/* Search */}
                <div className="relative mb-3 sm:mb-4 lg:mb-6">
                  <div className="flex gap-2 sm:gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-surface-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Mijoz ismi yoki telefon raqami bilan qidiring..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm bg-white border-2 border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      />
                      {customerSearchQuery && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <button
                            onClick={() => setCustomerSearchQuery('')}
                            className="w-5 h-5 flex items-center justify-center text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNewCustomerModal(true)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors flex-shrink-0"
                      title="Yangi mijoz qo'shish"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Yangi mijoz</span>
                    </button>
                  </div>
                </div>
                
                {/* Customers List */}
                <div className="space-y-2 sm:space-y-3">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-6 sm:p-8 lg:p-12 text-center text-surface-500">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Search className="w-6 h-6 sm:w-8 sm:h-8 text-surface-400" />
                      </div>
                      <p className="font-medium text-sm sm:text-base lg:text-lg mb-2">
                        {customerSearchQuery ? 'Mijoz topilmadi' : 'Mijozlar ro\'yxati bo\'sh'}
                      </p>
                      <p className="text-xs sm:text-sm">
                        {customerSearchQuery ? `"${customerSearchQuery}" bo'yicha hech kim topilmadi` : 'Hozircha mijozlar qo\'shilmagan'}
                      </p>
                    </div>
                  ) : (
                    filteredCustomers.map(customer => {
                      const existingDebt = debts.find(debt => 
                        debt.customer?._id === customer._id && 
                        debt.status === 'pending_approval'
                      );
                      
                      return (
                        <button
                          key={customer._id}
                          onClick={() => selectCustomer(customer)}
                          className="w-full p-3 sm:p-4 hover:bg-gradient-to-r hover:from-brand-50 hover:to-blue-50 transition-all duration-200 text-left border-2 border-surface-200 hover:border-brand-300 rounded-xl group"
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0">
                              <span className="text-sm sm:text-base lg:text-lg font-bold text-white">
                                {customer.name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-surface-900 text-sm sm:text-base lg:text-lg truncate">{customer.name}</p>
                                {existingDebt && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-700 flex-shrink-0">
                                    Qarz mavjud
                                  </span>
                                )}
                              </div>
                              <p className="text-surface-600 flex items-center gap-1 text-xs sm:text-sm">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="truncate">{customer.phone}</span>
                              </p>
                              {existingDebt && (
                                <p className="text-xs text-warning-600 font-medium mt-1">
                                  Mavjud qarz: {formatNumber(existingDebt.amount - existingDebt.paidAmount)} so'm
                                </p>
                              )}
                              {customer.email && (
                                <p className="text-xs text-surface-500 flex items-center gap-1 mt-1">
                                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate">{customer.email}</span>
                                </p>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Qarz qo'shish formi - Bitta scroll */
              <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto min-h-0">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Mijoz ma'lumotlari */}
                  <div className="bg-surface-50 p-3 sm:p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-brand-600 text-sm sm:text-lg">
                          {selectedCustomer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-surface-900 text-sm sm:text-base">{selectedCustomer.name}</h5>
                        <p className="text-xs sm:text-sm text-surface-500">{selectedCustomer.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mahsulotlar qismi */}
                  <div className="bg-white border border-surface-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-surface-900 text-sm sm:text-base">Mahsulotlar</h4>
                      <button
                        onClick={() => setShowProductSearch(true)}
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm text-xs sm:text-sm"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Mahsulot qidirish</span>
                        <span className="sm:hidden">Qo'shish</span>
                      </button>
                    </div>

                    {/* Quick Search */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <input
                          type="text"
                          placeholder="Tez qidirish: mahsulot nomi yoki kodi..."
                          value={productSearchQuery}
                          onChange={e => setProductSearchQuery(e.target.value)}
                          onFocus={() => setShowProductSearch(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && filteredProducts.length > 0) {
                              addProduct(filteredProducts[0]);
                            }
                            if (e.key === 'Escape') {
                              setProductSearchQuery('');
                            }
                          }}
                          className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                        {productSearchQuery && (
                          <button
                            onClick={() => setProductSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-surface-400 hover:text-surface-600 rounded-full hover:bg-surface-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {productSearchQuery && filteredProducts.length > 0 && !showProductSearch && (
                        <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
                          <span>{filteredProducts.length} ta mahsulot topildi</span>
                          <span className="text-brand-600">Enter - birinchisini tanlash</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Search Results */}
                    {productSearchQuery && filteredProducts.length > 0 && !showProductSearch && (
                      <div className="mb-4 max-h-40 overflow-y-auto border border-surface-200 rounded-lg">
                        {filteredProducts.slice(0, 5).map(product => (
                          <button
                            key={product._id}
                            onClick={() => addProduct(product)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-surface-50 transition-colors text-left border-b border-surface-100 last:border-b-0"
                          >
                            <div className="w-8 h-8 bg-brand-100 rounded flex items-center justify-center">
                              <Package className="w-4 h-4 text-brand-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-surface-900 text-sm truncate">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-surface-500 bg-surface-100 px-2 py-0.5 rounded">
                                  {product.code}
                                </span>
                                <span className="text-xs text-surface-500">
                                  Omborda: {product.quantity} ta
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-brand-600 text-sm">{formatNumber(product.price)}</p>
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length > 5 && (
                          <button
                            onClick={() => setShowProductSearch(true)}
                            className="w-full p-2 text-center text-sm text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            Yana {filteredProducts.length - 5} ta ko'rish...
                          </button>
                        )}
                      </div>
                    )}

                    {/* Selected Products */}
                    <div className="space-y-2">
                      {debtItems.length === 0 ? (
                        <div className="p-6 sm:p-8 text-center text-surface-500 border-2 border-dashed border-surface-200 rounded-lg">
                          <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Mahsulot tanlanmagan</p>
                        </div>
                      ) : (
                        debtItems.map(item => (
                          <div key={item.product._id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-surface-50 rounded-lg border border-surface-200">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-surface-900 text-xs sm:text-sm truncate">{item.product.name}</p>
                              <p className="text-xs text-surface-500">Kod: {item.product.code}</p>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-surface-200 hover:bg-surface-300 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 sm:w-10 text-center font-medium bg-white px-1 sm:px-2 py-1 rounded border text-xs sm:text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-surface-200 hover:bg-surface-300 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right min-w-0">
                              <p className="font-bold text-surface-900 text-xs sm:text-sm">{formatNumber(item.price * item.quantity)} so'm</p>
                              <p className="text-xs text-surface-500">{formatNumber(item.price)} × {item.quantity}</p>
                            </div>
                            <button
                              onClick={() => removeProduct(item.product._id)}
                              className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-danger-500 hover:bg-danger-50 transition-colors flex-shrink-0"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Summa hisoblash */}
                  <div className="bg-surface-50 p-3 sm:p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-surface-600 text-xs sm:text-sm">Jami summa:</span>
                      <span className="font-semibold text-surface-900 text-xs sm:text-sm">{formatNumber(totalAmount)} so'm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-600 text-xs sm:text-sm">To'langan:</span>
                      <span className="font-semibold text-success-600 text-xs sm:text-sm">{formatNumber(paidAmount)} so'm</span>
                    </div>
                    <div className="flex justify-between border-t border-surface-200 pt-2">
                      <span className="text-surface-600 text-xs sm:text-sm">Qarz qoldi:</span>
                      <span className={`font-bold text-sm sm:text-base ${
                        remainingDebt < 0 ? 'text-danger-600' : 'text-danger-600'
                      }`}>
                        {remainingDebt < 0 ? '-' : ''}{formatNumber(Math.abs(remainingDebt))} so'm
                      </span>
                    </div>
                    {remainingDebt < 0 && (
                      <div className="bg-danger-50 border border-danger-200 rounded-lg p-2 mt-2">
                        <p className="text-danger-700 text-xs font-medium">
                          ⚠️ To'langan summa jami summadan ko'p! Qarz minus bo'ldi.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* To'lov ma'lumotlari */}
                  <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-4">
                    <h4 className="font-semibold text-surface-900 text-sm sm:text-base">To'lov ma'lumotlari</h4>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-surface-700 mb-2 sm:mb-3 flex items-center gap-2">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-success-600" />
                        To'langan summa
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0"
                          value={newDebtForm.paidAmount}
                          onChange={e => {
                            const formatted = formatInputNumber(e.target.value);
                            const numericValue = parseFloat(parseNumber(formatted)) || 0;
                            
                            // Agar jami summadan ko'p bo'lsa, ogohlantirish berish va kiritishni cheklash
                            if (numericValue > totalAmount && totalAmount > 0) {
                              showAlert(
                                `To'langan summa jami summadan (${formatNumber(totalAmount)} so'm) ko'p bo'lishi mumkin emas!`, 
                                'Ogohlantirish', 
                                'warning'
                              );
                              return; // Kiritishni to'xtatish
                            }
                            
                            setNewDebtForm(prev => ({ ...prev, paidAmount: formatted }));
                          }}
                          className={`w-full pl-3 sm:pl-4 pr-12 sm:pr-16 py-3 sm:py-4 text-base sm:text-lg font-semibold border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
                            remainingDebt < 0 
                              ? 'border-danger-500 bg-gradient-to-r from-danger-50 to-red-50 focus:border-danger-500 focus:ring-danger-500/10' 
                              : paidAmount < totalAmount && paidAmount > 0
                              ? 'border-orange-400 bg-gradient-to-r from-yellow-100 to-orange-100 focus:border-orange-400 focus:ring-orange-400/10'
                              : 'border-surface-200 bg-gradient-to-r from-white to-success-50 focus:border-success-500 focus:ring-success-500/10'
                          }`}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center pointer-events-none">
                          <span className="text-surface-500 font-medium text-xs sm:text-sm">so'm</span>
                        </div>
                      </div>
                      {newDebtForm.paidAmount && (
                        <div className={`mt-2 text-xs sm:text-sm font-medium ${
                          remainingDebt < 0 ? 'text-danger-600' : 'text-success-600'
                        }`}>
                          {newDebtForm.paidAmount} so'm
                          {remainingDebt < 0 && (
                            <span className="block text-danger-600 font-bold mt-1">
                              ⚠️ Jami summadan ko'p!
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-surface-700 mb-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Qaytarish muddati *
                      </label>
                      <input
                        type="date"
                        value={newDebtForm.dueDate}
                        onChange={e => setNewDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Search Modal */}
                {showProductSearch && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setShowProductSearch(false)} />
                    <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl relative z-10 max-h-[90vh] overflow-hidden">
                      <div className="p-3 sm:p-4 border-b border-surface-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-surface-900 text-sm sm:text-base">Mahsulot tanlash</h5>
                          <button
                            onClick={() => setShowProductSearch(false)}
                            className="text-surface-400 hover:text-surface-600"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                          <input
                            type="text"
                            placeholder="Mahsulot nomi yoki kodi bilan qidiring..."
                            value={productSearchQuery}
                            onChange={e => setProductSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 sm:py-3 text-xs sm:text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                            autoFocus
                          />
                        </div>
                        {productSearchQuery && (
                          <div className="mt-2 text-xs text-surface-500">
                            "{productSearchQuery}" bo'yicha {filteredProducts.length} ta natija topildi
                          </div>
                        )}
                      </div>
                      <div className="max-h-80 sm:max-h-96 overflow-y-auto p-3 sm:p-4">
                        {filteredProducts.length === 0 ? (
                          <div className="p-6 sm:p-8 text-center text-surface-500">
                            <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium mb-1 text-sm">
                              {productSearchQuery ? 'Mahsulot topilmadi' : 'Qidirish uchun mahsulot nomini yoki kodini kiriting'}
                            </p>
                            {productSearchQuery && (
                              <p className="text-xs">
                                "{productSearchQuery}" bo'yicha hech narsa topilmadi
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {filteredProducts.slice(0, 100).map(product => (
                              <button
                                key={product._id}
                                onClick={() => addProduct(product)}
                                className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-surface-50 transition-colors text-left border border-surface-200 rounded-lg group"
                              >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-200 transition-colors flex-shrink-0">
                                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-surface-900 truncate text-xs sm:text-sm">{product.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded">
                                      Kod: {product.code}
                                    </span>
                                    <span className="text-xs text-surface-500">
                                      Omborda: {product.quantity} ta
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-brand-600 text-sm sm:text-base">{formatNumber(product.price)} so'm</p>
                                  <p className="text-xs text-surface-500">Narxi</p>
                                </div>
                              </button>
                            ))}
                            {filteredProducts.length > 100 && (
                              <div className="p-3 text-center text-surface-500 text-xs border-t border-surface-200">
                                Faqat birinchi 100 ta natija ko'rsatildi. Aniqroq qidiring.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 border-t border-surface-200 bg-surface-50">
                        <div className="flex items-center gap-2 text-xs text-surface-500">
                          <div className="flex items-center gap-1">
                            <Search className="w-3 h-3" />
                            <span>Maslahat: Mahsulot nomini yoki kodini to'liq kiriting</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 lg:p-6 border-t border-surface-200 bg-surface-50/50">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-surface-600 order-2 sm:order-1">
                {selectedCustomer && (
                  <>
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span>Mijoz tanlandi: {selectedCustomer.name}</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
                {selectedCustomer && (
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors text-xs sm:text-sm"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Orqaga
                  </button>
                )}
                <button
                  onClick={() => resetModal()}
                  className="px-3 sm:px-4 py-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors text-xs sm:text-sm"
                >
                  Bekor qilish
                </button>
                {selectedCustomer && (
                  <button
                    onClick={handleNewDebt}
                    disabled={debtItems.length === 0 || !newDebtForm.dueDate}
                    className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg hover:from-brand-600 hover:to-brand-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-xs sm:text-sm flex-1 sm:flex-none justify-center"
                  >
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                    Qarz qo'shish
                    {totalAmount > 0 && (
                      <span className="ml-2 px-2 py-1 bg-white/20 rounded text-xs hidden sm:inline">
                        {formatNumber(remainingDebt)} so'm
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Debt Modal */}
      {showViewModal && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeViewModal} />
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-200 bg-gradient-to-r from-brand-50 to-blue-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-surface-900">Qarz ma'lumotlari</h3>
                  <p className="text-sm text-surface-600">#{selectedDebt._id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={closeViewModal}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-surface-50 p-4 rounded-xl">
                <h4 className="font-semibold text-surface-900 mb-3">Mijoz ma'lumotlari</h4>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="font-semibold text-brand-600 text-lg">
                      {selectedDebt.customer?.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900">{selectedDebt.customer?.name}</p>
                    <p className="text-surface-600">{selectedDebt.customer?.phone}</p>
                    {selectedDebt.customer?.email && (
                      <p className="text-sm text-surface-500">{selectedDebt.customer?.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Debt Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-surface-200">
                  <p className="text-sm text-surface-500 mb-1">Qarz summasi</p>
                  <p className="text-2xl font-bold text-surface-900">{formatNumber(selectedDebt.amount)} so'm</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-surface-200">
                  <p className="text-sm text-surface-500 mb-1">To'langan</p>
                  <p className="text-2xl font-bold text-success-600">{formatNumber(selectedDebt.paidAmount)} so'm</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-surface-200">
                  <p className="text-sm text-surface-500 mb-1">Qoldiq</p>
                  <p className="text-2xl font-bold text-danger-600">{formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-surface-200">
                  <p className="text-sm text-surface-500 mb-1">Muddat</p>
                  <p className="text-lg font-semibold text-surface-900">{new Date(selectedDebt.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Description */}
              {selectedDebt.description && (
                <div className="bg-white p-4 rounded-xl border border-surface-200">
                  <h4 className="font-semibold text-surface-900 mb-2">Izoh</h4>
                  <p className="text-surface-700">{selectedDebt.description}</p>
                </div>
              )}

              {/* Items */}
              {selectedDebt.items && selectedDebt.items.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-surface-200">
                  <h4 className="font-semibold text-surface-900 mb-3">Mahsulotlar</h4>
                  <div className="space-y-2">
                    {selectedDebt.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-surface-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-100 rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-brand-600" />
                          </div>
                          <div>
                            <p className="font-medium text-surface-900">{item.product?.name || 'Mahsulot'}</p>
                            <p className="text-sm text-surface-500">Miqdor: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-surface-900">{formatNumber(item.price * item.quantity)} so'm</p>
                          <p className="text-sm text-surface-500">{formatNumber(item.price)} × {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="bg-surface-50 p-4 rounded-xl">
                <p className="text-sm text-surface-500 mb-1">Yaratilgan</p>
                <p className="font-semibold text-surface-900">{new Date(selectedDebt.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-surface-200 bg-surface-50/50">
              <button
                onClick={closeViewModal}
                className="px-6 py-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Debt Modal */}
      {showDeleteModal && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeDeleteModal} />
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-200 bg-gradient-to-r from-danger-50 to-red-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-danger-500 to-danger-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-surface-900">Qarzni o'chirish</h3>
                  <p className="text-sm text-surface-600">Bu amalni bekor qilib bo'lmaydi</p>
                </div>
              </div>
              <button
                onClick={closeDeleteModal}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="bg-danger-50 p-4 rounded-xl border border-danger-200 mb-4">
                <p className="text-danger-800 font-medium mb-2">Diqqat!</p>
                <p className="text-danger-700 text-sm">
                  Siz <strong>{selectedDebt.customer?.name}</strong> mijozining <strong>{formatNumber(selectedDebt.amount)} so'm</strong> qarzini o'chirmoqchisiz. 
                  Bu amal bekor qilinmaydi va barcha ma'lumotlar yo'qoladi.
                </p>
                {selectedDebt.status === 'approved' && (
                  <p className="text-danger-600 text-xs mt-2">
                    <strong>Eslatma:</strong> Bu tasdiqlangan qarz. O'chirilganda mijozning umumiy qarzidan ham ayriladi.
                  </p>
                )}
              </div>

              <div className="bg-surface-50 p-4 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600">Qarz summasi:</span>
                  <span className="font-semibold text-surface-900">{formatNumber(selectedDebt.amount)} so'm</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-surface-600">Qoldiq:</span>
                  <span className="font-semibold text-danger-600">{formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-surface-200 bg-surface-50/50">
              <button
                onClick={closeDeleteModal}
                className="px-6 py-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmDeleteDebt}
                className="px-6 py-2 bg-gradient-to-r from-danger-500 to-danger-600 text-white rounded-lg hover:from-danger-600 hover:to-danger-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={resetNewCustomerForm} />
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-200 bg-gradient-to-r from-success-50 to-green-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-success-500 to-success-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-surface-900">Yangi mijoz qo'shish</h3>
                  <p className="text-sm text-surface-600">Mijoz ma'lumotlarini kiriting</p>
                </div>
              </div>
              <button
                onClick={resetNewCustomerForm}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Mijoz ismi *
                </label>
                <input
                  type="text"
                  value={newCustomerForm.name}
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
                  placeholder="Mijoz ismini kiriting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Telefon raqami *
                </label>
                <input
                  type="tel"
                  value={newCustomerForm.phone}
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Email (ixtiyoriy)
                </label>
                <input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20"
                  placeholder="mijoz@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Manzil (ixtiyoriy)
                </label>
                <textarea
                  value={newCustomerForm.address}
                  onChange={e => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-success-500 focus:ring-2 focus:ring-success-500/20 resize-none"
                  rows={3}
                  placeholder="Mijoz manzilini kiriting"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-surface-200 bg-surface-50/50">
              <button
                onClick={resetNewCustomerForm}
                className="px-6 py-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleNewCustomer}
                disabled={!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()}
                className="px-6 py-2 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-lg hover:from-success-600 hover:to-success-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mijoz qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}