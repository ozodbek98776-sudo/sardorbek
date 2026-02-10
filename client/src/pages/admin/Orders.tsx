import { useState, useEffect } from 'react';
import { ShoppingBag, Package, Clock, Truck, CheckCircle2, XCircle, User } from 'lucide-react';
import { Order } from '../../types';
import api from '../../utils/api';
import { extractArrayFromResponse, safeFilter } from '../../utils/arrayHelpers';
import { useAlert } from '../../hooks/useAlert';
import { LoadingSpinner, EmptyState, Badge, UniversalPageHeader, Card } from '../../components/common';

export default function Orders() {
  const { showAlert, AlertComponent } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      const ordersData = extractArrayFromResponse<Order>(res);
      setOrders(ordersData);
    } catch (err) { 
      console.error('Error fetching orders:', err);
      showAlert('Buyurtmalarni yuklashda xatolik', 'Xatolik', 'danger');
      setOrders([]);
    } finally { 
      setLoading(false); 
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      showAlert('Buyurtma holati yangilandi', 'Muvaffaqiyat', 'success');
      fetchOrders();
    } catch (err) { 
      console.error('Error updating order:', err);
      showAlert('Buyurtma holatini yangilashda xatolik', 'Xatolik', 'danger');
    }
  };

  const statusConfig = {
    new: { color: 'brand', label: 'Yangi', icon: Clock },
    processing: { color: 'warning', label: 'Jarayonda', icon: Package },
    shipped: { color: 'accent', label: "Yo'lda", icon: Truck },
    delivered: { color: 'success', label: 'Yetkazildi', icon: CheckCircle2 },
    cancelled: { color: 'danger', label: 'Bekor qilindi', icon: XCircle },
  };

  const filterOptions = [
    { value: 'all', label: 'Barchasi' },
    ...Object.entries(statusConfig).map(([key, val]) => ({ value: key, label: val.label }))
  ];

  const filteredOrders = safeFilter<Order>(orders, o => filter === 'all' || o.status === filter);

  return (
    <div className="min-h-screen bg-surface-50 w-full h-full">
      {AlertComponent}
      <UniversalPageHeader 
        title="Buyurtmalar"
        subtitle={`${filteredOrders.length} ta buyurtma`}
        icon={ShoppingBag}
        filterOptions={filterOptions}
        filterValue={filter}
        onFilterChange={setFilter}
      />

      <div className="p-3 sm:p-4 lg:p-6 w-full">
        {loading ? (
          <LoadingSpinner size="lg" text="Buyurtmalar yuklanmoqda..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Buyurtmalar topilmadi"
            description="Hozircha buyurtmalar yo'q"
          />
        ) : (
          <Card padding="none">
            <div className="divide-y divide-surface-100">
              {filteredOrders.map(order => {
                const config = statusConfig[order.status as keyof typeof statusConfig];
                const StatusIcon = config.icon;
                return (
                  <div key={order._id} className="p-4 lg:p-6 hover:bg-surface-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-surface-900 truncate">Buyurtma #{order._id.slice(-6)}</h4>
                            <div className="flex items-center gap-2 text-sm text-surface-500 mt-1">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{order.customer?.name || 'Noma\'lum mijoz'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={config.color as any}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            <select
                              value={order.status}
                              onChange={e => updateStatus(order._id, e.target.value)}
                              className="text-xs py-1.5 px-2 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                              {Object.entries(statusConfig).map(([value, cfg]) => (
                                <option key={value} value={value}>{cfg.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-4 text-sm text-surface-500">
                            <span>{order.items.length} ta mahsulot</span>
                            <span>{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</span>
                          </div>
                          <p className="font-bold text-surface-900">{order.total.toLocaleString()} so'm</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
