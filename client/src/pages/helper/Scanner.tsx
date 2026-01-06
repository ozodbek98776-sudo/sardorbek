import { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Send, Plus, Minus, X, Package, ShoppingCart, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, CartItem } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

export default function HelperScanner() {
  const { showAlert, AlertComponent } = useAlert();
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [sending, setSending] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchProducts();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) { console.error('Error fetching products:', err); }
  };

  const startScanner = async () => {
    setScannedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          const product = products.find(p => p.code === decodedText);
          if (product) setScannedProduct(product);
          else showAlert('Tovar topilmadi: ' + decodedText, 'Xatolik', 'warning');
          stopScanner();
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      showAlert('Kamerani ishga tushirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (err) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setScannedProduct(null);
    if (query.length > 0) {
      const results = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => p._id === product._id ? { ...p, cartQuantity: p.cartQuantity + 1 } : p);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    setSearchQuery('');
    setSearchResults([]);
    setScannedProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item =>
      item._id === id ? { ...item, cartQuantity: Math.max(1, item.cartQuantity + delta) } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const sendToCashier = async () => {
    if (cart.length === 0) return;
    setSending(true);
    try {
      await api.post('/receipts', {
        items: cart.map(item => ({
          product: item._id,
          name: item.name,
          code: item.code,
          price: item.price,
          quantity: item.cartQuantity
        })),
        total
      });
      showAlert("Chek kassirga yuborildi!", 'Muvaffaqiyat', 'success');
      setCart([]);
    } catch (err) {
      console.error('Error sending receipt:', err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setSending(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  return (
    <div className="space-y-4">
      {AlertComponent}
      {/* Search Bar */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tovar qidirish..."
              className="input pl-12"
            />
          </div>
          <button
            onClick={scanning ? stopScanner : startScanner}
            className={`btn-lg ${scanning ? 'btn-secondary' : 'btn-primary'}`}
          >
            <QrCode className="w-5 h-5" />
            {scanning ? 'Stop' : 'QR'}
          </button>
        </div>
      </div>

      {/* QR Scanner */}
      {scanning && (
        <div className="card">
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden max-w-sm mx-auto" />
          <p className="text-center text-sm text-surface-500 mt-3">QR kodni kameraga ko'rsating</p>
        </div>
      )}

      {/* Scanned Product */}
      {scannedProduct && (
        <div className="card bg-success-50 border-success-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-success-700">Tovar topildi!</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-surface-900 text-lg">{scannedProduct.name}</p>
              <p className="text-sm text-surface-500">Kod: {scannedProduct.code}</p>
              <p className="text-sm text-surface-500">Tan narxi: {formatNumber((scannedProduct as any).costPrice || 0)} so'm</p>
              <p className="text-brand-600 font-bold mt-1">Optom: {formatNumber(scannedProduct.price)} so'm</p>
            </div>
            <button onClick={() => addToCart(scannedProduct)} className="btn-success">
              <Plus className="w-4 h-4" />
              Qo'shish
            </button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-surface-100 max-h-64 overflow-auto">
            {searchResults.map(product => (
              <button
                key={product._id}
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-surface-900">{product.name}</p>
                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                  <p className="font-bold text-brand-600">Optom: {formatNumber(product.price)}</p>
                  <p className="text-xs text-surface-400">{product.quantity} dona</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {searchQuery && searchResults.length === 0 && (
        <div className="card text-center py-8 text-surface-500">
          Tovar topilmadi
        </div>
      )}

      {/* Cart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
            <span className="font-semibold text-surface-900">Savat</span>
          </div>
          <span className="badge-primary">{cart.length} ta</span>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-8 h-8 text-surface-300" />
            </div>
            <p className="text-surface-500">Savat bo'sh</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item._id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-surface-900 truncate">{item.name}</p>
                  <p className="text-sm text-brand-600 font-medium">
                    {formatNumber(item.price * item.cartQuantity)} so'm
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-lg border border-surface-200 p-1">
                  <button onClick={() => updateQuantity(item._id, -1)} className="btn-icon-sm">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{item.cartQuantity}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} className="btn-icon-sm">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item._id)} className="btn-icon-sm text-danger-500 hover:bg-danger-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-surface-500">Jami:</span>
              <span className="text-2xl font-bold text-surface-900">{formatNumber(total)} so'm</span>
            </div>
            <button onClick={sendToCashier} disabled={sending} className="btn-primary w-full py-4 text-lg">
              {sending ? (
                <div className="spinner" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Kassaga yuborish
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
