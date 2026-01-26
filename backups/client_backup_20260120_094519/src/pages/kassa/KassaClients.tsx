import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw } from 'lucide-react';
import { Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

export default function KassaClients() {
  const { showAlert, AlertComponent } = useAlert();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [clientsSearchQuery, setClientsSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers(true); // Dastlabki yuklash uchun loading ko'rsatish
    
    // Kassa sahifasida beforeunload eventini vaqtincha o'chirish
    const originalHandler = window.onbeforeunload;
    window.onbeforeunload = null;
    
    return () => {
      window.onbeforeunload = originalHandler;
    };
  }, []);

  // Route o'zgarganda ma'lumotlarni yangilash
  useEffect(() => {
    fetchCustomers(true); // Route o'zgarganda ham loading ko'rsatish
  }, [location.pathname]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCustomers(false); // Loading ko'rsatmaslik
      showAlert('Ma\'lumotlar yangilandi', 'Muvaffaqiyat', 'success');
    } catch (error) {
      console.error('Refresh xatosi:', error);
      showAlert('Ma\'lumotlarni yangilashda xatolik', 'Xatolik', 'danger');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter customers based on search query
  useEffect(() => {
    if (clientsSearchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(clientsSearchQuery.toLowerCase()) ||
        customer.phone.includes(clientsSearchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, clientsSearchQuery]);

  const fetchCustomers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError('');
      const res = await api.get('/customers/kassa');
      
      // Ma'lumotlarni tozalash va filtrlash
      const cleanCustomers = res.data.filter((customer: Customer) => {
        const hasValidName = customer.name && customer.name.trim().length > 0;
        const hasValidPhone = customer.phone && customer.phone.trim().length > 0;
        return hasValidName && hasValidPhone;
      }).map((customer: Customer) => ({
        ...customer,
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        totalPurchases: Number(customer.totalPurchases) || 0,
        debt: Number(customer.debt) || 0
      }));
      
      setCustomers(cleanCustomers);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError('Mijozlarni yuklashda xatolik yuz berdi');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6">
      {AlertComponent}
      
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Mijoz qidirish..."
                value={clientsSearchQuery}
                onChange={e => setClientsSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </div>
        <div className="divide-y divide-surface-100">
          {loading ? (
            <div className="p-8 text-center text-surface-500">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Mijozlar yuklanmoqda...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-danger-500">
              <p>{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 px-4 py-2 bg-danger-100 text-danger-700 rounded-lg hover:bg-danger-200 transition-colors"
              >
                Qayta urinish
              </button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              {clientsSearchQuery ? 'Mijoz topilmadi' : 'Mijozlar ro\'yxati bo\'sh'}
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer._id} className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-surface-900">{customer.name}</p>
                    <p className="text-sm text-surface-500">{customer.phone}</p>
                    {customer.email && (
                      <p className="text-xs text-surface-400">{customer.email}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-surface-500">Jami xaridlar</p>
                  <p className="font-semibold text-surface-900">{formatNumber(customer.totalPurchases || 0)}</p>
                  {customer.debt > 0 && (
                    <p className="text-xs text-danger-600 font-medium">
                      Qarz: {formatNumber(customer.debt)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}