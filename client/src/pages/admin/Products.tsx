import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { Plus, Minus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, Upload, Ruler, Box, Scale, RotateCcw } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export default function Products() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    code: '', name: '', quantity: '',
    previousPrice: '', // Oldingi narxi
    currentPrice: '', // Hozirgi narxi
    unit: 'dona' as 'dona' | 'metr' | 'rulon' | 'karobka' | 'gram' | 'kg' | 'litr',
    conversionEnabled: false,
    baseUnit: 'dona' as 'dona' | 'metr' | 'gram' | 'kg' | 'litr',
    conversionRate: '',
    packageCount: '',
    pricePerMeter: '',
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
    } catch (err) {
      console.error('Error fetching products:', err);
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

    // Konversiya hisoblash
    let totalBaseUnits = finalQuantity;
    if (formData.conversionEnabled && formData.conversionRate) {
      totalBaseUnits = finalQuantity * Number(formData.conversionRate);
    }
    
    try {
      const data = {
        code: formData.code,
        name: formData.name,
        price: Number(formData.currentPrice), // Hozirgi narxni asosiy narx sifatida ishlatamiz
        previousPrice: Number(formData.previousPrice) || 0, // Oldingi narxi
        currentPrice: Number(formData.currentPrice) || 0, // Hozirgi narxi
        quantity: finalQuantity,
        warehouse: mainWarehouse?._id,
        images,
        packageInfo,
        // Yangi fieldlar
        unit: formData.unit,
        unitConversion: {
          enabled: formData.conversionEnabled,
          baseUnit: formData.baseUnit,
          conversionRate: Number(formData.conversionRate) || 1,
          packageCount: finalQuantity,
          totalBaseUnits: totalBaseUnits
        },
        prices: {
          perUnit: Number(formData.currentPrice),
          perMeter: Number(formData.pricePerMeter) || 0,
          perRoll: Number(formData.pricePerRoll) || 0,
          perBox: Number(formData.pricePerBox) || 0,
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
    setFormData({
      code: product.code,
      name: product.name,
      previousPrice: String((product as any).previousPrice || 0), // Oldingi narxi
      currentPrice: String((product as any).currentPrice || product.price), // Hozirgi narxi
      quantity: String(product.quantity),
      unit: product.unit || 'dona',
      conversionEnabled: product.unitConversion?.enabled || false,
      baseUnit: product.unitConversion?.baseUnit || 'dona',
      conversionRate: String(product.unitConversion?.conversionRate || ''),
      packageCount: String(product.unitConversion?.packageCount || ''),
      pricePerMeter: String(product.prices?.perMeter || ''),
      pricePerRoll: String(product.prices?.perRoll || ''),
      pricePerBox: String(product.prices?.perBox || ''),
      pricePerKg: String(product.prices?.perKg || ''),
      pricePerGram: String(product.prices?.perGram || '')
    });
    setImages((product as any).images || []);
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  

  // Print funksiyalari hozircha ishlatilmaydi, keyin qo'shilishi mumkin

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ 
      code: '', name: '', quantity: '',
      previousPrice: '', currentPrice: '', // Yangi maydonlar
      unit: 'dona',
      conversionEnabled: false,
      baseUnit: 'dona',
      conversionRate: '',
      packageCount: '',
      pricePerMeter: '',
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
        code: res.data.code, name: '', quantity: '',
        previousPrice: '', currentPrice: '', // Yangi maydonlar
        unit: 'dona',
        conversionEnabled: false,
        baseUnit: 'dona',
        conversionRate: '',
        packageCount: '',
        pricePerMeter: '',
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


  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.quantity <= (p.minStock || 50) && p.quantity > 0).length,
    outOfStock: products.filter(p => p.quantity === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.quantity), 0)
  };

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
      return `${API_URL}${product.images[0]}`;
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
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi tovar</span>
          </button>
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
              <div className="hidden lg:block">
                <div className="table-header">
                  <div className="grid grid-cols-12 gap-4 px-6 py-4">
                    <span className="table-header-cell col-span-1">Rasm</span>
                    <span className="table-header-cell col-span-2">Kod</span>
                    <span className="table-header-cell col-span-2">Nomi</span>
                    <span className="table-header-cell col-span-2">Oldingi narxi</span>
                    <span className="table-header-cell col-span-2">Hozirgi narxi</span>
                    <span className="table-header-cell col-span-1">Miqdori</span>
                    <span className="table-header-cell col-span-2 text-center">Amallar</span>
                  </div>
                </div>
                <div className="divide-y divide-surface-100">
                  {filteredProducts.map(product => (
                    <div key={product._id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-1">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)!} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center">
                            <img className="w-5 h-5 text-surface-400" />
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="font-mono text-sm bg-surface-100 px-2 py-1 rounded-lg">{product.code}</span>
                      </div>
                      <div className="col-span-2">
                        <p className="font-medium text-surface-900">{product.name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className={`font-semibold ${
                          (() => {
                            const oldPrice = (product as any).previousPrice || 0;
                            const newPrice = (product as any).currentPrice || product.price;
                            return (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) ? 'line-through text-red-500' : 'text-surface-900';
                          })()
                        }`}>
                          {formatNumber((product as any).previousPrice || 0)}
                        </p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                      <div className="col-span-2 relative">
                        {/* Chegirma foizi tepada */}
                        {(() => {
                          const oldPrice = (product as any).previousPrice || 0;
                          const newPrice = (product as any).currentPrice || product.price;
                          if (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) {
                            const discountPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                            if (discountPercent > 0) {
                              return (
                                <div className="absolute -top-3 -right-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-sm z-10">
                                  -{discountPercent}%
                                </div>
                              );
                            } else if (discountPercent < 0) {
                              return (
                                <div className="absolute -top-3 -right-1 px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-sm z-10">
                                  +{Math.abs(discountPercent)}%
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                        <p className="font-semibold text-surface-900">{formatNumber((product as any).currentPrice || product.price)}</p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                      <div className="col-span-1">
                        <span className={`font-semibold ${
                          product.quantity === 0 ? 'text-danger-600' :
                          product.quantity <= (product.minStock || 100) ? 'text-warning-600' : 'text-success-600'
                        }`}>{product.quantity}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        
                        <button onClick={() => openEditModal(product)} className="btn-icon-sm hover:bg-brand-100 hover:text-brand-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product._id)} className="btn-icon-sm hover:bg-danger-100 hover:text-danger-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                {filteredProducts.map(product => {
                  const unit = product.unit || 'dona';
                  const hasConversion = product.unitConversion?.enabled;
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
                  
                  return (
                    <div key={product._id} className="bg-white rounded-xl sm:rounded-2xl border border-surface-200 hover:border-brand-300 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      {/* Image Section */}
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-surface-100 to-surface-50 overflow-hidden">
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
                            
                            <button onClick={() => openEditModal(product)} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-amber-600 hover:bg-white transition-all shadow-lg hover:scale-110">
                              <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button onClick={() => handleDelete(product._id)} className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center text-surface-700 hover:text-red-600 hover:bg-white transition-all shadow-lg hover:scale-110">
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
                          
                          {/* Conversion info */}
                          {hasConversion && product.unitConversion && (
                            <div className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2.5 py-0.5 sm:py-1 md:py-1.5 bg-purple-50 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] md:text-xs text-purple-700 font-semibold border border-purple-200">
                              <RotateCcw className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                              <span>= {product.unitConversion.totalBaseUnits} {getUnitLabel(product.unitConversion.baseUnit)}</span>
                            </div>
                          )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-surface-50 rounded-xl p-2.5">
                            <p className="text-[10px] text-surface-500 uppercase tracking-wide mb-0.5">Oldingi narxi</p>
                            <p className={`font-bold text-sm ${
                              (() => {
                                const oldPrice = (product as any).previousPrice || 0;
                                const newPrice = (product as any).currentPrice || product.price;
                                return (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) ? 'line-through text-red-500' : 'text-surface-900';
                              })()
                            }`}>
                              {formatNumber((product as any).previousPrice || 0)}
                              <span className="text-[10px] text-surface-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                          <div className="bg-brand-50 rounded-xl p-2.5 relative">
                            {/* Chegirma foizi tepada */}
                            {(() => {
                              const oldPrice = (product as any).previousPrice || 0;
                              const newPrice = (product as any).currentPrice || product.price;
                              if (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) {
                                const discountPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                                if (discountPercent > 0) {
                                  return (
                                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500 text-white rounded text-[9px] font-bold shadow-sm">
                                      -{discountPercent}%
                                    </div>
                                  );
                                } else if (discountPercent < 0) {
                                  return (
                                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-green-500 text-white rounded text-[9px] font-bold shadow-sm">
                                      +{Math.abs(discountPercent)}%
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                            <p className="text-[10px] text-brand-600 uppercase tracking-wide mb-0.5">Hozirgi narxi</p>
                            <p className="font-bold text-brand-700 text-sm">
                              {formatNumber((product as any).currentPrice || product.price)}
                              <span className="text-[10px] text-brand-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                        </div>

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
                      <img src={`${API_URL}${img}`} alt="" className="w-full h-full object-cover rounded-lg" />
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
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Miqdori</label>
                  {editingProduct ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 bg-surface-100 rounded-xl text-center font-semibold text-surface-900">
                        {formatNumber(formData.quantity || 0)}
                      </div>
                      <button type="button" onClick={() => openQuantityModal('add')} className="btn-icon bg-success-100 text-success-600 hover:bg-success-200">
                        <Plus className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => openQuantityModal('subtract')} className="btn-icon bg-danger-100 text-danger-600 hover:bg-danger-200">
                        <Minus className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.quantity)} onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})} required />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Nomi</label>
                <input type="text" className="input" placeholder="Tovar nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              {/* Oldingi va hozirgi narxlar */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Oldingi narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.previousPrice)} onChange={e => setFormData({...formData, previousPrice: parseNumber(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Hozirgi narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.currentPrice)} onChange={e => setFormData({...formData, currentPrice: parseNumber(e.target.value)})} required />
                  {/* Chegirma foizi ko'rsatish */}
                  {formData.previousPrice && formData.currentPrice && Number(formData.previousPrice) > 0 && Number(formData.currentPrice) > 0 && (
                    <div className="mt-2">
                      {(() => {
                        const oldPrice = Number(formData.previousPrice);
                        const newPrice = Number(formData.currentPrice);
                        const discountPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                        
                        if (discountPercent > 0) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-700">{discountPercent}% chegirma</span>
                            </div>
                          );
                        } else if (discountPercent < 0) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-sm font-medium text-red-700">{Math.abs(discountPercent)}% qimmatroq</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* O'lchov birligi */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-600" />
                  O'lchov birligi
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-surface-700 mb-2 block">Birlik</label>
                    <select 
                      className="input"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                    >
                      <option value="dona">Dona</option>
                      <option value="metr">Metr</option>
                      <option value="rulon">Rulon</option>
                      <option value="karobka">Karobka/Quti</option>
                      <option value="gram">Gram</option>
                      <option value="kg">Kilogram</option>
                      <option value="litr">Litr</option>
                    </select>
                  </div>
                  
                  {/* Konversiya */}
                  {(formData.unit === 'rulon' || formData.unit === 'karobka') && (
                    <div>
                      <label className="text-sm font-medium text-surface-700 mb-2 block">
                        1 {formData.unit === 'rulon' ? 'rulon' : 'karobka'} = ? 
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className="input flex-1" 
                          placeholder="30"
                          value={formData.conversionRate}
                          onChange={e => setFormData({
                            ...formData, 
                            conversionRate: parseNumber(e.target.value),
                            conversionEnabled: true
                          })}
                        />
                        <select 
                          className="input w-24"
                          value={formData.baseUnit}
                          onChange={e => setFormData({...formData, baseUnit: e.target.value as any})}
                        >
                          <option value="metr">metr</option>
                          <option value="dona">dona</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Konversiya natijasi */}
                {formData.conversionEnabled && formData.conversionRate && formData.quantity && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-xl">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">{formData.quantity}</span> {formData.unit === 'rulon' ? 'rulon' : 'karobka'} = 
                      <span className="font-semibold ml-1">{Number(formData.quantity) * Number(formData.conversionRate)}</span> {formData.baseUnit}
                    </p>
                  </div>
                )}
              </div>

              {/* Qo'shimcha narxlar */}
              <div className="border-t border-surface-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Qo'shimcha narxlar (ixtiyoriy)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Metr narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerMeter)}
                      onChange={e => setFormData({...formData, pricePerMeter: parseNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Rulon narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerRoll)}
                      onChange={e => setFormData({...formData, pricePerRoll: parseNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Karobka narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerBox)}
                      onChange={e => setFormData({...formData, pricePerBox: parseNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-surface-600 mb-1 block">Kg narxi</label>
                    <input 
                      type="text" 
                      className="input text-sm py-2" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerKg)}
                      onChange={e => setFormData({...formData, pricePerKg: parseNumber(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1" disabled={!!codeError}>Saqlash</button>
              </div>
            </form>
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
    </div>
  );
}
