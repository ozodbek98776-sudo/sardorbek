import { useState, useEffect } from 'react';
import { Search, DollarSign, Clock, TrendingUp, AlertTriangle, X, Package, Plus, Minus, User } from 'lucide-react';
import { Debt, Customer, Product } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

interface DebtItem {
  product: Product;
  quantity: number;
  price: number;
}

interface CustomerDebtDetails {
  customer: Customer;
  debts: Debt[];
  totalDebt: number;
  totalPaid: number;
  remainingDebt: number;
}

export default function KassaDebts() {
  const { showAlert, AlertComponent } = useAlert();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [showNewDebtModal, setShowNewDebtModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<CustomerDebtDetails | null>(null);
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [newDebtForm, setNewDebtForm] = useState({
    amount: '',
    paidAmount: '',
    dueDate: '',
    description: '',
    collateral: ''
  });

  useEffect(() => {
    fetchDebts();
    fetchCustomers();
    fetchProducts();
  }, []);

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
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const [customerRes, debtsRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/debts/customer/${customerId}`)
      ]);
      
      const customer = customerRes.data;
      const customerDebts = debtsRes.data;
      
      const totalDebt = customerDebts.reduce((sum: number, debt: Debt) => sum + debt.amount, 0);
      const totalPaid = customerDebts.reduce((sum: number, debt: Debt) => sum + debt.paidAmount, 0);
      const remainingDebt = totalDebt - totalPaid;
      
      setSelectedCustomerDetails({
        customer,
        debts: customerDebts,
        totalDebt,
        totalPaid,
        remainingDebt
      });
    } catch (err) {
      console.error('Error fetching customer details:', err);
      showAlert('Mijoz ma\'lumotlarini yuklashda xatolik', 'Xatolik', 'danger');
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerDetails(customer._id);
  };

  const resetCustomersModal = () => {
    setShowCustomersModal(false);
    setSelectedCustomer(null);
    setSelectedCustomerDetails(null);
    setCustomerSearchQuery('');
  };

  const totalAmount = parseFloat(newDebtForm.amount) || 0;
  const paidAmount = parseFloat(newDebtForm.paidAmount) || 0;
  const remainingDebt = totalAmount - paidAmount;

  const handleNewDebt = async () => {
    if (!selectedCustomer || totalAmount <= 0 || !newDebtForm.dueDate) {
      showAlert('Barcha majburiy maydonlarni to\'ldiring', 'Xatolik', 'warning');
      return;
    }

    try {
      const debtData = {
        customer: selectedCustomer._id,
        amount: totalAmount,
        dueDate: newDebtForm.dueDate,
        description: newDebtForm.description,
        collateral: newDebtForm.collateral
      };

      await api.post('/debts/kassa', debtData);
      
      showAlert('Qarz muvaffaqiyatli qo\'shildi va admin tasdiqlashini kutmoqda!', 'Muvaffaqiyat', 'success');
      resetModal();
      fetchDebts();
      fetchCustomers();
      
    } catch (err) {
      console.error('Error creating debt:', err);
      showAlert('Qarz qo\'shishda xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const resetModal = () => {
    setShowNewDebtModal(false);
    setSelectedCustomer(null);
    setDebtItems([]);
    setCustomerSearchQuery('');
    setProductSearchQuery('');
    setShowProductSearch(false);
    setNewDebtForm({
      amount: '',
      paidAmount: '',
      dueDate: '',
      description: '',
      collateral: ''
    });
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
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
    setShowProductSearch(false);
    setProductSearchQuery('');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setDebtItems(prev => prev.filter(item => item.product._id !== productId));
    } else {
      setDebtItems(prev => prev.map(item => 
        item.product._id === productId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeProduct = (productId: string) => {
    setDebtItems(prev => prev.filter(item => item.product._id !== productId));
  };

  const filteredCustomers = customers.filter(customer =>
    customerSearchQuery === '' ||
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone.includes(customerSearchQuery)
  );

  const filteredProducts = products.filter(product =>
    productSearchQuery === '' ||
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      {AlertComponent}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewDebtModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Yangi qarz
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-surface-500">Tasdiqlash</p>
              <p className="text-xl font-bold text-surface-900">
                {debts.filter(d => d.status === 'pending_approval').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-surface-500">To'langan</p>
              <p className="text-xl font-bold text-surface-900">
                {debts.filter(d => d.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-surface-500">Muddati o'tgan</p>
              <p className="text-xl font-bold text-surface-900">
                {debts.filter(d => d.status === 'overdue').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-surface-500">Jami qarz</p>
              <p className="text-xl font-bold text-surface-900">
                {formatNumber(debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Mijoz qidirish..."
                className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Mijoz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Qarz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Qoldiq</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Muddat</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Holat</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {debts.map(debt => (
                <tr key={debt._id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-brand-600">
                          {debt.customer?.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-surface-900">{debt.customer?.name}</p>
                        <p className="text-sm text-surface-500">{debt.customer?.phone}</p>
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
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      debt.status === 'paid' ? 'bg-success-100 text-success-700' :
                      debt.status === 'overdue' ? 'bg-danger-100 text-danger-700' :
                      'bg-warning-100 text-warning-700'
                    }`}>
                      {debt.status === 'paid' ? 'To\'langan' :
                       debt.status === 'overdue' ? 'Muddati o\'tgan' : 'Kutilmoqda'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                      Ko'rish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customers Modal */}
      {showCustomersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => resetCustomersModal()} />
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative z-10 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-200">
              <h3 className="text-xl font-semibold text-surface-900">Mijoz tanlash</h3>
              <button
                onClick={() => resetCustomersModal()}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex h-[calc(90vh-140px)]">
              {/* Left Side - Customers List */}
              <div className="w-1/2 border-r border-surface-200 p-6 overflow-y-auto">
                <h4 className="font-semibold text-surface-900 mb-4">Mijozlar ro'yxati</h4>
                
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Mijoz qidirish..."
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                  />
                </div>
                
                {/* Customers List */}
                <div className="space-y-2">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-surface-500 text-sm">
                      {customerSearchQuery ? 'Mijoz topilmadi' : 'Mijozlar ro\'yxati bo\'sh'}
                    </div>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer._id}
                        onClick={() => handleCustomerSelect(customer)}
                        className={`w-full p-4 hover:bg-surface-50 transition-colors text-left border rounded-lg ${
                          selectedCustomer?._id === customer._id 
                            ? 'border-brand-500 bg-brand-50' 
                            : 'border-surface-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-semibold text-brand-600">
                              {customer.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-surface-900 truncate">{customer.name}</p>
                            <p className="text-sm text-surface-500">{customer.phone}</p>
                          </div>
                          {customer.debt > 0 && (
                            <div className="text-right">
                              <p className="text-sm text-danger-600 font-medium">
                                Qarz: {formatNumber(customer.debt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side - Customer Details */}
              <div className="flex-1 p-6 overflow-y-auto">
                {selectedCustomerDetails ? (
                  <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-surface-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                          <span className="font-semibold text-brand-600 text-lg">
                            {selectedCustomerDetails.customer.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h5 className="font-semibold text-surface-900 text-lg">
                            {selectedCustomerDetails.customer.name}
                          </h5>
                          <p className="text-surface-500">{selectedCustomerDetails.customer.phone}</p>
                        </div>
                      </div>
                      
                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-lg text-center">
                          <p className="text-xs text-surface-500 mb-1">Jami xaridlar</p>
                          <p className="font-semibold text-surface-900">
                            {formatNumber(selectedCustomerDetails.customer.totalPurchases || 0)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg text-center">
                          <p className="text-xs text-surface-500 mb-1">To'langan</p>
                          <p className="font-semibold text-success-600">
                            {formatNumber(selectedCustomerDetails.totalPaid)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg text-center">
                          <p className="text-xs text-surface-500 mb-1">Qarz qoldig'i</p>
                          <p className="font-semibold text-danger-600">
                            {formatNumber(selectedCustomerDetails.remainingDebt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Debt History */}
                    <div>
                      <h6 className="font-semibold text-surface-900 mb-3">Qarzlar tarixi</h6>
                      <div className="space-y-3">
                        {selectedCustomerDetails.debts.length === 0 ? (
                          <div className="p-4 text-center text-surface-500 border-2 border-dashed border-surface-200 rounded-lg">
                            <p>Qarzlar tarixi bo'sh</p>
                          </div>
                        ) : (
                          selectedCustomerDetails.debts.map(debt => (
                            <div key={debt._id} className="bg-white border border-surface-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-medium text-surface-900">
                                    Qarz #{debt._id.slice(-6)}
                                  </p>
                                  <p className="text-sm text-surface-500">
                                    {new Date(debt.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  debt.status === 'paid' ? 'bg-success-100 text-success-700' :
                                  debt.status === 'overdue' ? 'bg-danger-100 text-danger-700' :
                                  'bg-warning-100 text-warning-700'
                                }`}>
                                  {debt.status === 'paid' ? 'To\'langan' :
                                   debt.status === 'overdue' ? 'Muddati o\'tgan' : 'Kutilmoqda'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-surface-500">Jami summa</p>
                                  <p className="font-semibold text-surface-900">
                                    {formatNumber(debt.amount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-surface-500">To'langan</p>
                                  <p className="font-semibold text-success-600">
                                    {formatNumber(debt.paidAmount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-surface-500">Qoldiq</p>
                                  <p className="font-semibold text-danger-600">
                                    {formatNumber(debt.amount - debt.paidAmount)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-surface-100">
                                <p className="text-xs text-surface-500">
                                  Muddat: {new Date(debt.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedCustomer ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-surface-500">Ma'lumotlar yuklanmoqda...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-surface-500">
                      <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Mijozni tanlang</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Debt Modal */}
      {showNewDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => resetModal()} />
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative z-10 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-200">
              <h3 className="text-xl font-semibold text-surface-900">Yangi qarz qo'shish</h3>
              <button
                onClick={() => resetModal()}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex h-[calc(90vh-140px)]">
              {/* Left Side - Customer Selection */}
              <div className="w-1/3 border-r border-surface-200 p-6 overflow-y-auto">
                <h4 className="font-semibold text-surface-900 mb-4">Mijoz tanlash</h4>
                
                {selectedCustomer ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
                          <span className="font-semibold text-brand-600 text-lg">{selectedCustomer.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-surface-900">{selectedCustomer.name}</p>
                          <p className="text-sm text-surface-500">{selectedCustomer.phone}</p>
                        </div>
                        <button
                          onClick={() => setSelectedCustomer(null)}
                          className="text-surface-400 hover:text-surface-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-surface-500">Jami xaridlar</p>
                          <p className="font-semibold text-surface-900">{formatNumber(selectedCustomer.totalPurchases || 0)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-surface-500">Mavjud qarz</p>
                          <p className="font-semibold text-danger-600">{formatNumber(selectedCustomer.debt || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="text"
                        placeholder="Mijoz qidirish..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-surface-500 text-sm">
                          {customerSearchQuery ? 'Mijoz topilmadi' : 'Mijozlar ro\'yxati bo\'sh'}
                        </div>
                      ) : (
                        filteredCustomers.map(customer => (
                          <button
                            key={customer._id}
                            onClick={() => selectCustomer(customer)}
                            className="w-full p-3 hover:bg-surface-50 transition-colors text-left border border-surface-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-surface-900 truncate">{customer.name}</p>
                                <p className="text-xs text-surface-500">{customer.phone}</p>
                              </div>
                              {customer.debt > 0 && (
                                <span className="text-xs text-danger-600 font-medium">
                                  {formatNumber(customer.debt)}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Products and Details */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Products Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-surface-900">Mahsulotlar</h4>
                      <button
                        onClick={() => setShowProductSearch(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Mahsulot qo'shish
                      </button>
                    </div>

                    {/* Selected Products */}
                    <div className="space-y-2 mb-4">
                      {debtItems.length === 0 ? (
                        <div className="p-8 text-center text-surface-500 border-2 border-dashed border-surface-200 rounded-lg">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Mahsulot tanlanmagan</p>
                        </div>
                      ) : (
                        debtItems.map(item => (
                          <div key={item.product._id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-surface-900">{item.product.name}</p>
                              <p className="text-sm text-surface-500">Kod: {item.product.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-surface-200 hover:bg-surface-300 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-surface-200 hover:bg-surface-300 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-surface-900">{formatNumber(item.price * item.quantity)}</p>
                              <p className="text-xs text-surface-500">{formatNumber(item.price)} x {item.quantity}</p>
                            </div>
                            <button
                              onClick={() => removeProduct(item.product._id)}
                              className="w-6 h-6 flex items-center justify-center rounded text-danger-500 hover:bg-danger-50 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Product Search Modal */}
                    {showProductSearch && (
                      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/40" onClick={() => setShowProductSearch(false)} />
                        <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl relative z-10 max-h-[80vh] overflow-hidden">
                          <div className="p-4 border-b border-surface-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-surface-900">Mahsulot tanlash</h5>
                              <button
                                onClick={() => setShowProductSearch(false)}
                                className="text-surface-400 hover:text-surface-600"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                              <input
                                type="text"
                                placeholder="Mahsulot qidirish..."
                                value={productSearchQuery}
                                onChange={e => setProductSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-96 overflow-y-auto p-4">
                            <div className="grid grid-cols-1 gap-2">
                              {filteredProducts.slice(0, 50).map(product => (
                                <button
                                  key={product._id}
                                  onClick={() => addProduct(product)}
                                  className="flex items-center gap-3 p-3 hover:bg-surface-50 transition-colors text-left border border-surface-200 rounded-lg"
                                >
                                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                                    <Package className="w-5 h-5 text-brand-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-surface-900">{product.name}</p>
                                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-brand-600">{formatNumber(product.price)}</p>
                                    <p className="text-xs text-surface-500">Soni: {product.quantity}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-surface-900">To'lov ma'lumotlari</h4>
                    
                    {/* Summary */}
                    <div className="bg-surface-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-surface-600">Jami summa:</span>
                        <span className="font-semibold text-surface-900">{formatNumber(totalAmount)} so'm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-600">To'langan:</span>
                        <span className="font-semibold text-success-600">{formatNumber(paidAmount)} so'm</span>
                      </div>
                      <div className="flex justify-between border-t border-surface-200 pt-2">
                        <span className="text-surface-600">Qarz qoldi:</span>
                        <span className="font-bold text-danger-600">{formatNumber(remainingDebt)} so'm</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                          Qarz summasi *
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={newDebtForm.amount}
                          onChange={e => setNewDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                          To'langan summa
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={newDebtForm.paidAmount}
                          onChange={e => setNewDebtForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                          className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">
                          To'lov muddati *
                        </label>
                        <input
                          type="date"
                          value={newDebtForm.dueDate}
                          onChange={e => setNewDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-2">
                        Izoh
                      </label>
                      <textarea
                        placeholder="Qarz haqida qo'shimcha ma'lumot..."
                        value={newDebtForm.description}
                        onChange={e => setNewDebtForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-2">
                        Garov
                      </label>
                      <input
                        type="text"
                        placeholder="Garov haqida ma'lumot..."
                        value={newDebtForm.collateral}
                        onChange={e => setNewDebtForm(prev => ({ ...prev, collateral: e.target.value }))}
                        className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-200">
              <button
                onClick={() => resetModal()}
                className="px-4 py-2 text-surface-600 hover:text-surface-900 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleNewDebt}
                disabled={!selectedCustomer || totalAmount <= 0 || !newDebtForm.dueDate}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Qarz qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}