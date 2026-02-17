import React, { useState, useEffect } from 'react';
import * as QRCode from 'qrcode';
import { FRONTEND_URL } from '../config/api';
import { X, Printer, Plus, Minus, Settings } from 'lucide-react';
import { getUnitPrice } from '../utils/pricing';

interface Product {
  _id: string;
  name: string;
  price: number;
  unit?: string;
  prices?: any[];
}

interface BatchQRPrintProps {
  products: Product[];
  onClose: () => void;
}

interface PrintItem {
  product: Product;
  copies: number;
  qrDataUrl: string;
}

const BatchQRPrint: React.FC<BatchQRPrintProps> = ({ products, onClose }) => {
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Label sozlamalari
  const [labelSettings, setLabelSettings] = useState({
    width: 57,    // mm
    height: 41,   // mm
    qrSize: 18,   // mm
    columns: 2,   // Bir qatorda nechta
    showPrice: true,
    showCode: true
  });
  const [showSettings, setShowSettings] = useState(true);

  // Qog'oz o'lchamlari
  const paperSizes = [
    { name: '57mm x 41mm', width: 57, height: 41 },
    { name: '40mm x 30mm', width: 40, height: 30 },
    { name: '50mm x 40mm', width: 50, height: 40 },
    { name: '60mm x 40mm', width: 60, height: 40 },
    { name: '72mm x 130mm', width: 72, height: 130 },
    { name: '100mm x 150mm', width: 100, height: 150 },
    { name: 'A4', width: 210, height: 297 },
  ];

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  useEffect(() => {
    generateAllQRs();
  }, [products]);

  const generateAllQRs = async () => {
    setLoading(true);
    const items: PrintItem[] = [];

    for (const product of products) {
      const productUrl = `${FRONTEND_URL}/product/${product._id}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(productUrl, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#000000', light: '#ffffff' }
        });
        items.push({ product, copies: 1, qrDataUrl });
      } catch (err) {
        console.error('QR error for', product.name, err);
      }
    }

    setPrintItems(items);
    setLoading(false);
  };

  const updateCopies = (index: number, delta: number) => {
    setPrintItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newCopies = Math.max(1, Math.min(100, item.copies + delta));
        return { ...item, copies: newCopies };
      }
      return item;
    }));
  };

  const setCopies = (index: number, value: number) => {
    setPrintItems(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, copies: Math.max(1, Math.min(100, value)) };
      }
      return item;
    }));
  };

  const removeItem = (index: number) => {
    setPrintItems(prev => prev.filter((_, i) => i !== index));
  };

  const setAllCopies = (value: number) => {
    setPrintItems(prev => prev.map(item => ({ ...item, copies: value })));
  };

  const getTotalLabels = () => {
    return printItems.reduce((sum, item) => sum + item.copies, 0);
  };

  const getDiscountInfo = (product: Product) => {
    const prices = (product as any).prices || [];
    const discounts = prices.filter((p: any) => p.type.startsWith('discount'));
    return discounts.sort((a: any, b: any) => a.minQuantity - b.minQuantity);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Popup bloklangan. Iltimos, popup ga ruxsat bering.');
      return;
    }

    // Barcha labellarni yaratish
    let labelsHtml = '';
    printItems.forEach(item => {
      for (let i = 0; i < item.copies; i++) {
        // YANGI NARX TIZIMI - eng yaxshi narxni hisoblash
        const unitPrice = getUnitPrice(item.product);
        const displayPrice = unitPrice || item.product.price || 0;
        
        labelsHtml += `
          <div class="label">
            <div class="label-row-1">
              <div class="qr-code-container">
                <img src="${item.qrDataUrl}" alt="QR" class="qr-code" />
              </div>
              <div class="product-details">
                <div class="product-name">${item.product.name}</div>
              </div>
            </div>
            <div class="label-row-2">
              <div class="product-price">${formatPrice(displayPrice)} so'm</div>
            </div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Labels - Batch Print</title>
        <style>
          @page {
            size: ${labelSettings.width}mm ${labelSettings.height}mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0;
            width: 100%;
          }
          .label {
            width: ${labelSettings.width}mm;
            height: ${labelSettings.height}mm;
            padding: 1mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
            page-break-inside: avoid;
          }
          
          .label-row-1 {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 1mm;
            flex: 1;
            min-height: 0;
          }
          
          .qr-code-container {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .qr-code {
            width: ${labelSettings.qrSize}mm;
            height: ${labelSettings.qrSize}mm;
            display: block;
            image-rendering: pixelated;
          }
          
          .product-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
            gap: 0.1mm;
          }
          
          .product-name {
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            line-height: 1.05;
            word-break: break-word;
            margin: 0;
          }
          
          .product-code {
            font-size: 5.5pt;
            color: #333;
            font-weight: 600;
            margin: 0;
          }
          
          .label-row-2 {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            padding-top: 0.5mm;
          }
          
          .product-price {
            font-size: 15pt;
            font-weight: 900;
            color: #000;
            line-height: 1;
            margin: 0;
          }
          
          @media print {
            body { background: white; margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="labels-container">
          ${labelsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-surface-600">QR kodlar yaratilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <div>
            <h2 className="text-xl font-bold text-surface-900">QR Label Chop Etish</h2>
            <p className="text-sm text-surface-500">
              {printItems.length} ta mahsulot, jami {getTotalLabels()} ta label
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-brand-100 text-brand-600' : 'hover:bg-surface-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-surface-50 border-b border-surface-200">
            <div className="flex justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-2xl">
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Qog'oz o'lchami</label>
                  <select
                    value={`${labelSettings.width}x${labelSettings.height}`}
                    onChange={e => {
                      const selected = paperSizes.find(p => `${p.width}x${p.height}` === e.target.value);
                      if (selected) {
                        setLabelSettings(s => ({ ...s, width: selected.width, height: selected.height }));
                      }
                    }}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  >
                    {paperSizes.map(size => (
                      <option key={`${size.width}x${size.height}`} value={`${size.width}x${size.height}`}>
                        {size.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Eni (mm)</label>
                  <input
                    type="number"
                    value={labelSettings.width}
                    onChange={e => setLabelSettings(s => ({ ...s, width: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Bo'yi (mm)</label>
                  <input
                    type="number"
                    value={labelSettings.height}
                    onChange={e => setLabelSettings(s => ({ ...s, height: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">QR (mm)</label>
                  <input
                    type="number"
                    value={labelSettings.qrSize}
                    onChange={e => setLabelSettings(s => ({ ...s, qrSize: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Ustunlar</label>
                  <input
                    type="number"
                    value={labelSettings.columns}
                    onChange={e => setLabelSettings(s => ({ ...s, columns: Number(e.target.value) }))}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-3 border-b border-surface-200 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-surface-500">Barchasi uchun:</span>
          {[1, 2, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => setAllCopies(n)}
              className="px-3 py-1 text-sm bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
            >
              {n} ta
            </button>
          ))}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-4">
          {printItems.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              Mahsulotlar yo'q
            </div>
          ) : (
            <div className="space-y-2">
              {printItems.map((item, index) => (
                <div 
                  key={item.product._id}
                  className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl"
                >
                  {/* QR Preview */}
                  <img 
                    src={item.qrDataUrl} 
                    alt="QR"
                    className="w-12 h-12 rounded border border-surface-200"
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-surface-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-sm text-surface-500">
                      {formatPrice(item.product.price)} so'm
                    </div>
                  </div>

                  {/* Copies Control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCopies(index, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={item.copies}
                      onChange={e => setCopies(index, Number(e.target.value))}
                      className="w-14 text-center px-2 py-1 border border-surface-200 rounded-lg"
                      min={1}
                      max={100}
                    />
                    <button
                      onClick={() => updateCopies(index, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-200 flex items-center justify-between">
          <div className="text-sm text-surface-500">
            Jami: <span className="font-bold text-surface-900">{getTotalLabels()}</span> ta label
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-xl transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handlePrint}
              disabled={printItems.length === 0}
              className="px-6 py-2 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Chop etish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchQRPrint;
