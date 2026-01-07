import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw, Package } from 'lucide-react';
import { Product } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

export default function KassaProducts() {
  const { showAlert, AlertComponent } = useAlert();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
    
    // Kassa sahifasida beforeunload eventini vaqtincha o'chirish
    const originalHandler = window.onbeforeunload;
    window.onbeforeunload = null;
    
    // Auto-refresh every 30 seconds to get latest data
    const interval = setInterval(fetchProducts, 30000);
    
    return () => {
      window.onbeforeunload = originalHandler;
      clearInterval(interval);
    };
  }, []);

  // Route o'zgarganda ma'lumotlarni yangilash
  useEffect(() => {
    fetchProducts();
  }, [location.pathname]);

  useEffect(() => {
    // Filter products based on search term and warehouse
    let filtered = products;
    
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (warehouseFilter !== 'all') {
      if (warehouseFilter === 'main') {
        filtered = filtered.filter(product => product.isMainWarehouse);
      } else {
        filtered = filtered.filter(product => 
          typeof product.warehouse === 'object' && product.warehouse._id === warehouseFilter
        );
      }
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, warehouseFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Kassa uchun alohida endpoint - token talab qilmaydi
      const res = await api.get('/products/kassa');
      
      if (!res.data || !Array.isArray(res.data)) {
        console.error('Kassa: Noto\'g\'ri server javobi:', res.data);
        setError('Server noto\'g\'ri javob berdi');
        return;
      }
      
      // Filter and clean product data - more strict filtering
      const cleanProducts = res.data.filter((product: Product) => {
        // Juda qisqa nomli tovarlarni o'chirish (2 harfdan kam)
        const hasValidName = product.name && 
          product.name.trim().length > 2 && 
          product.name.trim() !== '';
        
        // Juda uzun kodli tovarlarni o'chirish (25+ belgi)
        const hasValidCode = product.code && 
          product.code.trim() !== '' && 
          product.code.trim().length < 25;
        
        // Narx va miqdor mavjudligi
        const hasValidData = product.price !== undefined && 
          product.quantity !== undefined;
        
        return hasValidName && hasValidCode && hasValidData;
      }).map((product: Product) => ({
        ...product,
        name: product.name.trim(),
        code: product.code.trim(),
        price: Number(product.price) || 0,
        quantity: Number(product.quantity) || 0
      }));
      
      setProducts(cleanProducts);
      console.log(`Kassa: ${res.data.length} ta tovardan ${cleanProducts.length} ta valid tovar yuklandi`);
      
      if (cleanProducts.length === 0 && res.data.length > 0) {
        console.warn('Barcha tovarlar filtrlandi. Birinchi 3 ta tovar:', res.data.slice(0, 3));
      }
    } catch (err: any) {
      console.error('Kassa: Tovarlarni yuklashda xatolik:', err);
      
      if (err.response?.status === 404) {
        setError('Kassa endpoint topilmadi (404)');
      } else if (err.response?.status >= 500) {
        setError('Server xatosi (' + err.response.status + ')');
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Serverga ulanishda xatolik');
      } else {
        setError('Tovarlarni yuklashda xatolik: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('Refresh tugmasi bosildi');
    setIsRefreshing(true);
    try {
      console.log('Ma\'lumotlar yangilanmoqda...');
      await fetchProducts();
      console.log('Ma\'lumotlar muvaffaqiyatli yangilandi');
      showAlert('Ma\'lumotlar yangilandi', 'Muvaffaqiyat', 'success');
    } catch (error) {
      console.error('Refresh xatosi:', error);
      showAlert('Ma\'lumotlarni yangilashda xatolik', 'Xatolik', 'danger');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-3 sm:p-6">
      {AlertComponent}
      
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-surface-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-surface-900">Tovarlar ro'yxati</h2>
              <span className="px-2 py-1 bg-brand-100 text-brand-700 text-xs font-medium rounded-full">
                {filteredProducts.length} ta tovar
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50 w-full sm:w-auto"
              title="Tovarlar ro'yxatini yangilash (F5)"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="sm:inline">{isRefreshing ? 'Yangilanmoqda...' : 'Yangilash'}</span>
            </button>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type="text"
                placeholder="Tovar nomi yoki kodi bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 bg-white"
            >
              <option value="all">Barcha omborlar</option>
              <option value="main">Asosiy ombor</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Products Table - Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Kod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Nomi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Ombor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Narx (so'm)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Miqdor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading && filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Yuklanmoqda...
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                    {searchTerm ? 'Qidiruv bo\'yicha tovar topilmadi' : 'Tovarlar mavjud emas'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product._id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-surface-600 bg-surface-100 px-2 py-1 rounded">
                        {product.code.length > 15 ? `${product.code.substring(0, 15)}...` : product.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-surface-900">
                          {product.name || 'Noma\'lum tovar'}
                        </span>
                        {product.description && (
                          <span className="text-xs text-surface-500 mt-1">{product.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        product.isMainWarehouse 
                          ? 'bg-brand-100 text-brand-700' 
                          : 'bg-surface-100 text-surface-600'
                      }`}>
                        {typeof product.warehouse === 'object' && product.warehouse?.name 
                          ? product.warehouse.name 
                          : 'Asosiy ombor'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-surface-900">
                        {formatNumber(product.price)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${
                        product.quantity > 10 ? 'text-success-600' : 
                        product.quantity > 0 ? 'text-warning-600' : 'text-danger-600'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        product.quantity > 10 
                          ? 'bg-success-100 text-success-700' 
                          : product.quantity > 0 
                          ? 'bg-warning-100 text-warning-700' 
                          : 'bg-danger-100 text-danger-700'
                      }`}>
                        {product.quantity > 10 ? 'Mavjud' : product.quantity > 0 ? 'Kam qoldi' : 'Tugagan'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Products Cards - Mobile & Tablet */}
        <div className="lg:hidden">
          {loading && filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Yuklanmoqda...
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-surface-500">
              {searchTerm ? 'Qidiruv bo\'yicha tovar topilmadi' : 'Tovarlar mavjud emas'}
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredProducts.map(product => (
                <div key={product._id} className="p-4 hover:bg-surface-50 transition-colors">
                  <div className="flex flex-col space-y-3">
                    {/* Product Name and Code */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-surface-900 text-base">
                          {product.name || 'Noma\'lum tovar'}
                        </h3>
                        <span className="font-mono text-sm text-surface-600 bg-surface-100 px-2 py-1 rounded mt-1 inline-block">
                          {product.code.length > 20 ? `${product.code.substring(0, 20)}...` : product.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.quantity > 10 
                            ? 'bg-success-100 text-success-700' 
                            : product.quantity > 0 
                            ? 'bg-warning-100 text-warning-700' 
                            : 'bg-danger-100 text-danger-700'
                        }`}>
                          {product.quantity > 10 ? 'Mavjud' : product.quantity > 0 ? 'Kam qoldi' : 'Tugagan'}
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-surface-500 block">Narx</span>
                        <span className="font-semibold text-surface-900">
                          {formatNumber(product.price)} so'm
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-500 block">Miqdor</span>
                        <span className={`font-medium ${
                          product.quantity > 10 ? 'text-success-600' : 
                          product.quantity > 0 ? 'text-warning-600' : 'text-danger-600'
                        }`}>
                          {product.quantity}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-surface-500 block">Ombor</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.isMainWarehouse 
                            ? 'bg-brand-100 text-brand-700' 
                            : 'bg-surface-100 text-surface-600'
                        }`}>
                          {typeof product.warehouse === 'object' && product.warehouse?.name 
                            ? product.warehouse.name 
                            : 'Asosiy ombor'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div className="pt-2 border-t border-surface-100">
                        <span className="text-xs text-surface-500">{product.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredProducts.length > 0 && (
          <div className="p-3 sm:p-4 bg-surface-50 border-t border-surface-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-surface-600">
              <span>
                Jami: {filteredProducts.length} ta tovar
                {searchTerm && ` (${products.length} tadan filtrlangan)`}
              </span>
              <span className="text-xs">
                Oxirgi yangilanish: {new Date().toLocaleTimeString('uz-UZ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}