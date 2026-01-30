import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Tag, Box, Phone, MapPin, Clock, ChevronRight, Percent, ShoppingBag, Menu, X, Home, ShoppingCart, Users, BarChart3, Settings, Package2, Warehouse, FileText, UserCircle, QrCode } from 'lucide-react';
import axios from 'axios';
import { formatNumber } from '../utils/format';
import { UPLOADS_URL } from '../config/api';

// API URL
const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

interface TierPrice {
  minQuantity: number;
  maxQuantity: number;
  discountPercent: number;
  price: number;
}

interface Product {
  _id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  quantity: number;
  unit?: string;
  images?: (string | { path: string; uploadedBy?: string; uploadedAt?: string })[];
  dimensions?: {
    width?: string;
    height?: string;
    length?: string;
  };
  createdAt?: string;
  warehouse?: {
    name: string;
  };
  tierPrices?: {
    tier1?: TierPrice;
    tier2?: TierPrice;
    tier3?: TierPrice;
  };
}

// O'lchov birligini o'zbek tilida ko'rsatish
const getUnitLabel = (unit?: string, plural?: boolean) => {
  const units: Record<string, { single: string; plural: string }> = {
    dona: { single: 'dona', plural: 'dona' },
    metr: { single: 'metr', plural: 'metr' },
    rulon: { single: 'rulon', plural: 'rulon' },
    karobka: { single: 'quti', plural: 'quti' },
    gram: { single: 'gram', plural: 'gram' },
    kg: { single: 'kg', plural: 'kg' },
    litr: { single: 'litr', plural: 'litr' }
  };
  const u = units[unit || 'dona'] || units.dona;
  return plural ? u.plural : u.single;
};

