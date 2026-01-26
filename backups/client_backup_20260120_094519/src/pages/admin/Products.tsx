import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { Plus, Minus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Upload, Printer, Ruler, Box, Scale, RotateCcw, BarChart3, Clock, Calendar, TrendingUp, ShoppingCart, CheckSquare } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { FRONTEND_URL } from '../../config/api';
import QRPrintLabel from '../../components/QRPrintLabel';
import BatchQRPrint from '../../components/BatchQRPrint';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
// Rasmlar uchun alohida URL
const UPLOADS_URL = (import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:5000';

// Statistika interfeysi
interface ProductStats {
  product: { _id: string; name: string; code: string; price: number; quantity: number };
  stats: {
    totalSold: number;
    totalRevenue: number;
    totalReceipts: number;
    averagePerSale: number;
    bestDay: { date: string; count: number } | null;
    bestHour: { hour: number; label: string; count: number } | null;
  };
  periodStats: { date: string; count: number; revenue: number }[];
  monthlyStats: { month: string; label: string; count: number; revenue: number }[];
  hourlyStats: { hour: number; label: string; count: number; revenue: number }[];
  recentSales: { date: string; quantity: number; price: number; total: number; customer: any; receiptId: string }[];
}

export default function Products() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBatchQRModal, setShowBatchQRModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<string>('7'); // 7, 30, 90, 365, all
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dollarRate, setDollarRate] = useState(12500); // Dollar kursi (1 dollar = X so'm)
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', quantity: '',
    previousPrice: '', 
    currentPrice: '', // Dona narxi
    costPrice: '', // Tan narxi so'mda
    costPriceInDollar: '', // Tan narxi dollarda
    unitPrice: '', // Dona narxi
    boxPrice: '', // Karobka narxi
    // Foizli chegirmalar
    pricingTiers: {
      tier1: { minQuantity: '1', maxQuantity: '5', discountPercent: '15' },
      tier2: { minQuantity: '6', maxQuantity: '20', discountPercent: '13' },
      tier3: { minQuantity: '21', maxQuantity: '100', discountPercent: '11' }
    },
    unit: 'dona' as 'dona' | 'metr' | 'rulon' | 'karobka' | 'gram' | 'kg' | 'litr',
    // O'lchamlar (sm/mm)
    dimensions: { width: '', height: '', length: '' },
    // Rulon uchun
    metersPerRoll: '', // 1 rulonda necha metr
    // Karobka uchun
    unitsPerBox: '', // 1 karobkada necha dona
    // Metr narxlari (diapazon bo'yicha)
    meterPriceRanges: [{ from: '', to: '', price: '' }] as { from: string; to: string; price: string }[],
    // Narxlar
    pricePerRoll: '',
    pricePerBox: '',
    pricePerKg: '',
    pricePerGram: ''
  });
  const [packageData, setPackageData] = useState({
    packageCount: '', unitsPerPackage: '', totalCost: ''
  });
  const [images, setImages] = useState<string[]>([]);
  const [codeError, setCodeError] = useState('');
  const [showPackageInput, setShowPackageInput] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityMode, setQuantityMode] = useState<'add' | 'subtract'>('add');
  const [quantityInput, setQuantityInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadQR = () => {
    if (!selectedProduct) return;
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${selectedProduct.code}-${selectedProduct.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const checkCodeExists = async (code: string) => {
    if (!code) return;
    try {
      const excludeId = editingProduct?._id || '';
      const res = await api.get(`/products/check-code/${code}${excludeId ? `?excludeId=${excludeId}` : ''}`);
      if (res.data.exists) {
        setCodeError(`Kod "${code}" allaqachon mavjud`);
      } else {
        setCodeError('');
      }
    } catch (err) {
      console.error('Error checking code:', err);
    }
  };

  const printXprinterLabel = (product: Product) => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) {
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>QR - ${product.name}</title>
            <style>
              body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
              img { width: 260px; height: 260px; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  useEffect(() => {
    fetchMainWarehouse();
  }, []);

  useEffect(() => {
    if (mainWarehouse) {
      fetchProducts();
    }
  }, [mainWarehouse]);

  const fetchMainWarehouse = async () => {
    try {
      const res = await api.get('/warehouses');
      const main = res.data.find((w: Warehouse) => w.name === 'Asosiy ombor');
      if (main) {
        setMainWarehouse(main);
      } else {
        const newMain = await api.post('/warehouses', { name: 'Asosiy ombor', address: '' });
        setMainWarehouse(newMain.data);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?mainOnly=true');
      setProducts(res.data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Mahsulotlarni yuklashda xatolik';
      console.error('Error details:', {
        status: err.response?.status,
        message: errorMsg,
        url: err.config?.url
      });
      showAlert(errorMsg, 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = 8 - images.length;
    if (remainingSlots <= 0) {
      showAlert('Maksimum 8 ta rasm yuklash mumkin', 'Ogohlantirish', 'warning');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    const formData = new FormData();
    filesToUpload.forEach(file => formData.append('images', file));

    setUploading(true);
    try {
      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImages([...images, ...res.data.images]);
    } catch (err) {
      console.error('Error uploading images:', err);
      showAlert('Rasmlarni yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = async (imagePath: string) => {
    try {
      await api.delete('/products/delete-image', { data: { imagePath } });
      setImages(images.filter(img => img !== imagePath));
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeError) {
      showAlert(codeError, 'Xatolik', 'danger');
      return;
    }
    
    let finalQuantity = Number(formData.quantity);
    let packageInfo = null;
    
    // If package data is provided, calculate totals
    if (showPackageInput && packageData.packageCount && packageData.unitsPerPackage) {
      const totalUnits = Number(packageData.packageCount) * Number(packageData.unitsPerPackage);
      
      finalQuantity = editingProduct ? Number(formData.quantity) + totalUnits : totalUnits;
      
      packageInfo = {
        packageCount: Number(packageData.packageCount),
        unitsPerPackage: Number(packageData.unitsPerPackage),
        totalUnits: totalUnits
      };
    }

    // Hisoblangan qiymatlar
    let totalMeters = 0;
    let totalUnits = 0;
    if (formData.unit === 'rulon' && formData.metersPerRoll) {
      totalMeters = finalQuantity * Number(formData.metersPerRoll);
    }
    if (formData.unit === 'karobka' && formData.unitsPerBox) {
      totalUnits = finalQuantity * Number(formData.unitsPerBox);
    }
    
    try {
      const data = {
        code: formData.code,
        name: formData.name,
        description: formData.description || '',
        price: Number(formData.unitPrice) || Number(formData.currentPrice),
        costPrice: Number(formData.costPrice) || 0,
        unitPrice: Number(formData.unitPrice) || Number(formData.currentPrice) || 0,
        boxPrice: Number(formData.boxPrice) || 0,
        previousPrice: Number(formData.previousPrice) || 0,
        currentPrice: Number(formData.currentPrice) || 0,
        // Foizli chegirmalar
        pricingTiers: {
          tier1: {
            minQuantity: Number(formData.pricingTiers.tier1.minQuantity) || 1,
            maxQuantity: Number(formData.pricingTiers.tier1.maxQuantity) || 5,
            discountPercent: Number(formData.pricingTiers.tier1.discountPercent) || 15
          },
          tier2: {
            minQuantity: Number(formData.pricingTiers.tier2.minQuantity) || 6,
            maxQuantity: Number(formData.pricingTiers.tier2.maxQuantity) || 20,
            discountPercent: Number(formData.pricingTiers.tier2.discountPercent) || 13
          },
          tier3: {
            minQuantity: Number(formData.pricingTiers.tier3.minQuantity) || 21,
            maxQuantity: Number(formData.pricingTiers.tier3.maxQuantity) || 100,
            discountPercent: Number(formData.pricingTiers.tier3.discountPercent) || 11
          }
        },
        quantity: finalQuantity,
        warehouse: mainWarehouse?._id,
        images,
        packageInfo,
        unit: formData.unit,
        // Dollar narxlari
        costPriceInDollar: Number(formData.costPriceInDollar) || 0,
        dollarRate: dollarRate,
        // O'lchamlar
        dimensions: {
          width: formData.dimensions.width || '',
          height: formData.dimensions.height || '',
          length: formData.dimensions.length || ''
        },
        // Rulon/Karobka sozlamalari
        metersPerRoll: Number(formData.metersPerRoll) || 0,
        unitsPerBox: Number(formData.unitsPerBox) || 0,
        totalMeters,
        totalUnits,
        // Metr narxlari (diapazon)
        meterPriceRanges: formData.meterPriceRanges
          .filter(r => r.from && r.to && r.price)
          .map(r => ({ from: Number(r.from), to: Number(r.to), price: Number(r.price) })),
        prices: {
          perUnit: Number(formData.unitPrice) || Number(formData.currentPrice),
          perRoll: Number(formData.pricePerRoll) || 0,
          perBox: Number(formData.boxPrice) || Number(formData.pricePerBox) || 0,
          perKg: Number(formData.pricePerKg) || 0,
          perGram: Number(formData.pricePerGram) || 0
        }
      };
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, data);
      } else {
        await api.post('/products', data);
      }
      fetchProducts();
      closeModal();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Tovarni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const p = product as any;
    
    // Dollar kursini o'rnatish (agar bo'lmasa default 12500)
    setDollarRate(p.dollarRate || 12500);
    
    setFormData({
      code: product.code,
      name: product.name,
      description: p.description || '',
      previousPrice: String(p.previousPrice || 0),
      currentPrice: String(p.currentPrice || product.price),
      costPrice: String(p.costPrice || 0),
      costPriceInDollar: String(p.costPriceInDollar || 0),
      unitPrice: String(p.unitPrice || p.currentPrice || product.price),
      boxPrice: String(p.boxPrice || 0),
      pricingTiers: {
        tier1: {
          minQuantity: String(p.pricingTiers?.tier1?.minQuantity || 1),
          maxQuantity: String(p.pricingTiers?.tier1?.maxQuantity || 5),
          discountPercent: String(p.pricingTiers?.tier1?.discountPercent || 15)
        },
        tier2: {
          minQuantity: String(p.pricingTiers?.tier2?.minQuantity || 6),
          maxQuantity: String(p.pricingTiers?.tier2?.maxQuantity || 20),
          discountPercent: String(p.pricingTiers?.tier2?.discountPercent || 13)
        },
        tier3: {
          minQuantity: String(p.pricingTiers?.tier3?.minQuantity || 21),
          maxQuantity: String(p.pricingTiers?.tier3?.maxQuantity || 100),
          discountPercent: String(p.pricingTiers?.tier3?.discountPercent || 11)
        }
      },
      quantity: String(product.quantity),
      unit: product.unit || 'dona',
      dimensions: {
        width: p.dimensions?.width || '',
        height: p.dimensions?.height || '',
        length: p.dimensions?.length || ''
      },
      metersPerRoll: String(p.metersPerRoll || ''),
      unitsPerBox: String(p.unitsPerBox || ''),
      meterPriceRanges: p.meterPriceRanges?.length > 0 
        ? p.meterPriceRanges.map((r: any) => ({ from: String(r.from || ''), to: String(r.to || ''), price: String(r.price || '') }))
        : [{ from: '', to: '', price: '' }],
      pricePerRoll: String(product.prices?.perRoll || ''),
      pricePerBox: String(product.prices?.perBox || ''),
      pricePerKg: String(product.prices?.perKg || ''),
      pricePerGram: String(product.prices?.perGram || '')
    });
    setImages(p.images || []);
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
  };

  // Selection funksiyalari
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const openBatchQRPrint = () => {
    if (selectedProducts.size === 0) {
      showAlert('Kamida bitta mahsulot tanlang', 'Ogohlantirish', 'warning');
      return;
    }
    setShowBatchQRModal(true);
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedProducts(new Set());
  };

  // Mahsulot statistikasini ochish
  const openStatsModal = async (product: Product, period: string = '7') => {
    setSelectedProduct(product);
    setShowStatsModal(true);
    setStatsLoading(true);
    setStatsPeriod(period);
    
    try {
      const res = await api.get(`/products/stats/${product._id}?period=${period}`);
      setProductStats(res.data);
    } catch (err) {
      console.error('Error fetching product stats:', err);
      showAlert('Statistikani yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setStatsLoading(false);
    }
  };

  // Davr o'zgarganda statistikani qayta yuklash
  const handlePeriodChange = async (period: string) => {
    if (!selectedProduct) return;
    setStatsPeriod(period);
    setStatsLoading(true);
    
    try {
      const res = await api.get(`/products/stats/${selectedProduct._id}?period=${period}`);
      setProductStats(res.data);
    } catch (err) {
      console.error('Error fetching product stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Print funksiyalari hozircha ishlatilmaydi, keyin qo'shilishi mumkin

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setDollarRate(12500); // Dollar kursini reset qilish
    setFormData({ 
      code: '', name: '', description: '', quantity: '',
      previousPrice: '', currentPrice: '',
      costPrice: '', costPriceInDollar: '', unitPrice: '', boxPrice: '',
      pricingTiers: {
        tier1: { minQuantity: '1', maxQuantity: '5', discountPercent: '15' },
        tier2: { minQuantity: '6', maxQuantity: '20', discountPercent: '13' },
        tier3: { minQuantity: '21', maxQuantity: '100', discountPercent: '11' }
      },
      unit: 'dona',
      dimensions: { width: '', height: '', length: '' },
      metersPerRoll: '',
      unitsPerBox: '',
      meterPriceRanges: [{ from: '', to: '', price: '' }],
      pricePerRoll: '',
      pricePerBox: '',
      pricePerKg: '',
      pricePerGram: ''
    });
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
  };

  const openQuantityModal = (mode: 'add' | 'subtract') => {
    setQuantityMode(mode);
    setQuantityInput('');
    setShowQuantityModal(true);
  };

  const applyQuantityChange = () => {
    const change = Number(quantityInput) || 0;
    if (change <= 0) return;
    
    const currentQty = Number(formData.quantity) || 0;
    let newQty = quantityMode === 'add' ? currentQty + change : currentQty - change;
    if (newQty < 0) newQty = 0;
    
    setFormData({ ...formData, quantity: String(newQty) });
    setShowQuantityModal(false);
    setQuantityInput('');
  };

  const openAddModal = async () => {
    try {
      const res = await api.get('/products/next-code');
      setFormData({ 
        code: res.data.code, name: '', description: '', quantity: '',
        previousPrice: '', currentPrice: '',
        costPrice: '', costPriceInDollar: '', unitPrice: '', boxPrice: '',
        pricingTiers: {
          tier1: { minQuantity: '1', maxQuantity: '5', discountPercent: '15' },
          tier2: { minQuantity: '6', maxQuantity: '20', discountPercent: '13' },
          tier3: { minQuantity: '21', maxQuantity: '100', discountPercent: '11' }
        },
        unit: 'dona',
        dimensions: { width: '', height: '', length: '' },
        metersPerRoll: '',
        unitsPerBox: '',
        meterPriceRanges: [{ from: '', to: '', price: '' }],
        pricePerRoll: '',
        pricePerBox: '',
        pricePerKg: '',
        pricePerGram: ''
      });
    } catch (err) {
      console.error('Error getting next code:', err);
    }
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.quantity <= (p.minStock || 50) && p.quantity > 0).length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
  };

  // ... rest of the code remains the same ...

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && p.quantity <= (p.minStock || 50) && p.quantity > 0) ||
                        (stockFilter === 'out' && p.quantity === 0);
    return matchesSearch && matchesStock;
  });

  const statItems = [
    { label: 'Jami tovarlar', value: stats.total, icon: Package, color: 'brand', filter: 'all' },
    { label: 'Kam qolgan', value: stats.lowStock, icon: AlertTriangle, color: 'warning', filter: 'low' },
    { label: 'Tugagan', value: stats.outOfStock, icon: X, color: 'danger', filter: 'out' },
    { label: 'Jami qiymat', value: `${formatNumber(stats.totalValue)} so'm`, icon: DollarSign, color: 'success', filter: null },
  ];

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      return `${UPLOADS_URL}${product.images[0]}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Tovarlar (Asosiy ombor)"
        showSearch 
        onSearch={setSearchQuery}
        actions={
          <div className="flex items-center gap-2">
            {/* Selection Mode Toggle */}
            {!selectionMode ? (
              <button 
                onClick={() => setSelectionMode(true)} 
                className="btn-secondary"
                title="Bir nechta QR chiqarish"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Tanlash</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={selectAllProducts} 
                  className="btn-secondary text-xs"
                >
                  {selectedProducts.size === filteredProducts.length ? 'Bekor' : 'Barchasi'}
                </button>
                <button 
                  onClick={openBatchQRPrint} 
                  className="btn-primary"
                  disabled={selectedProducts.size === 0}
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">QR ({selectedProducts.size})</span>
                  <span className="sm:hidden">{selectedProducts.size}</span>
                </button>
                <button 
                  onClick={cancelSelection} 
                  className="btn-icon-sm bg-surface-200 hover:bg-surface-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yangi tovar</span>
            </button>
          </div>
        }
      />

      <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`stat-card p-2 sm:p-3 md:p-4 lg:p-6 ${stat.filter ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${
                stockFilter === stat.filter ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1 sm:mb-2 md:mb-3">
                <div className={`stat-icon w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-${stat.color}-50`}>
                  <stat.icon className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-${stat.color}-600`} />
                </div>
              </div>
              <p className="stat-value text-sm sm:text-base md:text-xl lg:text-3xl">{stat.value}</p>
              <p className="stat-label text-[10px] sm:text-xs md:text-sm lg:text-base">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8 mb-4" />
              <p className="text-surface-500">Yuklanmoqda...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Tovarlar topilmadi</h3>
              <p className="text-surface-500 text-center max-w-md mb-6">
                {searchQuery ? 'Qidiruv bo\'yicha tovarlar topilmadi' : 'Birinchi tovarni qo\'shing'}
              </p>
              <button onClick={openAddModal} className="btn-primary">Tovar qo'shish</button>
            </div>
          ) : (
            <>
              {/* Pro Design Cards - barcha ekranlar uchun */}
              <div className="grid 2xs:grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5 p-2 sm:p-3 md:p-4 lg:p-5">
                {filteredProducts.map(product => {
                  const unit = product.unit || 'dona';
                  const getUnitLabel = (u?: string) => {
                    switch (u) {
                      case 'metr': return 'm';
                      case 'rulon': return 'rulon';
                      case 'karobka': return 'quti';
                      case 'gram': return 'g';
                      case 'kg': return 'kg';
                      case 'litr': return 'L';
                      default: return 'dona';
                    }
                  };
                  const stockStatus = product.quantity === 0 ? 'danger' : product.quantity <= (product.minStock || 50) ? 'warning' : 'success';
                  const isSelected = selectedProducts.has(product._id);
                  
                  return (
                    <div 
                      key={product._id} 
                      className={`bg-white rounded-xl sm:rounded-2xl border-2 hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer ${
                        isSelected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-surface-200 hover:border-brand-300'
                      }`}
                      onClick={() => selectionMode ? toggleProductSelection(product._id) : openStatsModal(product)}
                    >
                      {/* Image Section */}
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-surface-100 to-surface-50 overflow-hidden">
                        {/* Selection Checkbox */}
                        {selectionMode && (
                          <div 
                            className={`absolute top-2 left-2 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-brand-500 text-white shadow-lg' 
                                : 'bg-white/90 backdrop-blur border-2 border-surface-300'
                            }`}
                            onClick={(e) => { e.stopPropagation(); toggleProductSelection(product._id); }}
                          >
                            {isSelected && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)!} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-50">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/80 backdrop-blur rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-brand-500" />
                            </div>
                          </div>
                        )}
                        
                        {/* Stock Badge */}
                        <div className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 md:top-3 md:left-3 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg ${
                          stockStatus === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' : 
                          stockStatus === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white' : 
                          'bg-gradient-to-r from-emerald-400 to-green-500 text-white'
                        }`}>
                          <span className="hidden sm:inline">{stockStatus === 'danger' ? '❌ Tugagan' : stockStatus === 'warning' ? '⚠️ Kam' : '✓ Mavjud'}</span>
                          <span className="sm:hidden">{stockStatus === 'danger' ? '❌' : stockStatus === 'warning' ? '⚠️' : '✓'}</span>
                        </div>

                        {/* Code Badge */}
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-3 md:right-3 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 bg-black/70 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-mono text-white font-bold shadow-lg">
                          #{product.code}
                        </div>

                        {/* Quick Actions - Hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 md:p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openQRModal(product); }} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-brand-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(product); }} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-amber-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-red-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-2 sm:p-3 md:p-4">
                        {/* Name */}
                        <h3 className="font-bold text-surface-900 text-xs sm:text-sm md:text-base mb-1.5 sm:mb-2 md:mb-3 line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem] md:min-h-[2.5rem] group-hover:text-brand-700 transition-colors">
                          {product.name}
                        </h3>

                        {/* Quantity with Unit */}
                        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3 flex-wrap">
                          <div className={`flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-semibold ${
                            stockStatus === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' : 
                            stockStatus === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {unit === 'metr' || unit === 'rulon' ? <Ruler className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> :
                             unit === 'karobka' ? <Box className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> :
                             unit === 'gram' || unit === 'kg' ? <Scale className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" /> :
                             <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5" />}
                            <span>{product.quantity} {getUnitLabel(unit)}</span>
                          </div>
                          
                          {/* Rulon uchun - metr ko'rsatish */}
                          {unit === 'rulon' && (product as any).metersPerRoll > 0 && (
                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 md:py-1.5 bg-purple-50 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs text-purple-700 font-semibold border border-purple-200">
                              <RotateCcw className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                              <span>= {formatNumber(product.quantity * (product as any).metersPerRoll)} m</span>
                            </div>
                          )}
                          
                          {/* Karobka uchun - dona ko'rsatish */}
                          {unit === 'karobka' && (product as any).unitsPerBox > 0 && (
                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 md:py-1.5 bg-orange-50 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs text-orange-700 font-semibold border border-orange-200">
                              <RotateCcw className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                              <span>= {formatNumber(product.quantity * (product as any).unitsPerBox)} dona</span>
                            </div>
                          )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3">
                          <div className="bg-gradient-to-br from-surface-50 to-surface-100 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 border border-surface-200">
                            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-surface-500 uppercase tracking-wider font-semibold mb-0.5">Tan narxi</p>
                            <p className="font-bold text-surface-900 text-[10px] sm:text-xs md:text-sm">
                              {formatNumber((product as any).costPrice || 0)}
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] text-surface-400 ml-0.5">so'm</span>
                            </p>
                            {(product as any).costPriceInDollar > 0 && (
                              <p className="text-[8px] sm:text-[9px] text-surface-500 mt-0.5">
                                ≈ ${formatNumber((product as any).costPriceInDollar)}
                              </p>
                            )}
                          </div>
                          <div className="bg-gradient-to-br from-brand-50 to-indigo-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 border border-brand-200">
                            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-brand-600 uppercase tracking-wider font-semibold mb-0.5">Dona narxi</p>
                            <p className="font-bold text-brand-700 text-[10px] sm:text-xs md:text-sm">
                              {formatNumber((product as any).unitPrice || product.price)}
                              <span className="text-[8px] sm:text-[9px] md:text-[10px] text-brand-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                        </div>

                        {/* Karobka narxi */}
                        {(product as any).boxPrice > 0 && (
                          <div className="mb-1.5 sm:mb-2 md:mb-3">
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg sm:rounded-xl p-1.5 sm:p-2 md:p-3 border border-orange-200">
                              <p className="text-[8px] sm:text-[9px] md:text-[10px] text-orange-600 uppercase tracking-wider font-semibold mb-0.5">Karobka narxi</p>
                              <p className="font-bold text-orange-700 text-[10px] sm:text-xs md:text-sm">
                                {formatNumber((product as any).boxPrice)}
                                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-orange-400 ml-0.5">so'm</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Chegirma darajalari */}
                        {(product as any).pricingTiers && (
                          <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2">
                            {(product as any).pricingTiers.tier1?.discountPercent > 0 && (
                              <span className="px-1 sm:px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[8px] sm:text-[9px] font-semibold border border-emerald-200">
                                {(product as any).pricingTiers.tier1.minQuantity}-{(product as any).pricingTiers.tier1.maxQuantity}: {(product as any).pricingTiers.tier1.discountPercent}%
                              </span>
                            )}
                            {(product as any).pricingTiers.tier2?.discountPercent > 0 && (
                              <span className="px-1 sm:px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] sm:text-[9px] font-semibold border border-blue-200">
                                {(product as any).pricingTiers.tier2.minQuantity}-{(product as any).pricingTiers.tier2.maxQuantity}: {(product as any).pricingTiers.tier2.discountPercent}%
                              </span>
                            )}
                            {(product as any).pricingTiers.tier3?.discountPercent > 0 && (
                              <span className="px-1 sm:px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[8px] sm:text-[9px] font-semibold border border-purple-200">
                                {(product as any).pricingTiers.tier3.minQuantity}+: {(product as any).pricingTiers.tier3.discountPercent}%
                              </span>
                            )}
                          </div>
                        )}

                        {/* Additional Prices */}
                        {product.prices && (product.prices.perMeter > 0 || product.prices.perRoll > 0 || product.prices.perBox > 0 || product.prices.perKg > 0) && (
                          <div className="flex flex-wrap gap-1 pt-1.5 sm:pt-2 border-t border-surface-100">
                            {product.prices.perMeter > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-blue-200">
                                📏 {formatNumber(product.prices.perMeter)}/m
                              </span>
                            )}
                            {product.prices.perRoll > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-purple-200">
                                🎞️ {formatNumber(product.prices.perRoll)}/rulon
                              </span>
                            )}
                            {product.prices.perBox > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-orange-50 text-orange-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-orange-200">
                                📦 {formatNumber(product.prices.perBox)}/quti
                              </span>
                            )}
                            {product.prices.perKg > 0 && (
                              <span className="px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 bg-green-50 text-green-700 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-semibold border border-green-200">
                                ⚖️ {formatNumber(product.prices.perKg)}/kg
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full max-w-lg p-6 relative z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">{editingProduct ? 'Tovarni tahrirlash' : 'Yangi tovar'}</h3>
              <button onClick={closeModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Rasmlar (max 8)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={`${UPLOADS_URL}${img}`} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {images.length < 8 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square border-2 border-dashed border-surface-300 rounded-lg flex flex-col items-center justify-center hover:border-brand-500 hover:bg-brand-50 transition-colors"
                    >
                      {uploading ? (
                        <div className="spinner w-5 h-5 text-brand-600" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-surface-400 mb-1" />
                          <span className="text-xs text-surface-500">Yuklash</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Kod va Nomi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Kod</label>
                  <input 
                    type="text" 
                    className={`input ${codeError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}`}
                    placeholder="1" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    onBlur={e => checkCodeExists(e.target.value)}
                    required 
                  />
                  {codeError && <p className="text-sm text-danger-600 mt-1">{codeError}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Nomi</label>
                  <input type="text" className="input" placeholder="Tovar nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              </div>

              {/* Tavsif */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Qisqacha tavsif (ixtiyoriy)</label>
                <textarea 
                  className="input min-h-[80px] resize-none" 
                  placeholder="Mahsulot haqida qisqacha ma'lumot..."
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  maxLength={500}
                />
                <p className="text-xs text-surface-400 mt-1">{(formData.description || '').length}/500</p>
              </div>

              {/* O'lchamlar (sm/mm) */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-600" />
                  O'lchamlar (ixtiyoriy)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Eni (sm)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="50"
                      value={formData.dimensions.width}
                      onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, width: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Bo'yi (mm)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="30"
                      value={formData.dimensions.height}
                      onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, height: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Uzunligi (sm)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="100"
                      value={formData.dimensions.length}
                      onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, length: e.target.value}})}
                    />
                  </div>
                </div>
              </div>

              {/* O'lchov birligi va Miqdor */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-600" />
                  O'lchov birligi va Miqdor
                </h4>
                
                {/* Birlik tanlash va miqdor kiritish - yon-yoniga */}
                <div className="flex gap-3 mb-4">
                  <div className="w-1/3">
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Birlik</label>
                    <select 
                      className="input"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                    >
                      <option value="dona">Dona</option>
                      <option value="metr">Metr</option>
                      <option value="rulon">Rulon</option>
                      <option value="karobka">Karobka</option>
                      <option value="kg">Kilogram</option>
                      <option value="gram">Gram</option>
                      <option value="litr">Litr</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-surface-600 mb-1 block">
                      Miqdor ({formData.unit === 'dona' ? 'dona' : formData.unit === 'metr' ? 'metr' : formData.unit === 'rulon' ? 'rulon' : formData.unit === 'karobka' ? 'karobka' : formData.unit === 'kg' ? 'kg' : formData.unit === 'gram' ? 'gram' : 'litr'})
                    </label>
                    {editingProduct ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-surface-100 rounded-lg text-center font-semibold text-surface-900">
                          {formatNumber(formData.quantity || 0)}
                        </div>
                        <button type="button" onClick={() => openQuantityModal('add')} className="btn-icon-sm bg-success-100 text-success-600 hover:bg-success-200">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => openQuantityModal('subtract')} className="btn-icon-sm bg-danger-100 text-danger-600 hover:bg-danger-200">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="0" 
                        value={formatInputNumber(formData.quantity)} 
                        onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})} 
                        required 
                      />
                    )}
                  </div>
                </div>

                {/* Metr tanlanganda - Rulon sozlamalari */}
                {formData.unit === 'metr' && (
                  <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 mb-1 block">🎞️ 1 rulonda necha metr?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="30"
                          value={formData.metersPerRoll}
                          onChange={e => setFormData({...formData, metersPerRoll: parseNumber(e.target.value)})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 mb-1 block">Rulon narxi (so'm)</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="0"
                          value={formatInputNumber(formData.pricePerRoll)}
                          onChange={e => setFormData({...formData, pricePerRoll: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.metersPerRoll && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">
                          {formData.quantity} metr = {(Number(formData.quantity) / Number(formData.metersPerRoll)).toFixed(1)} rulon
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Dona tanlanganda - Karobka sozlamalari */}
                {formData.unit === 'dona' && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 border border-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-orange-700 mb-1 block">📦 1 karobkada necha dona?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="12"
                          value={formData.unitsPerBox}
                          onChange={e => setFormData({...formData, unitsPerBox: parseNumber(e.target.value)})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-orange-700 mb-1 block">Karobka narxi (so'm)</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="0"
                          value={formatInputNumber(formData.pricePerBox)}
                          onChange={e => setFormData({...formData, pricePerBox: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.unitsPerBox && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-700">
                          {formData.quantity} dona = {(Number(formData.quantity) / Number(formData.unitsPerBox)).toFixed(1)} karobka
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rulon tanlanganda - 1 rulonda necha metr */}
                {formData.unit === 'rulon' && (
                  <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 mb-1 block">1 rulonda necha metr?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="30"
                          value={formData.metersPerRoll}
                          onChange={e => setFormData({...formData, metersPerRoll: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.metersPerRoll && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">
                          {formData.quantity} rulon = {formatNumber(Number(formData.quantity) * Number(formData.metersPerRoll))} metr
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Karobka tanlanganda - 1 karobkada necha dona */}
                {formData.unit === 'karobka' && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 border border-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-orange-700 mb-1 block">1 karobkada necha dona?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="12"
                          value={formData.unitsPerBox}
                          onChange={e => setFormData({...formData, unitsPerBox: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.unitsPerBox && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-700">
                          {formData.quantity} karobka = {formatNumber(Number(formData.quantity) * Number(formData.unitsPerBox))} dona
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Narxlar */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Narxlar (5 ta)
                </h4>
                
                {/* Tan narxi va Dona narxi */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">💵 Tan narxi (Dollar)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        className="input flex-1" 
                        placeholder="0"
                        step="0.1"
                        min="0"
                        value={formData.costPriceInDollar}
                        onChange={e => {
                          const dollarPrice = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData, 
                            costPriceInDollar: dollarPrice.toString(),
                            costPrice: (dollarPrice * dollarRate).toString()
                          });
                        }}
                      />
                      <span className="text-xs font-bold text-surface-600 flex items-center px-2 bg-surface-100 rounded">$</span>
                    </div>
                    <p className="text-[10px] text-surface-500 mt-1">
                      = {formatNumber((parseFloat(formData.costPriceInDollar) || 0) * dollarRate)} so'm
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">🏷️ Dona narxi (so'm)</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="0"
                      value={formatInputNumber(formData.unitPrice)}
                      onChange={e => setFormData({...formData, unitPrice: parseNumber(e.target.value)})}
                      required
                    />
                  </div>
                </div>

                {/* Dollar kursi sozlash */}
                <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                  <label className="text-xs font-medium text-blue-700 mb-1 block">💱 Dollar kursi (1 $ = ? so'm)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="12500"
                    step="1"
                    min="0"
                    value={dollarRate}
                    onChange={e => setDollarRate(parseFloat(e.target.value) || 12500)}
                  />
                  <p className="text-[10px] text-blue-600 mt-1">Hozirgi kurs: 1 $ = {formatNumber(dollarRate)} so'm</p>
                </div>

                {/* Karobka narxi */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-surface-600 mb-1 block">📦 Karobka narxi (so'm)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="0"
                    value={formatInputNumber(formData.boxPrice)}
                    onChange={e => setFormData({...formData, boxPrice: parseNumber(e.target.value)})}
                  />
                </div>

                {/* Foizli chegirmalar - 3 ta daraja */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                  <h5 className="text-xs font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                    🎯 Foizli chegirmalar (miqdorga qarab)
                  </h5>
                  
                  {/* Tier 1 */}
                  <div className="bg-white rounded-lg p-3 mb-2 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">1-daraja</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
                        placeholder="1"
                        value={formData.pricingTiers.tier1.minQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier1: {...formData.pricingTiers.tier1, minQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs text-emerald-600">dan</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
                        placeholder="5"
                        value={formData.pricingTiers.tier1.maxQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier1: {...formData.pricingTiers.tier1, maxQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs text-emerald-600">gacha</span>
                      <span className="text-xs text-emerald-600 mx-1">=</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center font-bold" 
                        placeholder="15"
                        value={formData.pricingTiers.tier1.discountPercent}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier1: {...formData.pricingTiers.tier1, discountPercent: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs font-bold text-emerald-700">%</span>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="bg-white rounded-lg p-3 mb-2 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">2-daraja</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
                        placeholder="6"
                        value={formData.pricingTiers.tier2.minQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier2: {...formData.pricingTiers.tier2, minQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs text-blue-600">dan</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
                        placeholder="20"
                        value={formData.pricingTiers.tier2.maxQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier2: {...formData.pricingTiers.tier2, maxQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs text-blue-600">gacha</span>
                      <span className="text-xs text-blue-600 mx-1">=</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center font-bold" 
                        placeholder="13"
                        value={formData.pricingTiers.tier2.discountPercent}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier2: {...formData.pricingTiers.tier2, discountPercent: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs font-bold text-blue-700">%</span>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">3-daraja</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
                        placeholder="21"
                        value={formData.pricingTiers.tier3.minQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier3: {...formData.pricingTiers.tier3, minQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs text-purple-600">dan</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
                        placeholder="100"
                        value={formData.pricingTiers.tier3.maxQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier3: {...formData.pricingTiers.tier3, maxQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs text-purple-600">gacha</span>
                      <span className="text-xs text-purple-600 mx-1">=</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center font-bold" 
                        placeholder="11"
                        value={formData.pricingTiers.tier3.discountPercent}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier3: {...formData.pricingTiers.tier3, discountPercent: e.target.value}
                          }
                        })}
                      />
                      <span className="text-xs font-bold text-purple-700">%</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-600 mt-2 italic">
                    * Masalan: 1-5 dona = 15% chegirma, 6-20 dona = 13% chegirma, 21-100 dona = 11% chegirma
                  </p>
                </div>
                
                {/* Asosiy narx - birlikka qarab (eski) */}
                <div className="mt-4 mb-4 hidden">
                  <label className="text-xs font-medium text-surface-600 mb-1 block">
                    {formData.unit === 'metr' ? '📏 Metr narxi' : 
                     formData.unit === 'rulon' ? '🎞️ Rulon narxi' : 
                     formData.unit === 'karobka' ? '📦 Karobka narxi' : 
                     formData.unit === 'kg' ? '⚖️ Kg narxi' : 
                     formData.unit === 'gram' ? '⚖️ Gram narxi' : 
                     formData.unit === 'litr' ? '💧 Litr narxi' : 
                     '💰 Dona narxi'} (so'm)
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="0"
                    value={formatInputNumber(formData.currentPrice)}
                    onChange={e => setFormData({...formData, currentPrice: parseNumber(e.target.value)})}
                  />
                </div>

                {/* Metr narxi - diapazon bo'yicha */}
                {(formData.unit === 'metr' || formData.unit === 'rulon') && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-200">
                    <label className="text-xs font-medium text-blue-700 mb-2 block">📏 Metr narxlari (diapazon bo'yicha)</label>
                    {formData.meterPriceRanges.map((range, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input 
                          type="text" 
                          className="input text-sm w-16" 
                          placeholder="1"
                          value={range.from}
                          onChange={e => {
                            const newRanges = [...formData.meterPriceRanges];
                            newRanges[idx].from = e.target.value;
                            setFormData({...formData, meterPriceRanges: newRanges});
                          }}
                        />
                        <span className="text-xs text-blue-600">dan</span>
                        <input 
                          type="text" 
                          className="input text-sm w-16" 
                          placeholder="10"
                          value={range.to}
                          onChange={e => {
                            const newRanges = [...formData.meterPriceRanges];
                            newRanges[idx].to = e.target.value;
                            setFormData({...formData, meterPriceRanges: newRanges});
                          }}
                        />
                        <span className="text-xs text-blue-600">gacha</span>
                        <input 
                          type="text" 
                          className="input text-sm flex-1" 
                          placeholder="Narx"
                          value={formatInputNumber(range.price)}
                          onChange={e => {
                            const newRanges = [...formData.meterPriceRanges];
                            newRanges[idx].price = parseNumber(e.target.value);
                            setFormData({...formData, meterPriceRanges: newRanges});
                          }}
                        />
                        <span className="text-xs text-blue-600">so'm</span>
                        {formData.meterPriceRanges.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => {
                              const newRanges = formData.meterPriceRanges.filter((_, i) => i !== idx);
                              setFormData({...formData, meterPriceRanges: newRanges});
                            }}
                            className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center hover:bg-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setFormData({
                        ...formData, 
                        meterPriceRanges: [...formData.meterPriceRanges, { from: '', to: '', price: '' }]
                      })}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Diapazon qo'shish
                    </button>
                  </div>
                )}

                {/* Kg narxi */}
                {formData.unit === 'kg' && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-surface-600 mb-1 block">⚖️ Kg narxi (so'm)</label>
                    <input 
                      type="text" 
                      className="input text-sm" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerKg)}
                      onChange={e => setFormData({...formData, pricePerKg: parseNumber(e.target.value)})}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1" disabled={!!codeError}>Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="overlay -z-10" onClick={() => setShowQRModal(false)} />
          <div className="modal w-full sm:w-auto max-w-md relative z-10 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 -mt-2 pt-2 border-b border-surface-100">
              <h3 className="text-lg font-semibold text-surface-900">QR Label - Xprinter</h3>
              <button onClick={() => setShowQRModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex flex-col items-center">
              {/* QRPrintLabel komponenti */}
              <QRPrintLabel
                productId={selectedProduct._id}
                code={selectedProduct.code}
                name={selectedProduct.name}
                price={selectedProduct.price}
                unit={selectedProduct.unit}
                dimensions={
                  (selectedProduct as any).dimensions 
                    ? [
                        (selectedProduct as any).dimensions.width,
                        (selectedProduct as any).dimensions.height,
                        (selectedProduct as any).dimensions.length
                      ].filter(Boolean).join(' × ')
                    : ''
                }
                labelWidth={60}
                labelHeight={40}
                copies={1}
                onPrint={() => setShowQRModal(false)}
              />
              
              {/* Eski QR Preview (yuklab olish uchun) */}
              <div className="mt-6 pt-6 border-t border-surface-200 w-full">
                <p className="text-sm font-medium text-surface-700 mb-3 text-center">Katta QR (yuklab olish uchun)</p>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-xl border border-surface-200">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={`${FRONTEND_URL}/product/${selectedProduct._id}`}
                      size={150}
                      level="H"
                      includeMargin
                    />
                  </div>
                </div>
                <button onClick={downloadQR} className="btn-secondary w-full">
                  <Download className="w-4 h-4" />
                  PNG yuklab olish
                </button>
              </div>
              
              {/* Xprinter Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 w-full">
                <p className="font-medium mb-1">📋 Xprinter sozlamalari:</p>
                <ul className="space-y-0.5">
                  <li>• Label o'lchami: 40mm x 30mm</li>
                  <li>• QR o'lchami: 20mm x 20mm</li>
                  <li>• Margins: None</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Adjustment Modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowQuantityModal(false)} />
          <div className="modal w-full max-w-sm p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">
                {quantityMode === 'add' ? "Miqdor qo'shish" : "Miqdor ayirish"}
              </h3>
              <button onClick={() => setShowQuantityModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className={`rounded-xl p-4 mb-6 ${quantityMode === 'add' ? 'bg-success-50' : 'bg-danger-50'}`}>
              <p className="text-sm text-surface-600 mb-1">Hozirgi miqdor</p>
              <p className={`text-2xl font-bold ${quantityMode === 'add' ? 'text-success-600' : 'text-danger-600'}`}>
                {formatNumber(formData.quantity || 0)} dona
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  {quantityMode === 'add' ? "Qo'shiladigan miqdor" : "Ayiriladigan miqdor"}
                </label>
                <input 
                  type="text" 
                  className="input text-center text-lg font-semibold" 
                  placeholder="0" 
                  value={formatInputNumber(quantityInput)}
                  onChange={e => setQuantityInput(parseNumber(e.target.value))}
                  autoFocus
                />
              </div>

              {quantityInput && Number(quantityInput) > 0 && (
                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-sm text-surface-600 mb-1">Yangi miqdor</p>
                  <p className="text-xl font-bold text-surface-900">
                    {formatNumber(
                      quantityMode === 'add' 
                        ? (Number(formData.quantity) || 0) + Number(quantityInput)
                        : Math.max(0, (Number(formData.quantity) || 0) - Number(quantityInput))
                    )} dona
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuantityModal(false)} className="btn-secondary flex-1">
                  Bekor qilish
                </button>
                <button 
                  type="button" 
                  onClick={applyQuantityChange} 
                  className={`flex-1 ${quantityMode === 'add' ? 'btn-success' : 'btn-danger'}`}
                  disabled={!quantityInput || Number(quantityInput) <= 0}
                >
                  {quantityMode === 'add' ? "Qo'shish" : "Ayirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Statistics Modal */}
      {showStatsModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowStatsModal(false)} />
          <div className="modal w-full max-w-4xl p-6 relative z-10 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-surface-900">{selectedProduct.name}</h3>
                  <p className="text-sm text-surface-500">Sotuv statistikasi va tarixi</p>
                </div>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>

            {statsLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="spinner text-brand-600 w-10 h-10 mb-4" />
                <p className="text-surface-500">Statistika yuklanmoqda...</p>
              </div>
            ) : productStats ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600 uppercase">Jami sotilgan</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{formatNumber(productStats.stats.totalSold)}</p>
                    <p className="text-xs text-blue-500">{productStats.stats.totalReceipts} ta chekda</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-medium text-green-600 uppercase">Jami daromad</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{formatNumber(productStats.stats.totalRevenue)}</p>
                    <p className="text-xs text-green-500">so'm</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600 uppercase">Eng ko'p kun</span>
                    </div>
                    {productStats.stats.bestDay ? (
                      <>
                        <p className="text-lg font-bold text-purple-700">{productStats.stats.bestDay.date}</p>
                        <p className="text-xs text-purple-500">{productStats.stats.bestDay.count} dona sotilgan</p>
                      </>
                    ) : (
                      <p className="text-sm text-purple-500">Ma'lumot yo'q</p>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="text-xs font-medium text-orange-600 uppercase">Eng ko'p soat</span>
                    </div>
                    {productStats.stats.bestHour ? (
                      <>
                        <p className="text-lg font-bold text-orange-700">{productStats.stats.bestHour.label}</p>
                        <p className="text-xs text-orange-500">{productStats.stats.bestHour.count} dona sotilgan</p>
                      </>
                    ) : (
                      <p className="text-sm text-orange-500">Ma'lumot yo'q</p>
                    )}
                  </div>
                </div>

                {/* Hourly Stats Bar Chart */}
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <h4 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-600" />
                    Soatlik statistika (24 soat)
                  </h4>
                  <div className="flex items-end gap-1 h-32">
                    {productStats.hourlyStats.map((hour, idx) => {
                      const maxCount = Math.max(...productStats.hourlyStats.map(h => h.count), 1);
                      const heightPercent = (hour.count / maxCount) * 100;
                      const isBestHour = productStats.stats.bestHour?.hour === hour.hour;
                      
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div 
                            className={`w-full rounded-t transition-all ${isBestHour ? 'bg-gradient-to-t from-orange-500 to-amber-400' : 'bg-gradient-to-t from-brand-500 to-brand-400'} hover:opacity-80`}
                            style={{ height: `${Math.max(heightPercent, 4)}%` }}
                          />
                          <span className="text-[8px] text-surface-400 mt-1">{hour.hour}</span>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-surface-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                            {hour.label}: {hour.count} dona
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Period Selector & Chart */}
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-surface-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-600" />
                      Sotuv tarixi
                    </h4>
                    <div className="flex gap-1">
                      {[
                        { value: '7', label: '7 kun' },
                        { value: '30', label: '30 kun' },
                        { value: '90', label: '3 oy' },
                        { value: '365', label: '1 yil' },
                        { value: 'all', label: 'Hammasi' }
                      ].map(p => (
                        <button
                          key={p.value}
                          onClick={() => handlePeriodChange(p.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            statsPeriod === p.value 
                              ? 'bg-brand-600 text-white' 
                              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Oylik statistika (yillik ko'rinish uchun) */}
                  {(statsPeriod === '365' || statsPeriod === 'all') && productStats.monthlyStats && productStats.monthlyStats.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {productStats.monthlyStats.map((month, idx) => {
                        const maxCount = Math.max(...productStats.monthlyStats.map(m => m.count), 1);
                        const widthPercent = (month.count / maxCount) * 100;
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs text-surface-600 w-24 flex-shrink-0">{month.label}</span>
                            <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all"
                                style={{ width: `${Math.max(widthPercent, 5)}%` }}
                              >
                                {month.count > 0 && (
                                  <span className="text-[10px] font-bold text-white">{month.count}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-surface-500 w-28 text-right">
                              {formatNumber(month.revenue)} so'm
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {productStats.periodStats && productStats.periodStats.slice(-30).map((day, idx) => {
                        const maxCount = Math.max(...productStats.periodStats.map(d => d.count), 1);
                        const widthPercent = (day.count / maxCount) * 100;
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs text-surface-600 w-20 flex-shrink-0">
                              {new Date(day.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                            </span>
                            <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all"
                                style={{ width: `${Math.max(widthPercent, 5)}%` }}
                              >
                                {day.count > 0 && (
                                  <span className="text-[10px] font-bold text-white">{day.count}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-surface-500 w-24 text-right">
                              {formatNumber(day.revenue)} so'm
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Sales Table */}
                <div className="bg-white rounded-xl border border-surface-200 p-4">
                  <h4 className="text-sm font-semibold text-surface-900 mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-brand-600" />
                    Oxirgi sotuvlar (50 ta)
                  </h4>
                  {productStats.recentSales.length > 0 ? (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-surface-200">
                            <th className="text-left py-2 px-3 text-surface-600 font-medium">Sana</th>
                            <th className="text-center py-2 px-3 text-surface-600 font-medium">Miqdor</th>
                            <th className="text-right py-2 px-3 text-surface-600 font-medium">Narx</th>
                            <th className="text-right py-2 px-3 text-surface-600 font-medium">Jami</th>
                            <th className="text-left py-2 px-3 text-surface-600 font-medium">Mijoz</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productStats.recentSales.map((sale, idx) => (
                            <tr key={idx} className="border-b border-surface-100 hover:bg-surface-50">
                              <td className="py-2 px-3 text-surface-700">
                                {new Date(sale.date).toLocaleString('uz-UZ', { 
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                                })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full text-xs font-semibold">
                                  {sale.quantity}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-surface-600">{formatNumber(sale.price)}</td>
                              <td className="py-2 px-3 text-right font-semibold text-surface-900">{formatNumber(sale.total)}</td>
                              <td className="py-2 px-3 text-surface-600">
                                {sale.customer?.name || 'Noma\'lum'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-surface-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-surface-300" />
                      <p>Hali sotuvlar yo'q</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-surface-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-surface-300" />
                <p>Statistika ma'lumotlari topilmadi</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch QR Print Modal */}
      {showBatchQRModal && (
        <BatchQRPrint
          products={products.filter(p => selectedProducts.has(p._id))}
          onClose={() => {
            setShowBatchQRModal(false);
            setSelectionMode(false);
            setSelectedProducts(new Set());
          }}
        />
      )}
    </div>
  );
}
