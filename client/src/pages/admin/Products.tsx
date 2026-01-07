import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { Plus, Minus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Image, Upload, Printer } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

export default function Products() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    code: '', name: '', costPrice: '', wholesalePrice: '', quantity: ''
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
  const [printSettings, setPrintSettings] = useState({
    printer: '',
    copies: 1,
    size: 'card',
    layout: 'standard'
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
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
    let finalCostPrice = Number(formData.costPrice);
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
    
    try {
      const data = {
        code: formData.code,
        name: formData.name,
        costPrice: finalCostPrice,
        price: Number(formData.wholesalePrice),
        quantity: finalQuantity,
        warehouse: mainWarehouse?._id,
        images,
        packageInfo
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
      costPrice: String((product as any).costPrice || 0),
      wholesalePrice: String(product.price),
      quantity: String(product.quantity)
    });
    setImages((product as any).images || []);
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
  };

  const openPrintModal = (product: Product) => {
    setSelectedProduct(product);
    setShowPrintModal(true);
    loadAvailablePrinters();
  };

  const loadAvailablePrinters = async () => {
    try {
      // Faqat sizning printerlaringiz
      const myPrinters = [
        'Default Printer',
        'HP LaserJet Pro',
        'Canon PIXMA'
      ];
      
      setAvailablePrinters(myPrinters);
      
      // Default printer as selected
      setPrintSettings(prev => ({
        ...prev,
        printer: myPrinters[0]
      }));
      
    } catch (error) {
      console.error('Error loading printers:', error);
      setAvailablePrinters(['Default Printer']);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ code: '', name: '', costPrice: '', wholesalePrice: '', quantity: '' });
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
      setFormData({ code: res.data.code, name: '', costPrice: '', wholesalePrice: '', quantity: '' });
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

  const downloadQR = () => {
    if (!selectedProduct) return;
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    
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

  const generateQRCodeDataURL = (product: Product, size: number): string => {
    // Create SVG string with QR pattern (simplified version)
    // In a real implementation, you would use the actual QR data to generate proper QR code
    const svgString = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <g fill="black">
          <!-- QR Code corner markers -->
          <rect x="0" y="0" width="7" height="7"/>
          <rect x="${size-7}" y="0" width="7" height="7"/>
          <rect x="0" y="${size-7}" width="7" height="7"/>
          <rect x="2" y="2" width="3" height="3" fill="white"/>
          <rect x="${size-5}" y="2" width="3" height="3" fill="white"/>
          <rect x="2" y="${size-5}" width="3" height="3" fill="white"/>
          <!-- Data pattern (simplified) -->
          <rect x="10" y="10" width="2" height="2"/>
          <rect x="15" y="12" width="2" height="2"/>
          <rect x="20" y="8" width="2" height="2"/>
          <rect x="25" y="15" width="2" height="2"/>
          <rect x="30" y="10" width="2" height="2"/>
          <rect x="35" y="20" width="2" height="2"/>
          <rect x="12" y="25" width="2" height="2"/>
          <rect x="18" y="30" width="2" height="2"/>
          <rect x="25" y="35" width="2" height="2"/>
          <rect x="32" y="28" width="2" height="2"/>
          <rect x="8" y="35" width="2" height="2"/>
          <rect x="22" y="22" width="2" height="2"/>
          <rect x="28" y="32" width="2" height="2"/>
          <rect x="14" y="18" width="2" height="2"/>
          <rect x="38" y="12" width="2" height="2"/>
          <rect x="16" y="38" width="2" height="2"/>
          <rect x="42" y="25" width="2" height="2"/>
          <rect x="26" y="42" width="2" height="2"/>
        </g>
        <!-- Add product code as text for reference -->
        <text x="${size/2}" y="${size-2}" text-anchor="middle" font-size="4" fill="black">${product.code}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svgString)}`;
  };

  const generateProductLabel = async (product: Product) => {
    const { size, layout } = printSettings;
    
    // Generate QR code as data URL
    const qrSize = size === 'card' ? 24 : size === 'thermal' ? 90 : 110;
    const qrDataUrl = generateQRCodeDataURL(product, qrSize);
    
    // Create HTML content for the label
    const labelContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Product Label - ${product.name}</title>
        <style>
          @page {
            size: ${size === 'card' ? '50mm 25mm' : size === 'A4' ? 'A4' : size === 'A5' ? 'A5' : '80mm 60mm'};
            margin: ${size === 'card' ? '0.3mm' : size === 'thermal' ? '3mm' : '8mm'};
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .label-container {
            border: 1px solid #000;
            padding: ${size === 'card' ? '0.5mm' : size === 'thermal' ? '8px' : '15px'};
            background: white;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            gap: 3px;
            overflow: hidden;
          }
          .product-info {
            flex: 1;
            max-width: 75%;
          }
          .product-name {
            font-size: ${size === 'card' ? '7px' : size === 'thermal' ? '16px' : '22px'};
            font-weight: bold;
            color: #000;
            line-height: 1.0;
            margin-bottom: ${size === 'card' ? '1px' : '2px'};
            word-wrap: break-word;
          }
          .product-code {
            font-size: ${size === 'card' ? '4px' : size === 'thermal' ? '11px' : '14px'};
            color: #666;
            line-height: 1.0;
            margin-bottom: ${size === 'card' ? '1px' : '2px'};
          }
          .product-price {
            font-size: ${size === 'card' ? '9px' : size === 'thermal' ? '14px' : '18px'};
            font-weight: bold;
            color: #000;
            line-height: 1.0;
            margin-bottom: ${size === 'card' ? '1px' : '2px'};
          }
          .qr-code-section {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 25%;
            height: 100%;
          }
          .qr-code-img {
            width: ${size === 'card' ? '24px' : size === 'thermal' ? '90px' : '110px'};
            height: ${size === 'card' ? '24px' : size === 'thermal' ? '90px' : '110px'};
            border: 1px solid #ddd;
          }
          .additional-info {
            margin: 0;
            font-size: ${size === 'card' ? '2.5px' : size === 'thermal' ? '9px' : '11px'};
            color: #666;
            line-height: 1.0;
          }
          .info-row {
            margin: 0;
          }
          ${layout === 'minimal' ? '.additional-info { display: none; }' : ''}
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-code">${product.code}</div>
            <div class="product-price">${formatNumber(product.price)}</div>
            
            <div class="additional-info">
              <div class="info-row">
                ${product.quantity} | ${new Date().toLocaleDateString('uz-UZ')}
              </div>
            </div>
          </div>
          
          <div class="qr-code-section">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-code-img" />
          </div>
        </div>
      </body>
      </html>
    `;
    
    return labelContent;
  };

  const handlePrint = async () => {
    if (!selectedProduct) return;
    
    try {
      const labelContent = await generateProductLabel(selectedProduct);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Popup blocker tomonidan to\'sib qo\'yildi. Popup\'larni yoqing.');
        return;
      }
      
      // Write the content to the new window
      printWindow.document.write(labelContent);
      printWindow.document.close();
      
      // Wait for content to load
      printWindow.onload = () => {
        // Focus the window and trigger print dialog
        printWindow.focus();
        
        // Print multiple copies
        for (let i = 0; i < printSettings.copies; i++) {
          setTimeout(() => {
            // This will open Windows print dialog with all available printers
            printWindow.print();
          }, i * 500); // Small delay between copies
        }
        
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 2000);
      };
      
      setShowPrintModal(false);
      
    } catch (error) {
      console.error('Error generating print content:', error);
      alert('Chop uchun tayyorlashda xatolik yuz berdi');
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

      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-4 gap-4">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`stat-card ${stat.filter ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${
                stockFilter === stat.filter ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`stat-icon bg-${stat.color}-50`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
              </div>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
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
                    <span className="table-header-cell col-span-2">Tan narxi</span>
                    <span className="table-header-cell col-span-2">Optom narxi</span>
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
                            <Image className="w-5 h-5 text-surface-400" />
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
                        <p className="font-semibold text-surface-900">{formatNumber((product as any).costPrice || 0)}</p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-semibold text-surface-900">{formatNumber(product.price)}</p>
                        <p className="text-sm text-surface-500">so'm</p>
                      </div>
                      <div className="col-span-1">
                        <span className={`font-semibold ${
                          product.quantity === 0 ? 'text-danger-600' :
                          product.quantity <= (product.minStock || 100) ? 'text-warning-600' : 'text-success-600'
                        }`}>{product.quantity}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <button onClick={() => openQRModal(product)} className="btn-icon-sm hover:bg-surface-200" title="QR kod">
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button onClick={() => openPrintModal(product)} className="btn-icon-sm hover:bg-blue-100 hover:text-blue-600" title="Chop etish">
                          <Printer className="w-4 h-4" />
                        </button>
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
              <div className="lg:hidden divide-y divide-surface-100">
                {filteredProducts.map(product => (
                  <div key={product._id} className="p-4">
                    <div className="flex items-start gap-3">
                      {getProductImage(product) ? (
                        <img src={getProductImage(product)!} alt={product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-brand-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-surface-900 truncate">{product.name}</h4>
                            <p className="text-sm text-surface-500">Kod: {product.code}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openQRModal(product)} className="btn-icon-sm"><QrCode className="w-4 h-4" /></button>
                            <button onClick={() => openPrintModal(product)} className="btn-icon-sm text-blue-600"><Printer className="w-4 h-4" /></button>
                            <button onClick={() => openEditModal(product)} className="btn-icon-sm"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(product._id)} className="btn-icon-sm text-danger-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-surface-50 rounded-xl p-3">
                            <p className="text-xs text-surface-500 mb-1">Tan narxi</p>
                            <p className="font-semibold text-surface-900">{formatNumber((product as any).costPrice || 0)}</p>
                          </div>
                          <div className="bg-surface-50 rounded-xl p-3">
                            <p className="text-xs text-surface-500 mb-1">Optom narxi</p>
                            <p className="font-semibold text-surface-900">{formatNumber(product.price)}</p>
                          </div>
                          <div className={`rounded-xl p-3 ${product.quantity === 0 ? 'bg-danger-50' : product.quantity <= (product.minStock || 100) ? 'bg-warning-50' : 'bg-success-50'}`}>
                            <p className="text-xs text-surface-500 mb-1">Miqdori</p>
                            <p className={`font-semibold ${product.quantity === 0 ? 'text-danger-600' : product.quantity <= (product.minStock || 100) ? 'text-warning-600' : 'text-success-600'}`}>{product.quantity}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Tan narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.costPrice)} onChange={e => setFormData({...formData, costPrice: parseNumber(e.target.value)})} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Optom narxi (so'm)</label>
                  <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.wholesalePrice)} onChange={e => setFormData({...formData, wholesalePrice: parseNumber(e.target.value)})} required />
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

      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowQRModal(false)} />
          <div className="modal w-full max-w-sm p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">QR Kod</h3>
              <button onClick={() => setShowQRModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border border-surface-200 mb-4">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={JSON.stringify({
                    id: selectedProduct._id,
                    code: selectedProduct.code,
                    name: selectedProduct.name,
                    price: selectedProduct.price
                  })}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center mb-4">
                <p className="font-semibold text-surface-900">{selectedProduct.name}</p>
                <p className="text-sm text-surface-500">Kod: {selectedProduct.code}</p>
                <p className="text-sm text-surface-500">Tan narxi: {formatNumber((selectedProduct as any).costPrice || 0)} so'm</p>
                <p className="text-sm text-surface-500">Optom: {formatNumber(selectedProduct.price)} so'm</p>
              </div>
              <button onClick={downloadQR} className="btn-primary w-full">
                <Download className="w-4 h-4" />
                Yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay" onClick={() => setShowPrintModal(false)} />
          <div className="modal w-full max-w-2xl p-6 relative z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Chop etish sozlamalari</h3>
              <button onClick={() => setShowPrintModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings Panel */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Printer tanlash</label>
                  <select 
                    className="input"
                    value={printSettings.printer}
                    onChange={e => setPrintSettings({...printSettings, printer: e.target.value})}
                  >
                    <option value="">Printer tanlang</option>
                    {availablePrinters.map(printer => (
                      <option key={printer} value={printer}>{printer}</option>
                    ))}
                  </select>
                  <p className="text-xs text-surface-500 mt-1">
                    Chop etish tugmasini bosganda Windows print dialog ochiladi va barcha mavjud printerlarni ko'rsatadi
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Qog'oz o'lchami</label>
                  <select 
                    className="input"
                    value={printSettings.size}
                    onChange={e => setPrintSettings({...printSettings, size: e.target.value})}
                  >
                    <option value="card">Kichik yorliq (50×25mm)</option>
                    <option value="A4">A4 (210×297mm)</option>
                    <option value="A5">A5 (148×210mm)</option>
                    <option value="thermal">Thermal (80×120mm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Shablon</label>
                  <select 
                    className="input"
                    value={printSettings.layout}
                    onChange={e => setPrintSettings({...printSettings, layout: e.target.value})}
                  >
                    <option value="standard">Standart (barcha ma'lumotlar)</option>
                    <option value="minimal">Minimal (faqat asosiy ma'lumotlar)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Nusxalar soni</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    className="input"
                    value={printSettings.copies}
                    onChange={e => setPrintSettings({...printSettings, copies: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              {/* Preview Panel */}
              <div className="bg-surface-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-surface-700 mb-3">Ko'rinish</h4>
                <div className="bg-white shadow-sm rounded-lg p-4 flex justify-center">
                  <div 
                    className="bg-white border-2 border-dashed border-surface-300"
                    style={{
                      width: printSettings.size === 'card' ? '50mm' : printSettings.size === 'thermal' ? '80mm' : printSettings.size === 'A5' ? '148mm' : '210mm',
                      height: printSettings.size === 'card' ? '25mm' : printSettings.size === 'thermal' ? '120mm' : printSettings.size === 'A5' ? '210mm' : '297mm',
                      fontSize: printSettings.size === 'card' ? '6px' : printSettings.size === 'thermal' ? '10px' : '12px',
                      transform: printSettings.size === 'card' ? 'scale(1.8)' : 'scale(0.6)',
                      transformOrigin: 'center center',
                      overflow: 'hidden',
                      padding: '1px'
                    }}
                  >
                    {/* Main content - horizontal layout */}
                    <div className="flex items-center h-full" style={{gap: '3px'}}>
                      {/* Left side - Product info */}
                      <div className="flex-1 text-left" style={{maxWidth: '75%'}}>
                        <div 
                          className="font-bold text-black"
                          style={{
                            fontSize: printSettings.size === 'card' ? '7px' : printSettings.size === 'thermal' ? '18px' : '24px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '1px' : '2px'
                          }}
                        >
                          {selectedProduct.name}
                        </div>
                        
                        <div 
                          className="text-gray-600"
                          style={{
                            fontSize: printSettings.size === 'card' ? '4px' : printSettings.size === 'thermal' ? '12px' : '16px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '1px' : '2px'
                          }}
                        >
                          {selectedProduct.code}
                        </div>

                        {/* Price */}
                        <div 
                          className="font-bold text-black"
                          style={{
                            fontSize: printSettings.size === 'card' ? '9px' : printSettings.size === 'thermal' ? '16px' : '20px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '1px' : '2px'
                          }}
                        >
                          {formatNumber(selectedProduct.price)}
                        </div>

                        {/* Additional info only in standard layout */}
                        {printSettings.layout === 'standard' && (
                          <div 
                            className="text-gray-600" 
                            style={{
                              fontSize: printSettings.size === 'card' ? '2.5px' : printSettings.size === 'thermal' ? '9px' : '11px',
                              lineHeight: '1.0',
                              margin: 0
                            }}
                          >
                            {selectedProduct.quantity} | {new Date().toLocaleDateString('uz-UZ')}
                          </div>
                        )}
                      </div>

                      {/* Right side - QR Code */}
                      <div className="flex-shrink-0 flex items-center justify-center" style={{maxWidth: '25%', height: '100%'}}>
                        <QRCodeSVG
                          value={JSON.stringify({
                            id: selectedProduct._id,
                            code: selectedProduct.code,
                            name: selectedProduct.name,
                            price: selectedProduct.price
                          })}
                          size={printSettings.size === 'card' ? 24 : printSettings.size === 'thermal' ? 90 : 110}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {printSettings.copies > 1 && (
                  <p className="text-xs text-surface-500 mt-2 text-center">
                    {printSettings.copies} nusxa chop etiladi
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button 
                type="button" 
                onClick={() => setShowPrintModal(false)} 
                className="btn-secondary flex-1"
              >
                Bekor qilish
              </button>
              <button 
                type="button" 
                onClick={handlePrint} 
                className="btn-primary flex-1"
                disabled={!printSettings.printer}
              >
                <Printer className="w-4 h-4" />
                Chop etish
              </button>
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
    </div>
  );
}