export default function ProductView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Menu ochilganda body scroll ni to'xtatish
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const fetchProduct = async () => {
    try {
      // Public endpoint - token talab qilmaydi
      const res = await axios.get(`${API_URL}/products/public/${id}`);
      setProduct(res.data);
    } catch (err: any) {
      console.error('Error fetching product:', err);
      setError(err.response?.data?.message || 'Mahsulot topilmadi');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Bosh sahifa', path: '/' },
    { icon: Package2, label: 'Mahsulotlar', path: '/admin/products' },
    { icon: ShoppingCart, label: 'Kassa', path: '/admin/kassa' },
    { icon: Users, label: 'Mijozlar', path: '/admin/customers' },
    { icon: FileText, label: 'Qarzlar', path: '/admin/debts' },
    { icon: Warehouse, label: 'Omborlar', path: '/admin/warehouses' },
    { icon: UserCircle, label: 'Hodimlar', path: '/admin/helpers' },
    { icon: BarChart3, label: 'Statistika', path: '/admin/dashboard' },
    { icon: QrCode, label: 'QR Scanner', path: '/helper/scanner' },
    { icon: Settings, label: 'Sozlamalar', path: '/admin/settings' },
  ];

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
      <div className="min-h-screen bg-gradient-to-b from-surface-100 to-surface-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Package className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-3">Mahsulot topilmadi</h1>
          <p className="text-surface-500 mb-8">{error || 'Bu mahsulot mavjud emas yoki o\'chirilgan'}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl font-semibold hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/30"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }

  // Chegirmali narxlar mavjudligini tekshirish
  const hasTierPrices = product.tierPrices && (product.tierPrices.tier1 || product.tierPrices.tier2 || product.tierPrices.tier3);
  const unitLabel = getUnitLabel(product.unit);

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-100 to-white">
      {/* Header - Mobil uchun optimallashtirilgan */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-surface-200/50 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center hover:bg-surface-200 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-surface-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-surface-900 truncate">{product.name}</h1>
            <p className="text-xs text-surface-500">Kod: {product.code}</p>
          </div>
          <button 
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center hover:bg-brand-600 transition-colors active:scale-95 shadow-lg shadow-brand-500/30"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Hamburger Menu - Slide from right */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl transform transition-transform">
            {/* Menu Header */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <span className="text-xl font-black text-white">SF</span>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Sardor Furnitura</h2>
                    <p className="text-brand-100 text-xs">Mebel furniturasi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="overflow-y-auto h-[calc(100vh-140px)] p-4">
              <div className="space-y-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        navigate(item.path);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface-50 transition-colors group"
                    >
                      <div className="w-11 h-11 bg-surface-100 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-110 transition-all">
                        <Icon className="w-5 h-5 text-surface-600 group-hover:text-brand-600" />
                      </div>
                      <span className="font-medium text-surface-900 group-hover:text-brand-600 transition-colors">
                        {item.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>

              {/* Footer Info */}
              <div className="mt-6 p-4 bg-surface-50 rounded-xl">
                <p className="text-xs text-surface-500 text-center mb-2">
                  QR kod orqali ko'rilmoqda
                </p>
                <p className="text-xs text-surface-400 text-center">
                  {new Date().toLocaleDateString('uz-UZ', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="max-w-lg mx-auto pb-8">
        {/* Product Image - Full width */}
        <div className="relative">
          {product.images && product.images.length > 0 ? (
            <div className="aspect-square bg-white">
              <img 
                src={`${UPLOADS_URL}${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path}`} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-brand-50 via-brand-100 to-indigo-100 flex items-center justify-center">
              <div className="w-24 h-24 bg-white/60 backdrop-blur rounded-3xl flex items-center justify-center shadow-xl">
                <Package className="w-12 h-12 text-brand-500" />
              </div>
            </div>
          )}
          
          {/* Stock Badge - Overlay */}
          <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
            product.quantity > 10 
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white' 
              : product.quantity > 0 
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' 
              : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
          }`}>
            {product.quantity > 0 ? `✓ ${product.quantity} ${unitLabel} mavjud` : '✕ Tugagan'}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 -mt-6 relative z-10 space-y-4">
          {/* Main Info Card */}
          <div className="bg-white rounded-3xl p-5 shadow-xl shadow-surface-200/50">
            {/* Name & Code */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-surface-900 mb-1">{product.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-surface-100 rounded-lg text-xs font-mono text-surface-600">
                  #{product.code}
                </span>
                <span className="px-2.5 py-1 bg-brand-50 text-brand-600 rounded-lg text-xs font-medium">
                  {unitLabel}
                </span>
                {/* O'lchamlar */}
                {product.dimensions && (product.dimensions.width || product.dimensions.height || product.dimensions.length) && (
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium">
                    📐 {[product.dimensions.width, product.dimensions.height, product.dimensions.length].filter(Boolean).join(' × ')}
                  </span>
                )}
              </div>
              {/* Tavsif */}
              {product.description && (
                <p className="mt-3 text-sm text-surface-600 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Main Price */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-4 mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-brand-100 text-sm mb-1">Narxi</p>
                  <p className="text-3xl font-black text-white">{formatNumber(product.price)}</p>
                </div>
                <span className="text-brand-100 text-lg font-medium">so'm/{unitLabel}</span>
              </div>
            </div>

            {/* Tier Prices - Chegirmali narxlar */}
            {hasTierPrices && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Percent className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-surface-900">Chegirmali narxlar</h3>
                </div>
                
                <div className="space-y-2">
                  {product.tierPrices?.tier1 && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900">
                            {product.tierPrices.tier1.minQuantity}–{product.tierPrices.tier1.maxQuantity} {unitLabel}
                          </p>
                          <p className="text-xs text-emerald-600 font-medium">
                            {product.tierPrices.tier1.discountPercent}% chegirma
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600">
                          {formatNumber(product.tierPrices.tier1.price)}
                        </p>
                        <p className="text-xs text-surface-500">so'm/{unitLabel}</p>
                      </div>
                    </div>
                  )}
                  
                  {product.tierPrices?.tier2 && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900">
                            {product.tierPrices.tier2.minQuantity}–{product.tierPrices.tier2.maxQuantity} {unitLabel}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            {product.tierPrices.tier2.discountPercent}% chegirma
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-blue-600">
                          {formatNumber(product.tierPrices.tier2.price)}
                        </p>
                        <p className="text-xs text-surface-500">so'm/{unitLabel}</p>
                      </div>
                    </div>
                  )}
                  
                  {product.tierPrices?.tier3 && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900">
                            {product.tierPrices.tier3.minQuantity}+ {unitLabel}
                          </p>
                          <p className="text-xs text-purple-600 font-medium">
                            {product.tierPrices.tier3.discountPercent}% chegirma
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-purple-600">
                          {formatNumber(product.tierPrices.tier3.price)}
                        </p>
                        <p className="text-xs text-surface-500">so'm/{unitLabel}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="mt-3 text-xs text-surface-400 text-center">
                  💡 Ko'proq olsangiz, arzonroq!
                </p>
              </div>
            )}

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-surface-400 mb-1">
                  <Box className="w-4 h-4" />
                  <span className="text-xs">O'lchov</span>
                </div>
                <p className="font-bold text-surface-900">{unitLabel}</p>
              </div>
              
              <div className="bg-surface-50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-surface-400 mb-1">
                  <Tag className="w-4 h-4" />
                  <span className="text-xs">Kod</span>
                </div>
                <p className="font-bold text-surface-900 font-mono">{product.code}</p>
              </div>
            </div>
          </div>

          {/* Store Info Card */}
          <div className="bg-white rounded-3xl p-5 shadow-lg shadow-surface-200/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                <span className="text-2xl font-black text-white">SF</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-surface-900 text-lg">Sardor Furnitura</h3>
                <p className="text-sm text-surface-500">Mebel furniturasi do'koni</p>
              </div>
              <ChevronRight className="w-5 h-5 text-surface-300" />
            </div>
            
            <div className="mt-4 pt-4 border-t border-surface-100 space-y-3">
              <a href="tel:+998901234567" className="flex items-center gap-3 text-surface-600 hover:text-brand-600 transition-colors">
                <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="font-medium">+998 90 123 45 67</span>
              </a>
              <div className="flex items-center gap-3 text-surface-600">
                <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="font-medium">Toshkent shahri</span>
              </div>
              <div className="flex items-center gap-3 text-surface-600">
                <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-medium">09:00 - 18:00</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-surface-400 pt-4">
            QR kod orqali ko'rilmoqda • {new Date().toLocaleDateString('uz-UZ')}
          </p>
        </div>
      </div>
    </div>
  );
}
