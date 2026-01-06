import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';

export default function KassaClients() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [clientsSearchQuery, setClientsSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

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

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/kassa');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  return (
    <div className="p-6">
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
          </div>
        </div>
        <div className="divide-y divide-surface-100">
          {filteredCustomers.length === 0 ? (
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