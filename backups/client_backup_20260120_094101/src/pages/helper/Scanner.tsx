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
          let codeOrId: string | null = null;

          try {
            const parsed = JSON.parse(decodedText);
            if (parsed && typeof parsed === 'object') {
              if (parsed.code) codeOrId = String(parsed.code);
              else if (parsed.id || parsed._id) codeOrId = String(parsed.id || parsed._id);
            }
          } catch (e) {
            // JSON emas, to'g'ridan-to'g'ri kod sifatida ishlatamiz
          }

          const searchKey = codeOrId || decodedText;
          const product = products.find(p => p.code === searchKey || (p as any)._id === searchKey);

          if (product) {
            setScannedProduct(product);
          } else {
            showAlert('Tovar topilmadi: ' + decodedText, 'Xatolik', 'warning');
          }

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
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-surface-50 to-surface-100/80 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm">
      {AlertComponent}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-surface-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-brand-600" />
            Skaner orqali savat to'ldirish
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Tovarlarni QR kod orqali tezda toping, savatga qo'shing va kassaga yuboring.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] gap-6 xl:gap-8 items-start">
        <div className="space-y-4 lg:space-y-5">
          <div className="card p-4 sm:p-5 border border-surface-100 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Nomi yoki kodi bo'yicha qidirish..."
                  className="input pl-12 h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <button
                onClick={scanning ? stopScanner : startScanner}
                className={`btn-lg flex items-center justify-center gap-2 rounded-xl px-4 sm:px-5 ${scanning ? 'btn-secondary' : 'btn-primary'}`}
              >
                <QrCode className="w-5 h-5" />
                <span className="hidden sm:inline">{scanning ? 'Skanerni to‘xtatish' : 'QR skanerni ishga tushirish'}</span>
                <span className="sm:hidden">{scanning ? 'Stop' : 'QR'}</span>
              </button>
            </div>
          </div>

          {scanning && (
            <div className="card border border-brand-100 bg-gradient-to-br from-brand-50/60 to-surface-0 shadow-sm">
              <div className="flex flex-col items-center gap-4 p-4 sm:p-5">
                <div className="relative w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden ring-2 ring-brand-200/70 ring-offset-2 ring-offset-surface-0">
                  <div id="qr-reader" className="w-full aspect-square bg-black/80" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-surface-800">QR kodni kameraga to‘g‘ri tuting</p>
                  <p className="text-xs text-surface-500">Kamera kodni o‘qigach, tovar ma'lumotlari avtomatik chiqadi.</p>
                </div>
              </div>
            </div>
          )}

          {scannedProduct && (
            <div className="card bg-success-50 border-success-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-success-700">Tovar topildi!</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-surface-900 text-lg">{scannedProduct.name}</p>
                  <p className="text-sm text-surface-500">Kod: {scannedProduct.code}</p>
                  <p className="text-sm text-surface-500">Tan narxi: {formatNumber((scannedProduct as any).costPrice || 0)} so'm</p>
                  <p className="text-brand-600 font-bold mt-1">Optom: {formatNumber(scannedProduct.price)} so'm</p>
                  {(
                    (scannedProduct as any).unitPrice ||
                    (scannedProduct as any).boxPrice ||
                    (scannedProduct as any).prices?.perUnit ||
                    (scannedProduct as any).prices?.perBox ||
                    (scannedProduct as any).prices?.perRoll
                  ) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {(scannedProduct as any).prices?.perUnit || (scannedProduct as any).unitPrice || scannedProduct.price ? (
                        <span className="px-3 py-1 rounded-full bg-surface-0 border border-success-200 text-success-700 font-medium">
                          Dona:{' '}
                          {formatNumber(
                            (scannedProduct as any).prices?.perUnit ||
                            (scannedProduct as any).unitPrice ||
                            scannedProduct.price
                          )}{' '}
                          so'm
                        </span>
                      ) : null}
                      {(scannedProduct as any).prices?.perBox || (scannedProduct as any).boxPrice ? (
                        <span className="px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-medium">
                          Karobka:{' '}
                          {formatNumber(
                            (scannedProduct as any).prices?.perBox ||
                            (scannedProduct as any).boxPrice ||
                            0
                          )}{' '}
                          so'm
                        </span>
                      ) : null}
                      {(scannedProduct as any).prices?.perRoll ? (
                        <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-medium">
                          Rulon:{' '}
                          {formatNumber((scannedProduct as any).prices?.perRoll || 0)}{' '}
                          so'm
                        </span>
                      ) : null}
                    </div>
                  )}
                  {(scannedProduct as any).pricingTiers && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {(scannedProduct as any).pricingTiers.tier1 && (
                        <span className="px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                          {(scannedProduct as any).pricingTiers.tier1.minQuantity}-
                          {(scannedProduct as any).pricingTiers.tier1.maxQuantity}
                          : {(scannedProduct as any).pricingTiers.tier1.discountPercent}%
                          {" "}
                          (
                            {formatNumber(
                              Math.round(
                                scannedProduct.price * (1 - (scannedProduct as any).pricingTiers.tier1.discountPercent / 100)
                              )
                            )} so'm
                          )
                        </span>
                      )}
                      {(scannedProduct as any).pricingTiers.tier2 && (
                        <span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 font-medium">
                          {(scannedProduct as any).pricingTiers.tier2.minQuantity}-
                          {(scannedProduct as any).pricingTiers.tier2.maxQuantity}
                          : {(scannedProduct as any).pricingTiers.tier2.discountPercent}%
                          {" "}
                          (
                            {formatNumber(
                              Math.round(
                                scannedProduct.price * (1 - (scannedProduct as any).pricingTiers.tier2.discountPercent / 100)
                              )
                            )} so'm
                          )
                        </span>
                      )}
                      {(scannedProduct as any).pricingTiers.tier3 && (
                        <span className="px-3 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 font-medium">
                          {(scannedProduct as any).pricingTiers.tier3.minQuantity}+
                          : {(scannedProduct as any).pricingTiers.tier3.discountPercent}%
                          {" "}
                          (
                            {formatNumber(
                              Math.round(
                                scannedProduct.price * (1 - (scannedProduct as any).pricingTiers.tier3.discountPercent / 100)
                              )
                            )} so'm
                          )
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => addToCart(scannedProduct)} className="btn-success whitespace-nowrap px-5 py-2.5 rounded-xl text-sm sm:text-base">
                  <Plus className="w-4 h-4" />
                  Qo'shish
                </button>
              </div>
            </div>
          )}

          {searchQuery && searchResults.length > 0 && (
            <div className="card p-0 overflow-hidden border border-surface-100 shadow-sm">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-surface-700">Qidiruv natijalari</p>
                <span className="text-xs text-surface-400">{searchResults.length} ta topildi</span>
              </div>
              <div className="divide-y divide-surface-100 max-h-72 overflow-auto custom-scrollbar">
                {searchResults.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-50/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-surface-500">Kod: {product.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                      <p className="text-sm font-bold text-brand-600">Optom: {formatNumber(product.price)}</p>
                      <p className="text-[11px] text-surface-400">{product.quantity} dona</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="card text-center py-10 bg-surface-0/60 border-dashed border-surface-200">
              <p className="text-sm text-surface-500">Tovar topilmadi. Nomi yoki kodini tekshirib qayta urinib ko'ring.</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4">
          <div className="card border border-surface-100 shadow-md shadow-surface-900/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <span className="font-semibold text-surface-900">Savat</span>
                  <p className="text-xs text-surface-400">Tanlangan tovarlar ro'yxati</p>
                </div>
              </div>
              <span className="badge-primary text-xs px-3 py-1 rounded-full">{cart.length} ta</span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-8 h-8 text-surface-300" />
                </div>
                <p className="text-surface-500 text-sm">Savat bo'sh. QR skaner yoki qidiruv orqali tovar qo'shing.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-auto pr-1 custom-scrollbar">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-surface-400">{formatNumber(item.price)} so'm / dona</p>
                      <p className="text-sm text-brand-600 font-semibold mt-0.5">
                        {formatNumber(item.price * item.cartQuantity)} so'm
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-surface-200 px-1.5 py-1">
                      <button onClick={() => updateQuantity(item._id, -1)} className="btn-icon-sm">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">{item.cartQuantity}</span>
                      <button onClick={() => updateQuantity(item._id, 1)} className="btn-icon-sm">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="btn-icon-sm text-danger-500 hover:bg-danger-50 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-5 pt-4 border-t border-surface-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 text-sm">Jami summa</span>
                  <span className="text-2xl font-bold text-surface-900">{formatNumber(total)} so'm</span>
                </div>
                <button
                  onClick={sendToCashier}
                  disabled={sending}
                  className="btn-primary w-full py-3.5 text-base rounded-xl flex items-center justify-center gap-2"
                >
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
      </div>
    </div>
  );
}
