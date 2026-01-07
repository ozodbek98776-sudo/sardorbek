import { useState, useEffect } from 'react';
import { Search, DollarSign, Clock, TrendingUp, AlertTriangle, X, Package, Plus, Minus, User, Edit, Trash2, Eye } from 'lucide-react';
import { Debt, Customer, Product, DebtItem } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

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
  const [showDebtDetailsModal, setShowDebtDetailsModal] = useState(false);
  const [showEditDebtModal, setShowEditDebtModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDebtDetails, setSelectedDebtDetails] = useState<CustomerDebtDetails | null>(null);
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [newDebtForm, setNewDebtForm] = useState({
    paidAmount: '',
    dueDate: ''
  });
  const [editDebtForm, setEditDebtForm] = useState({
    amount: '',
    paidAmount: '',
    dueDate: ''
  });

  useEffect(() => {
    const initializeData = async () => {
      await fetchDebts();
      await fetchCustomers();
      await fetchProducts();
    };

    initializeData();
  }, []);

  const fetchDebts = async () => {
    try {
      const res = await api.get('/debts/kassa');
      
      // Sort debts by due date (earliest first) for better priority display
      const sortedDebts = res.data.sort((a: Debt, b: Debt) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        
        // If due dates are the same, sort by creation date (newest first)
        if (dateA === dateB) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        
        // Sort by due date (earliest first)
        return dateA - dateB;
      });
      
      setDebts(sortedDebts);
    } catch (err) {
      console.error('Error fetching debts:', err);
    }
  };

  const runCleanupOverdueDebts = async () => {
    try {
      setIsCleaningUp(true);
      const res = await api.post('/debts/cleanup-overdue');
      if (res.data.deletedCount > 0) {
        showAlert(`${res.data.deletedCount} ta muddati o'tgan qarz avtomatik o'chirildi`, 'Ma\'lumot', 'success');
        await fetchDebts();
        await fetchCustomers();
        
        // If debt details modal is open, refresh it too
        if (showDebtDetailsModal && selectedDebtDetails) {
          await fetchCustomerDebtDetails(selectedDebtDetails.customer._id);
        }
      } else {
        showAlert('Muddati o\'tgan qarzlar topilmadi', 'Ma\'lumot', 'info');
      }
    } catch (err) {
      console.error('Error running cleanup:', err);
      showAlert('Tozalashda xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setIsCleaningUp(false);
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

  const fetchCustomerDebtDetails = async (customerId: string) => {
    try {
      // Clear previous data first
      setSelectedDebtDetails(null);
      
      const [customerRes, debtsRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/debts/customer/${customerId}`)
      ]);
      
      const customer = customerRes.data;
      const customerDebts = debtsRes.data;
      
      const totalDebt = customerDebts.reduce((sum: number, debt: Debt) => sum + debt.amount, 0);
      const totalPaid = customerDebts.reduce((sum: number, debt: Debt) => sum + debt.paidAmount, 0);
      const remainingDebt = totalDebt - totalPaid;
      
      setSelectedDebtDetails({
        customer,
        debts: customerDebts,
        totalDebt,
        totalPaid,
        remainingDebt
      });
      setShowDebtDetailsModal(true);
    } catch (err) {
      console.error('Error fetching customer debt details:', err);
      showAlert('Mijoz ma\'lumotlarini yuklashda xatolik', 'Xatolik', 'danger');
      // Clear data on error
      setSelectedDebtDetails(null);
      setShowDebtDetailsModal(false);
    }
  };

  const handleViewDebt = (debt: Debt) => {
    // Clear any previous data before fetching new data
    setSelectedDebtDetails(null);
    fetchCustomerDebtDetails(debt.customer._id);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomersModal(false);
    setShowNewDebtModal(true);
    setCustomerSearchQuery('');
  };

  const resetCustomersModal = () => {
    setShowCustomersModal(false);
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
  };

  const totalAmount = debtItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const paidAmount = parseFloat(newDebtForm.paidAmount) || 0;
  const remainingDebt = totalAmount - paidAmount;

  const handleNewDebt = async () => {
    if (!selectedCustomer || debtItems.length === 0 || !newDebtForm.dueDate) {
      showAlert('Barcha majburiy maydonlarni to\'ldiring', 'Xatolik', 'warning');
      return;
    }

    try {
      // Create description with product details
      const productDetails = debtItems.map(item => 
        `${item.product.name} (${item.product.code}) - ${item.quantity} x ${formatNumber(item.price)} = ${formatNumber(item.price * item.quantity)} so'm`
      ).join('\n');
      
      const description = `Mahsulotlar:\n${productDetails}\n\nTo'langan: ${formatNumber(paidAmount)} so'm\nQoldiq: ${formatNumber(remainingDebt)} so'm`;

      const debtData = {
        customer: selectedCustomer._id,
        amount: totalAmount,
        paidAmount: paidAmount,
        dueDate: newDebtForm.dueDate,
        description: description
      };

      const response = await api.post('/debts/kassa', debtData);
      
      // Show appropriate message based on whether it was added to existing debt or created new
      const message = response.data.message || 'Qarz muvaffaqiyatli qo\'shildi!';
      showAlert(message, 'Muvaffaqiyat', 'success');
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
    setNewDebtForm({
      paidAmount: '',
      dueDate: ''
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

  const handleEditDebt = (debt: Debt) => {
    setSelectedDebt(debt);
    setEditDebtForm({
      amount: debt.amount.toString(),
      paidAmount: debt.paidAmount.toString(),
      dueDate: new Date(debt.dueDate).toISOString().split('T')[0]
    });
    setShowEditDebtModal(true);
  };

  const handleDeleteDebt = (debt: Debt) => {
    setDebtToDelete(debt);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteDebt = async () => {
    if (!debtToDelete) return;
    
    try {
      await api.delete(`/debts/kassa/${debtToDelete._id}`);
      showAlert('Qarz muvaffaqiyatli o\'chirildi!', 'Muvaffaqiyat', 'success');
      setShowDeleteConfirmModal(false);
      setDebtToDelete(null);
      
      // Refresh all data
      await fetchDebts();
      await fetchCustomers();
      
      // If debt details modal is open, refresh it too
      if (showDebtDetailsModal && selectedDebtDetails) {
        await fetchCustomerDebtDetails(selectedDebtDetails.customer._id);
      }
    } catch (err) {
      console.error('Error deleting debt:', err);
      showAlert('Qarzni o\'chirishda xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const cancelDeleteDebt = () => {
    setShowDeleteConfirmModal(false);
    setDebtToDelete(null);
  };

  const getDebtStatusColor = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Start of due date
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'text-red-600 bg-red-50'; // Today or overdue
    } else if (diffDays === 1) {
      return 'text-orange-600 bg-orange-50'; // Tomorrow
    } else if (diffDays <= 3) {
      return 'text-yellow-600 bg-yellow-50'; // Due in 2-3 days
    }
    return 'text-surface-500'; // Normal
  };

  const getDebtStatusText = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Start of due date
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} kun kechikdi`;
    } else if (diffDays === 0) {
      return 'Bugun tugaydi';
    } else if (diffDays === 1) {
      return 'Ertaga';
    }
    return new Date(dueDate).toLocaleDateString();
  };

  const handleUpdateDebt = async () => {
    if (!selectedDebt || !editDebtForm.amount || !editDebtForm.dueDate) {
      showAlert('Barcha majburiy maydonlarni to\'ldiring', 'Xatolik', 'warning');
      return;
    }

    try {
      const amount = parseFloat(editDebtForm.amount);
      const paidAmount = parseFloat(editDebtForm.paidAmount) || 0;

      const updateData = {
        amount,
        paidAmount,
        dueDate: editDebtForm.dueDate,
        customer: selectedDebt.customer._id,
        type: 'receivable'
      };

      await api.put(`/debts/kassa/${selectedDebt._id}`, updateData);
      
      showAlert('Qarz muvaffaqiyatli yangilandi!', 'Muvaffaqiyat', 'success');
      setShowEditDebtModal(false);
      setSelectedDebt(null);
      
      // Refresh all data
      await fetchDebts();
      await fetchCustomers();
      
      // If debt details modal is open, refresh it too
      if (showDebtDetailsModal && selectedDebtDetails) {
        await fetchCustomerDebtDetails(selectedDebtDetails.customer._id);
      }
      
    } catch (err) {
      console.error('Error updating debt:', err);
      showAlert('Qarzni yangilashda xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const resetEditModal = () => {
    setShowEditDebtModal(false);
    setSelectedDebt(null);
    setEditDebtForm({
      amount: '',
      paidAmount: '',
      dueDate: ''
    });
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
    <div className="p-3 sm:p-4 lg:p-6">
      {AlertComponent}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900">Qarz daftarcha</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={runCleanupOverdueDebts}
            disabled={isCleaningUp}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto justify-center"
          >
            <Clock className={`w-4 h-4 ${isCleaningUp ? 'animate-spin' : ''}`} />
            <span>{isCleaningUp ? 'Tozalanmoqda...' : 'Tozalash'}</span>
          </button>
          <button
            onClick={() => setShowCustomersModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors w-full sm:w-auto justify-center"
          >
            <DollarSign className="w-4 h-4" />
            <span>Yangi qarz</span>
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-warning-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-surface-500 truncate">Kutilmoqda</p>
              <p className="text-lg sm:text-xl font-bold text-surface-900">
                {debts.filter(d => d.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-surface-500 truncate">To'langan</p>
              <p className="text-lg sm:text-xl font-bold text-surface-900">
                {debts.filter(d => d.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-danger-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-danger-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-surface-500 truncate">Muddati o'tgan</p>
              <p className="text-lg sm:text-xl font-bold text-surface-900">
                {debts.filter(d => d.status === 'overdue').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-surface-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-surface-500 truncate">Jami qarz</p>
              <p className="text-sm sm:text-lg lg:text-xl font-bold text-surface-900 truncate">
                {formatNumber(debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Debts Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-surface-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Mijoz qidirish..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Mijoz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Qarz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Qoldiq</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Muddat</th>
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
                          {debt.customer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-surface-900">{debt.customer.name}</p>
                        <p className="text-sm text-surface-500">{debt.customer.phone}</p>
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
                    <div className={`text-sm px-2 py-1 rounded-lg ${getDebtStatusColor(debt.dueDate)}`}>
                      {getDebtStatusText(debt.dueDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleViewDebt(debt)}
                        className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                        title="Ko'rish"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditDebt(debt)}
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDebt(debt)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-surface-100">
          {debts.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Qarzlar ro'yxati bo'sh</p>
            </div>
          ) : (
            debts.map(debt => (
              <div key={debt._id} className="p-4 hover:bg-surface-50 transition-colors">
                {/* Customer Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-brand-600">
                        {debt.customer.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-surface-900 truncate">{debt.customer.name}</p>
                      <p className="text-sm text-surface-500 truncate">{debt.customer.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-surface-500 mb-1">Jami qarz</p>
                    <p className="font-semibold text-surface-900">{formatNumber(debt.amount)} so'm</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 mb-1">Qoldiq</p>
                    <p className="font-semibold text-danger-600">{formatNumber(debt.amount - debt.paidAmount)} so'm</p>
                  </div>
                </div>

                {/* Date and Action */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-500">Muddat</p>
                    <div className={`text-sm font-medium px-2 py-1 rounded-lg ${getDebtStatusColor(debt.dueDate)}`}>
                      {getDebtStatusText(debt.dueDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleViewDebt(debt)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      title="Ko'rish"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditDebt(debt)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Tahrirlash"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDebt(debt)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Customers Modal */}
      {showCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-surface-900">Mijoz tanlang</h2>
                <button
                  onClick={resetCustomersModal}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Mijoz qidirish..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCustomers.map(customer => (
                    <div
                      key={customer._id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="p-3 sm:p-4 border border-surface-200 rounded-lg hover:bg-surface-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-center">
                            <User className="w-5 h-5 text-brand-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="text-center py-8 text-surface-500">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Mijoz topilmadi</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Debt Modal */}
      {showNewDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-surface-900">Yangi qarz</h2>
                <button
                  onClick={resetModal}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4 sm:space-y-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Mijoz tanlash
                  </label>
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 sm:p-4 border border-surface-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                        </div>
                        <div>
                          <p className="font-medium text-surface-900">{selectedCustomer.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1 hover:bg-surface-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-surface-400" />
                        <input
                          type="text"
                          placeholder="Mijoz qidirish..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {filteredCustomers.slice(0, 5).map(customer => (
                          <div
                            key={customer._id}
                            onClick={() => selectCustomer(customer)}
                            className="p-3 border border-surface-200 rounded-lg hover:bg-surface-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                                <User className="w-4 h-4 text-brand-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-surface-900 truncate">{customer.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Products */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-3">
                    Mahsulotlar qidirish va qo'shish
                  </label>

                  {/* Direct Product Search */}
                  <div className="mb-4 p-3 sm:p-4 border border-surface-200 rounded-lg">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="text"
                        placeholder="Mahsulot nomi yoki kodi bilan qidirish..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    
                    {productSearchQuery && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {filteredProducts.slice(0, 10).map(product => (
                          <div
                            key={product._id}
                            onClick={() => addProduct(product)}
                            className="p-3 border border-surface-200 rounded-lg hover:bg-surface-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Package className="w-5 h-5 text-surface-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-surface-900 truncate">{product.name}</p>
                                  <p className="text-sm text-surface-500 truncate">{product.code}</p>
                                </div>
                              </div>
                              <p className="text-sm font-medium text-surface-900 ml-2">
                                {formatNumber(product.price)} so'm
                              </p>
                            </div>
                          </div>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="text-center py-4 text-surface-500">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Mahsulot topilmadi</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {debtItems.map(item => (
                      <div key={item.product._id} className="p-3 sm:p-4 border border-surface-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Package className="w-5 h-5 text-surface-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-surface-900 truncate">{item.product.name}</p>
                              <p className="text-sm text-surface-500 truncate">{item.product.code}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                                className="p-1 hover:bg-surface-100 rounded-lg transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                className="p-1 hover:bg-surface-100 rounded-lg transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <p className="text-sm font-medium text-surface-900 min-w-0">
                              {formatNumber(item.price * item.quantity)} so'm
                            </p>
                            
                            <button
                              onClick={() => removeProduct(item.product._id)}
                              className="p-1 hover:bg-surface-100 rounded-lg transition-colors text-danger-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      To'langan summa
                    </label>
                    <input
                      type="number"
                      value={newDebtForm.paidAmount}
                      onChange={(e) => setNewDebtForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                      className="w-full px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Muddat
                    </label>
                    <input
                      type="date"
                      value={newDebtForm.dueDate}
                      onChange={(e) => setNewDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Summary */}
                {debtItems.length > 0 && (
                  <div className="p-4 bg-surface-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Jami summa:</span>
                        <span className="font-medium">{formatNumber(totalAmount)} so'm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>To'langan:</span>
                        <span className="font-medium text-success-600">{formatNumber(paidAmount)} so'm</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold border-t border-surface-200 pt-2">
                        <span>Qarz qoldiqi:</span>
                        <span className="text-danger-600">{formatNumber(remainingDebt)} so'm</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-surface-200">
                  <button
                    onClick={resetModal}
                    className="flex-1 px-4 py-2 border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleNewDebt}
                    disabled={!selectedCustomer || debtItems.length === 0 || !newDebtForm.dueDate}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Qarz yaratish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debt Details Modal */}
      {showDebtDetailsModal && selectedDebtDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-surface-900">Qarz tafsilotlari</h2>
                <button
                  onClick={() => {
                    setShowDebtDetailsModal(false);
                    setSelectedDebtDetails(null);
                  }}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4 sm:space-y-6">
                {/* Customer Info */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 sm:w-8 sm:h-8 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-surface-900">
                      {selectedDebtDetails.customer.name}
                    </h3>
                    <p className="text-sm sm:text-base text-surface-500">
                      {selectedDebtDetails.customer.phone}
                    </p>
                  </div>
                </div>

                {/* No Debt Message */}
                {selectedDebtDetails.debts.length === 0 && (
                  <div className="text-center py-8 bg-surface-50 rounded-lg">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 text-surface-300" />
                    <h3 className="text-lg font-semibold text-surface-700 mb-2">
                      Bu mijozning qarzlari yo'q
                    </h3>
                    <p className="text-sm text-surface-500">
                      {selectedDebtDetails.customer.name} hozircha hech qanday qarzga ega emas
                    </p>
                  </div>
                )}

                {/* Debts History - Only show if there are debts */}
                {selectedDebtDetails.debts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-surface-900">Qarzlar tarixi</h4>
                    <div className="space-y-3">
                      {selectedDebtDetails.debts.map(debt => (
                        <div key={debt._id} className="border border-surface-200 rounded-lg overflow-hidden">
                          {/* Debt Header */}
                          <div className="p-3 sm:p-4 bg-surface-50 border-b border-surface-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-surface-900">
                                    {formatNumber(debt.amount)} so'm
                                  </span>
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    debt.status === 'paid' ? 'bg-success-100 text-success-700' :
                                    debt.status === 'overdue' ? 'bg-danger-100 text-danger-700' :
                                    'bg-warning-100 text-warning-700'
                                  }`}>
                                    {debt.status === 'paid' ? 'To\'langan' :
                                     debt.status === 'overdue' ? 'Muddati o\'tgan' : 'Kutilmoqda'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-surface-500">
                                <p>Yaratilgan: {new Date(debt.createdAt).toLocaleDateString()}</p>
                                <p>Muddat: {new Date(debt.dueDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Products List from Description */}
                          {debt.description && (
                            <div className="p-3 sm:p-4">
                              <h5 className="text-sm font-medium text-surface-700 mb-3">Tafsilotlar:</h5>
                              <div className="bg-surface-50 p-3 rounded-lg">
                                <pre className="text-sm text-surface-700 whitespace-pre-wrap font-sans">
                                  {debt.description}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Payment Info */}
                          <div className="p-3 sm:p-4 bg-surface-25 border-t border-surface-200">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-surface-500">Jami:</p>
                                <p className="font-medium text-surface-900">{formatNumber(debt.amount)} so'm</p>
                              </div>
                              <div>
                                <p className="text-surface-500">To'langan:</p>
                                <p className="font-medium text-success-600">{formatNumber(debt.paidAmount)} so'm</p>
                              </div>
                              <div>
                                <p className="text-surface-500">Qoldiq:</p>
                                <p className="font-medium text-danger-600">{formatNumber(debt.amount - debt.paidAmount)} so'm</p>
                              </div>
                              <div>
                                <p className="text-surface-500">Muddat:</p>
                                <p className="font-medium text-surface-900">{new Date(debt.dueDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Debt Modal */}
      {showEditDebtModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-surface-900">Qarzni tahrirlash</h2>
                <button
                  onClick={resetEditModal}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Customer Info (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Mijoz
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                    <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-brand-600">
                        {selectedDebt.customer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{selectedDebt.customer.name}</p>
                      <p className="text-sm text-surface-500">{selectedDebt.customer.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Jami qarz summasi
                  </label>
                  <input
                    type="number"
                    value={editDebtForm.amount}
                    onChange={(e) => setEditDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                {/* Paid Amount */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    To'langan summa
                  </label>
                  <input
                    type="number"
                    value={editDebtForm.paidAmount}
                    onChange={(e) => setEditDebtForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                    placeholder="0"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Muddat
                  </label>
                  <input
                    type="date"
                    value={editDebtForm.dueDate}
                    onChange={(e) => setEditDebtForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Summary */}
                {editDebtForm.amount && (
                  <div className="p-4 bg-surface-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Jami summa:</span>
                        <span className="font-medium">{formatNumber(parseFloat(editDebtForm.amount) || 0)} so'm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>To'langan:</span>
                        <span className="font-medium text-success-600">{formatNumber(parseFloat(editDebtForm.paidAmount) || 0)} so'm</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold border-t border-surface-200 pt-2">
                        <span>Qarz qoldiqi:</span>
                        <span className="text-danger-600">
                          {formatNumber((parseFloat(editDebtForm.amount) || 0) - (parseFloat(editDebtForm.paidAmount) || 0))} so'm
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-surface-200">
                  <button
                    onClick={resetEditModal}
                    className="flex-1 px-4 py-2 border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleUpdateDebt}
                    disabled={!editDebtForm.amount || !editDebtForm.dueDate}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Yangilash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && debtToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-surface-900">Qarzni o'chirish</h2>
                <button
                  onClick={cancelDeleteDebt}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-surface-900 mb-1">
                    Qarzni o'chirishni tasdiqlang
                  </h3>
                  <p className="text-sm text-surface-600">
                    <span className="font-medium">{debtToDelete.customer.name}</span>ning 
                    <span className="font-medium text-danger-600"> {formatNumber(debtToDelete.amount)} so'm</span> qarzini 
                    o'chirishni xohlaysizmi? Bu amalni bekor qilib bo'lmaydi.
                  </p>
                </div>
              </div>

              <div className="bg-surface-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 mb-1">Jami qarz:</p>
                    <p className="font-semibold text-surface-900">{formatNumber(debtToDelete.amount)} so'm</p>
                  </div>
                  <div>
                    <p className="text-surface-500 mb-1">Qoldiq:</p>
                    <p className="font-semibold text-danger-600">{formatNumber(debtToDelete.amount - debtToDelete.paidAmount)} so'm</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-surface-500 mb-1">Muddat:</p>
                    <p className="font-medium text-surface-700">{new Date(debtToDelete.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={cancelDeleteDebt}
                  className="flex-1 px-4 py-2 border border-surface-200 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={confirmDeleteDebt}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Ha, o'chirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}