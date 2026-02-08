import { useState, useEffect } from 'react';
import { X, Package, Plus, Minus, Search, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { formatNumber } from '../utils/format';

interface Product {
  _id: string;
  name: string;
  code: string;
  quantity: number;
  price: number;
  category?: string;
  image?: string;
}

interface SelectedProduct {
  product: string;
  name: string;
  quantity: number;
  price: number;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingExpense: any | null;
  initialData: {
    category: string;
    amount: string;
    description: string;
    date: string;
  };
  onOrderCreated?: () => void; // Buyurtma yaratilganda callback
}

const categoryLabels: Record<string, string> = {
  kommunal: 'Kommunal',
  oylik: 'Ishchi oylik',
  ovqat: 'Ovqat',
  tovar: 'Tovar xaridi',
  boshqa: 'Boshqa'
};

export function ExpenseModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingExpense,
  initialData,
  onOrderCreated
}: ExpenseModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Tovarlar kategoriyasi tanlanganda tovarlarni yuklash
  useEffect(() => {
    if (formData.category === 'tovar' && isOpen) {
      fetchProducts();
    }
  }, [formData.category, isOpen]);

  // Kategoriya o'zgarganda formani tozalash
  useEffect(() => {
    if (formData.category !== 'tovar') {
      setSelectedProducts([]);
    }
  }, [formData.category]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await api.get('/products');
      const productsData = Array.isArray(res.data) ? res.data : [];
      // Barcha tovarlarni ko'rsatish
      setProducts(productsData);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product === product._id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => 
        p.product === product._id 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedProducts(prev => [...prev, {
        product: product._id,
        name: product.name,
        quantity: 1,
        price: product.price
      }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveProduct(productId);
      return;
    }
    setSelectedProducts(prev => prev.map(p => 
      p.product === productId ? { ...p, quantity } : p
    ));
  };

  const calculateTotal = () => {
    if (formData.category === 'tovar') {
      return selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    }
    return parseFloat(formData.amount) || 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      category: formData.category,
      description: formData.description,
      date: formData.date
    };

    if (formData.category === 'tovar') {
      if (selectedProducts.length === 0) {
        alert('Kamida bitta tovar tanlang!');
        return;
      }
      submitData.products = selectedProducts;
      submitData.amount = calculateTotal();
    } else {
      submitData.amount = parseFloat(formData.amount);
    }

    onSubmit(submitData);
  };

  const handleCreateOrder = async () => {
    if (selectedProducts.length === 0) {
      alert('Kamida bitta tovar tanlang!');
      return;
    }

    if (!confirm('Buyurtma yaratilsinmi? Bu tovarlar keyinchalik qabul qilinadi.')) {
      return;
    }

    try {
      setIsCreatingOrder(true);
      const orderData = {
        products: selectedProducts,
        description: formData.description || 'Tovar buyurtmasi'
      };

      await api.post('/product-orders', orderData);
      alert('Buyurtma muvaffaqiyatli yaratildi! Tovarlar sahifasidan qabul qilishingiz mumkin.');
      
      if (onOrderCreated) {
        onOrderCreated();
      }
      
      onClose();
    } catch (err: any) {
      console.error('Error creating order:', err);
      alert(err.response?.data?.message || 'Buyurtma yaratishda xatolik');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" 
        onClick={onClose} 
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h3 className="text-xl lg:text-2xl font-bold text-slate-900">
              {editingExpense ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}
            </h3>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-4">
            {/* Kategoriya */}
            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Kategoriya
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
                required
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Tovar kategoriyasi uchun maxsus UI */}
            {formData.category === 'tovar' ? (
              <>
                {/* Tanlangan tovarlar */}
                {selectedProducts.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-purple-900 mb-2">
                      Tanlangan tovarlar ({selectedProducts.length})
                    </h4>
                    {selectedProducts.map(item => (
                      <div key={item.product} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatNumber(item.price)} so'm × {item.quantity} = {formatNumber(item.price * item.quantity)} so'm
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product, item.quantity - 1)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product, item.quantity + 1)}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(item.product)}
                            className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-purple-200">
                      <p className="text-sm font-bold text-purple-900">
                        Jami: {formatNumber(calculateTotal())} so'm
                      </p>
                    </div>
                  </div>
                )}

                {/* Tovarlar qidiruvi */}
                <div>
                  <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Tovarlar ro'yxati (kam qolgan)
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    </div>
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tovar qidirish..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  
                  {loadingProducts ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-sm text-slate-500 mt-2">Tovarlar yuklanmoqda...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        {productSearchQuery ? 'Tovar topilmadi' : 'Kam qolgan tovarlar yo\'q'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                      {filteredProducts.map(product => {
                        const isSelected = selectedProducts.some(p => p.product === product._id);
                        return (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => handleAddProduct(product)}
                            className={`w-full p-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors ${
                              isSelected ? 'bg-purple-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                                <p className="text-xs text-slate-500">
                                  Kod: {product.code} | Qoldi: {product.quantity} ta
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-purple-600">
                                  {formatNumber(product.price)} so'm
                                </p>
                                {isSelected && (
                                  <span className="text-xs text-purple-600 font-semibold">✓ Tanlangan</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Oddiy kategoriyalar uchun summa kiritish */
              <div>
                <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                  Summa (so'm)
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
                  placeholder="0"
                  required
                  min="0"
                />
              </div>
            )}

            {/* Tavsif */}
            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Tavsif
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base resize-none"
                rows={3}
                placeholder="Xarajat haqida qisqacha ma'lumot..."
                required
              />
            </div>

            {/* Sana */}
            <div>
              <label className="block text-xs lg:text-sm font-semibold text-slate-700 mb-2">
                Sana
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
                required
              />
            </div>

            {/* Jami summa ko'rsatish */}
            {formData.category === 'tovar' && selectedProducts.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-purple-900">Jami xarajat:</span>
                  <span className="text-xl font-bold text-purple-600">
                    {formatNumber(calculateTotal())} so'm
                  </span>
                </div>
              </div>
            )}

            {/* Tugmalar */}
            <div className="space-y-2">
              {/* Tovar kategoriyasi uchun buyurtma tugmasi */}
              {formData.category === 'tovar' && selectedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder}
                  className="w-full px-4 py-2.5 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl transition-all shadow-lg text-sm lg:text-base disabled:opacity-50"
                >
                  {isCreatingOrder ? 'Yuklanmoqda...' : '📦 Buyurtma berish (keyinchalik qabul qilish)'}
                </button>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 lg:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm lg:text-base"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 lg:py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all shadow-lg text-sm lg:text-base"
                >
                  {editingExpense ? 'Saqlash' : 'Qo\'shish'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
