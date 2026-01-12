import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Tag, Box, DollarSign, Calendar, Warehouse } from 'lucide-react';
import api from '../utils/api';
import { formatNumber } from '../utils/format';

interface Product {
  _id: string;
  code: string;
  name: string;
  price: number;
  costPrice?: number;
  quantity: number;
  unit?: string;
  images?: string[];
  createdAt?: string;
  warehouse?: {
    name: string;
  };
}

export default function ProductView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/public/${id}`);
      setProduct(res.data);
    } catch (err: any) {
      console.error('Error fetching product:', err);
      setError(err.response?.data?.message || 'Mahsulot topilmadi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-surface-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">Mahsulot topilmadi</h1>
          <p className="text-surface-600 mb-6">{error || 'Bu mahsulot mavjud emas yoki o\'chirilgan'}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center hover:bg-surface-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700" />
          </button>
          <h1 className="text-lg font-semibold text-surface-900">Mahsulot ma'lumotlari</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Product Image */}
        {product.images && product.images.length > 0 ? (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <img 
              src={product.images[0]} 
              alt={product.name}
              className="w-full h-64 object-cover"
            />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-brand-100 to-brand-200 rounded-2xl h-48 flex items-center justify-center">
            <Package className="w-20 h-20 text-brand-400" />
          </div>
        )}

        {/* Product Info Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-surface-900 mb-1">{product.name}</h2>
              <p className="text-surface-500 font-mono text-sm">Kod: {product.code}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              product.quantity > 10 
                ? 'bg-green-100 text-green-700' 
                : product.quantity > 0 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {product.quantity > 0 ? `${product.quantity} ${product.unit || 'dona'}` : 'Tugagan'}
            </div>
          </div>

          {/* Price */}
          <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-brand-600 mb-1">Narxi</p>
            <p className="text-3xl font-bold text-brand-700">{formatNumber(product.price)} so'm</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Tag className="w-4 h-4" />
                <span className="text-xs">ID</span>
              </div>
              <p className="font-semibold text-surface-900">{product._id.slice(-8)}</p>
            </div>
            
            <div className="bg-surface-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-surface-500 mb-1">
                <Box className="w-4 h-4" />
                <span className="text-xs">O'lchov</span>
              </div>
              <p className="font-semibold text-surface-900">{product.unit || 'dona'}</p>
            </div>
            
            {product.costPrice && (
              <div className="bg-surface-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-surface-500 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Tan narxi</span>
                </div>
                <p className="font-semibold text-surface-900">{formatNumber(product.costPrice)} so'm</p>
              </div>
            )}
            
            {product.warehouse && (
              <div className="bg-surface-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-surface-500 mb-1">
                  <Warehouse className="w-4 h-4" />
                  <span className="text-xs">Ombor</span>
                </div>
                <p className="font-semibold text-surface-900">{product.warehouse.name}</p>
              </div>
            )}
            
            {product.createdAt && (
              <div className="bg-surface-50 rounded-xl p-4 col-span-2">
                <div className="flex items-center gap-2 text-surface-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Qo'shilgan sana</span>
                </div>
                <p className="font-semibold text-surface-900">
                  {new Date(product.createdAt).toLocaleDateString('uz-UZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <h3 className="font-semibold text-surface-900 mb-2">Sardor Furnitura</h3>
          <p className="text-sm text-surface-500">Mebel furniturasi do'koni</p>
        </div>
      </div>
    </div>
  );
}
