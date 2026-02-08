import { useState, useEffect } from 'react';
import { X, Package, CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import api from '../utils/api';
import { formatNumber } from '../utils/format';

interface ProductOrder {
  _id: string;
  products: Array<{
    product: {
      _id: string;
      name: string;
      code: string;
    };
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  description: string;
  status: 'pending' | 'received' | 'cancelled';
  orderDate: string;
  receivedDate?: string;
  createdBy: {
    _id: string;
    name: string;
  };
  receivedBy?: {
    _id: string;
    name: string;
  };
}

interface ProductOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderReceived?: () => void;
}

const statusLabels: Record<string, string> = {
  pending: 'Kutilmoqda',
  received: 'Qabul qilindi',
  cancelled: 'Bekor qilindi'
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function ProductOrdersModal({ isOpen, onClose, onOrderReceived }: ProductOrdersModalProps) {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/product-orders?status=${statusFilter}`);
      const ordersData = res.data.success ? res.data.data : res.data;
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    if (!confirm('Bu buyurtmani qabul qilasizmi? Tovarlar miqdori oshiriladi va xarajatga yoziladi.')) {
      return;
    }

    try {
      await api.post(`/product-orders/${orderId}/receive`);
      alert('Buyurtma muvaffaqiyatli qabul qilindi!');
      fetchOrders();
      if (onOrderReceived) {
        onOrderReceived();
      }
    } catch (err: any) {
      console.error('Error receiving order:', err);
      alert(err.response?.data?.message || 'Buyurtmani qabul qilishda xatolik');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Bu buyurtmani bekor qilasizmi?')) {
      return;
    }

    try {
      await api.post(`/product-orders/${orderId}/cancel`);
      alert('Buyurtma bekor qilindi');
      fetchOrders();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert(err.response?.data?.message || 'Buyurtmani bekor qilishda xatolik');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" 
        onClick={onClose} 
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6" />
              Tovar buyurtmalari
            </h3>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 mb-4">
            {['pending', 'received', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-sm text-slate-500 mt-4">Yuklanmoqda...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Buyurtmalar topilmadi</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order._id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(order.orderDate).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{order.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {order.createdBy.name}
                        </span>
                        {order.receivedBy && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Qabul qildi: {order.receivedBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">
                        {formatNumber(order.totalAmount)} so'm
                      </p>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Tovarlar:</p>
                    <div className="space-y-1">
                      {order.products.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-slate-900">{item.name}</span>
                          <span className="text-slate-600">
                            {item.quantity} ta × {formatNumber(item.price)} = {formatNumber(item.quantity * item.price)} so'm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {order.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReceiveOrder(order._id)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Qabul qilish
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition-colors text-sm flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Bekor qilish
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
