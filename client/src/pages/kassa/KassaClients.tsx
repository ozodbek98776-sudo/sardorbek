import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Users, Phone, Mail, ShoppingBag, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'withDebt' | 'noDebt'>('all');

  useEffect(() => {
    fetchCustomers(true);
    
    const originalHandler = window.onbeforeunload;
    window.onbeforeunload = null;
    
    return () => {
      window.onbeforeunload = originalHandler;
    };
  }, []);

  useEffect(() => {
    fetchCustomers(true);
  }, [location.pathname]);



  useEffect(() => {
    let filtered = customers;
    
    // Qidiruv filtri
    if (clientsSearchQuery.trim() !== '') {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(clientsSearchQuery.toLowerCase()) ||
        customer.phone.includes(clientsSearchQuery)
      );
    }
    
    // Qarz filtri
    if (debtFilter === 'withDebt') {
      filtered = filtered.filter(c => c.debt > 0);
    } else if (debtFilter === 'noDebt') {
      filtered = filtered.filter(c => c.debt === 0);
    }
    
    setFilteredCustomers(filtered);
  }, [customers, clientsSearchQuery, debtFilter]);

  const fetchCustomers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError('');
      const res = await api.get('/customers/kassa');
      
      // Handle wrapped response format
      const customersData = res.data.data || res.data;
      // Ensure customersData is an array before filtering
      const cleanCustomers = Array.isArray(customersData) 
        ? customersData.filter((customer: Customer) => {
            const hasValidName = customer.name && customer.name.trim().length > 0;
            const hasValidPhone = customer.phone && customer.phone.trim().length > 0;
            return hasValidName && hasValidPhone;
          }).map((customer: Customer) => ({
            ...customer,
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            totalPurchases: Number(customer.totalPurchases) || 0,
            debt: Number(customer.debt) || 0
          }))
        : [];
      
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

  // Statistika
  const stats = {
    total: Array.isArray(customers) ? customers.length : 0,
    withDebt: Array.isArray(customers) ? customers.filter(c => c.debt > 0).length : 0,
    totalDebt: Array.isArray(customers) ? customers.reduce((sum, c) => sum + c.debt, 0) : 0,
    totalPurchases: Array.isArray(customers) ? customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0) : 0
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 w-full">
      {AlertComponent}
      
      {/* Sticky Header va Qidiruv */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-1 sm:p-2 space-y-2">
          {/* Statistika Kartalari */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
            <div 
              onClick={() => setDebtFilter('all')}
              className={`p-2 rounded-lg cursor-pointer transition-all ${
                debtFilter === 'all' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium mb-1 ${debtFilter === 'all' ? 'text-white/80' : 'text-slate-500'}`}>
                    Jami mijozlar
                  </p>
                  <p className={`text-2xl font-bold ${debtFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
                    {stats.total}
                  </p>
                </div>
                <Users className={`w-8 h-8 ${debtFilter === 'all' ? 'text-white/80' : 'text-blue-500'}`} />
              </div>
            </div>

            <div 
              onClick={() => setDebtFilter('withDebt')}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                debtFilter === 'withDebt' 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium mb-1 ${debtFilter === 'withDebt' ? 'text-white/80' : 'text-slate-500'}`}>
                    Qarzli mijozlar
                  </p>
                  <p className={`text-2xl font-bold ${debtFilter === 'withDebt' ? 'text-white' : 'text-slate-900'}`}>
                    {stats.withDebt}
                  </p>
                </div>
                <AlertCircle className={`w-8 h-8 ${debtFilter === 'withDebt' ? 'text-white/80' : 'text-red-500'}`} />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Jami qarz</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(stats.totalDebt)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Jami xaridlar</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(stats.totalPurchases)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Qidiruv va Yangilash */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Mijoz ismi yoki telefon raqami..."
                value={clientsSearchQuery}
                onChange={e => setClientsSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              />
              {clientsSearchQuery && (
                <button
                  onClick={() => setClientsSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mijozlar ro'yxati - Scrollable */}
      <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-3 lg:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Mijozlar yuklanmoqda...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-600 font-medium mb-4">{error}</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Users className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">
              {clientsSearchQuery ? 'Mijoz topilmadi' : 'Mijozlar ro\'yxati bo\'sh'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map(customer => (
              <div 
                key={customer._id} 
                className="bg-white rounded-xl p-3 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-lg font-bold text-white">{customer.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {customer.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Mail className="w-2.5 h-2.5" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistika */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <ShoppingBag className="w-3 h-3 text-green-600" />
                      <p className="text-[10px] font-medium text-green-700">Xaridlar</p>
                    </div>
                    <p className="text-sm font-bold text-green-900">
                      {formatNumber(customer.totalPurchases || 0)}
                    </p>
                  </div>

                  <div className={`rounded-lg p-2 ${
                    customer.debt > 0 ? 'bg-red-50' : 'bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <DollarSign className={`w-3 h-3 ${customer.debt > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                      <p className={`text-[10px] font-medium ${customer.debt > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                        Qarz
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${customer.debt > 0 ? 'text-red-900' : 'text-slate-600'}`}>
                      {formatNumber(customer.debt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}