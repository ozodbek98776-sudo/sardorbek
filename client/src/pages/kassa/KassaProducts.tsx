import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw, Package, Plus, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Image, Upload, Printer, Minus, Ruler, Box, Scale, RotateCcw } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
// Rasmlar uchun alohida URL
const UPLOADS_URL = (import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:8000';

export default function KassaProducts() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPackageInput, setShowPackageInput] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityMode, setQuantityMode] = useState<'add' | 'subtract'>('add');
  const [quantityInput, setQuantityInput] = useState('');
  const [printSettings, setPrintSettings] = useState({
    printer: '',
    copies: 1,
    size: 'card',
    layout: 'standard',
    customWidth: '',
    customHeight: ''
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

  // Route o'zgarganda ma'lumotlarni yangilash
  useEffect(() => {
    if (mainWarehouse) {
      fetchProducts();
    }
  }, [location.pathname]);

  // ESC tugmasi bilan rasm modalini yopish
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImageModal) {
        setShowImageModal(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showImageModal]);

  useEffect(() => {
    // Filter products based on search term and stock
    let filtered = products;
    
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (stockFilter !== 'all') {
      if (stockFilter === 'low') {
        filtered = filtered.filter(p => p.quantity <= (p.minStock || 50) && p.quantity > 0);
      } else if (stockFilter === 'out') {
        filtered = filtered.filter(p => p.quantity === 0);
      }
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, stockFilter]);

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
      setLoading(true);
      
      const res = await api.get('/products?mainOnly=true');
      // Handle both paginated and non-paginated responses
      const productsData = res.data.data || res.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      showAlert('Tovarlarni yuklashda xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchProducts();
      showAlert('Ma\'lumotlar yangilandi', 'Muvaffaqiyat', 'success');
    } catch (error) {
      console.error('Refresh xatosi:', error);
      showAlert('Ma\'lumotlarni yangilashda xatolik', 'Xatolik', 'danger');
    } finally {
      setIsRefreshing(false);
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
      // Sizning haqiqiy printerlaringiz
      const myPrinters = [
        'EPSON L132 Series (Copy 1)',
        'EPSON L132 Series',
        'X printer'
      ];
      
      setAvailablePrinters(myPrinters);
      
      // Default printer as selected
      setPrintSettings(prev => ({
        ...prev,
        printer: myPrinters[0]
      }));
      
    } catch (error) {
      console.error('Error loading printers:', error);
      setAvailablePrinters(['EPSON L132 Series', 'X printer']);
    }
  };

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

  const generateQRCodeDataURL = async (product: Product, size: number): Promise<string> => {
    try {
      const qrData = JSON.stringify({
        id: product._id,
        code: product.code,
        name: product.name,
        price: product.price
      });
      
      const qrDataURL = await QRCode.toDataURL(qrData, {
        width: size * 10,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H',
        type: 'image/png'
      });
      
      return qrDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };
  
  const handlePrint = async () => {
    if (!selectedProduct) return;
    
    try {
      // Maxsus o'lchamni tekshirish
      const hasCustomSize = printSettings.customWidth && printSettings.customHeight;
      const customWidth = hasCustomSize ? `${printSettings.customWidth}mm` : null;
      const customHeight = hasCustomSize ? `${printSettings.customHeight}mm` : null;
      
      // Generate QR code as high-quality data URL
      const qrSize = printSettings.size === 'card' ? 65 : printSettings.size === 'thermal' ? 125 : 145;
      const qrDataUrl = await generateQRCodeDataURL(selectedProduct, qrSize);
      
      // Create print-ready HTML with single page layout
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Label - ${selectedProduct.name}</title>
          <style>
            @page {
              size: ${hasCustomSize ? `${customWidth} ${customHeight}` : (printSettings.size === 'card' ? '28mm 18mm' : printSettings.size === 'A4' ? 'A4' : printSettings.size === 'A5' ? 'A5' : '50mm 70mm')};
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              height: 100%;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              overflow: hidden;
            }
            .page-container {
              width: 100%;
              height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              page-break-after: avoid;
            }
            .label-container {
              border: 2px solid #333;
              padding: ${printSettings.size === 'card' ? '1mm' : printSettings.size === 'thermal' ? '6px' : '12px'};
              background: white;
              width: ${hasCustomSize ? customWidth : (printSettings.size === 'card' ? '26mm' : printSettings.size === 'thermal' ? '44mm' : printSettings.size === 'A4' ? '80mm' : printSettings.size === 'A5' ? '120mm' : '120mm')};
              height: ${hasCustomSize ? customHeight : (printSettings.size === 'card' ? '16mm' : printSettings.size === 'thermal' ? '60mm' : printSettings.size === 'A4' ? '100mm' : printSettings.size === 'A5' ? '140mm' : '140mm')};
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 2px;
              overflow: hidden;
              border-radius: 2px;
              page-break-inside: avoid;
            }
            .product-info {
              flex: 1;
              width: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              height: auto;
            }
            .product-name {
              font-size: ${printSettings.size === 'card' ? '8px' : printSettings.size === 'thermal' ? '16px' : '20px'};
              font-weight: 600;
              color: #1a1a1a;
              line-height: 1.1;
              margin-bottom: ${printSettings.size === 'card' ? '1px' : '2px'};
              word-wrap: break-word;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: ${printSettings.size === 'card' ? '1' : '2'};
              -webkit-box-orient: vertical;
            }
            .product-code {
              font-size: ${printSettings.size === 'card' ? '7px' : printSettings.size === 'thermal' ? '14px' : '18px'};
              color: #666;
              line-height: 1.0;
              margin-bottom: ${printSettings.size === 'card' ? '1px' : '2px'};
              font-weight: 500;
            }
            .product-price {
              font-size: ${printSettings.size === 'card' ? '12px' : printSettings.size === 'thermal' ? '20px' : '24px'};
              font-weight: 800;
              color: #d32f2f;
              line-height: 1.0;
              margin-bottom: ${printSettings.size === 'card' ? '0px' : '1px'};
            }
            .qr-code-section {
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: auto;
              padding: 2px 0;
              overflow: hidden;
              box-sizing: border-box;
            }
            .qr-code-img {
              width: ${printSettings.size === 'card' ? '60px' : printSettings.size === 'thermal' ? '120px' : '140px'};
              height: ${printSettings.size === 'card' ? '60px' : printSettings.size === 'thermal' ? '120px' : '140px'};
              max-width: 95%;
              max-height: 95%;
              border: 1px solid #e0e0e0;
              border-radius: 2px;
              background: white;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              image-rendering: pixelated;
            }
            .additional-info {
              margin: 0;
              font-size: ${printSettings.size === 'card' ? '4px' : printSettings.size === 'thermal' ? '10px' : '12px'};
              color: #888;
              line-height: 1.0;
              font-weight: 400;
            }
            ${printSettings.layout === 'minimal' ? '.additional-info { display: none; }' : ''}
            
            @media print {
              html, body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .page-container {
                height: 100vh !important;
                page-break-after: avoid !important;
              }
              .label-container {
                page-break-inside: avoid !important;
                width: ${hasCustomSize ? customWidth : (printSettings.size === 'card' ? '28mm' : printSettings.size === 'thermal' ? '48mm' : printSettings.size === 'A4' ? '85mm' : printSettings.size === 'A5' ? '130mm' : '130mm')} !important;
                height: ${hasCustomSize ? customHeight : (printSettings.size === 'card' ? '18mm' : printSettings.size === 'thermal' ? '65mm' : printSettings.size === 'A4' ? '105mm' : printSettings.size === 'A5' ? '145mm' : '145mm')} !important;
                padding: ${printSettings.size === 'card' ? '1.5mm' : printSettings.size === 'thermal' ? '8px' : '15px'} !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
              .qr-code-section {
                width: 100% !important;
                height: auto !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
              }
              .qr-code-img {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                width: ${printSettings.size === 'card' ? '65px' : printSettings.size === 'thermal' ? '125px' : '145px'} !important;
                height: ${printSettings.size === 'card' ? '65px' : printSettings.size === 'thermal' ? '125px' : '145px'} !important;
                max-width: 95% !important;
                max-height: 95% !important;
                object-fit: contain !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="label-container">
              <div class="product-info">
                <div class="product-price">${formatNumber((selectedProduct as any).currentPrice || selectedProduct.price)} so'm</div>
                <div class="product-code">Kod: ${selectedProduct.code}</div>
                <div class="product-name">${selectedProduct.name}</div>
                
                ${printSettings.layout === 'standard' ? `
                  <div class="additional-info">
                    Miqdor: ${selectedProduct.quantity} | ${new Date().toLocaleDateString('uz-UZ')}
                  </div>
                ` : ''}
              </div>
              
              <div class="qr-code-section">
                <img src="${qrDataUrl}" alt="QR Code" class="qr-code-img" />
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Create new window and print directly
      const printWindow = window.open('', '_blank', 'width=1024,height=768');
      
      if (!printWindow) {
        alert('Popup blocker tomonidan to\'sib qo\'yildi. Popup\'larni yoqing.');
        return;
      }
      
      // Write content and print
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          // Close window after printing
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
      
      // Close the print modal
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

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      return `${UPLOADS_URL}${product.images[0]}`;
    }
    return null;
  };

  const statItems = [
    { label: 'Jami tovarlar', value: stats.total, icon: Package, color: 'brand', filter: 'all' },
    { label: 'Kam qolgan', value: stats.lowStock, icon: AlertTriangle, color: 'warning', filter: 'low' },
    { label: 'Tugagan', value: stats.outOfStock, icon: X, color: 'danger', filter: 'out' },
    { label: 'Jami qiymat', value: `${formatNumber(stats.totalValue)} so'm`, icon: DollarSign, color: 'success', filter: null },
  ];

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      
      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-surface-900">Tovarlar (Asosiy ombor)</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yangi tovar</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50"
              title="Tovarlar ro'yxatini yangilash (F5)"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="sm:inline">{isRefreshing ? 'Yangilanmoqda...' : 'Yangilash'}</span>
            </button>
          </div>
        </div>

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

        {/* Search */}
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
                {searchTerm ? 'Qidiruv bo\'yicha tovarlar topilmadi' : 'Birinchi tovarni qo\'shing'}
              </p>
              <button onClick={openAddModal} className="btn-primary">Tovar qo'shish</button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="table-header">
                  <div className="grid grid-cols-16 gap-2 px-4 py-4">
                    <span className="table-header-cell col-span-1">Rasm</span>
                    <span className="table-header-cell col-span-1">Kod</span>
                    <span className="table-header-cell col-span-2">Nomi</span>
                    <span className="table-header-cell col-span-1">Tan narxi</span>
                    <span className="table-header-cell col-span-1">Dona narxi</span>
                    <span className="table-header-cell col-span-1">Karobka</span>
                    <span className="table-header-cell col-span-3">Chegirmalar</span>
                    <span className="table-header-cell col-span-1">Oldingi</span>
                    <span className="table-header-cell col-span-1">Hozirgi</span>
                    <span className="table-header-cell col-span-1">Miqdori</span>
                    <span className="table-header-cell col-span-2 text-center">Amallar</span>
                  </div>
                </div>
                <div className="divide-y divide-surface-100">
                  {filteredProducts.map(product => (
                    <div key={product._id} className="grid grid-cols-16 gap-2 px-4 py-3 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-1">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)!} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center">
                            <Image className="w-5 h-5 text-surface-400" />
                          </div>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className="font-mono text-xs bg-surface-100 px-1.5 py-0.5 rounded">{product.code}</span>
                      </div>
                      <div className="col-span-2">
                        <p className="font-medium text-surface-900 text-sm truncate">{product.name}</p>
                      </div>
                      {/* Tan narxi */}
                      <div className="col-span-1">
                        <p className="font-semibold text-surface-700 text-sm">
                          {formatNumber((product as any).costPrice || 0)}
                        </p>
                      </div>
                      {/* Dona narxi */}
                      <div className="col-span-1">
                        <p className="font-semibold text-brand-600 text-sm">
                          {formatNumber((product as any).unitPrice || product.price)}
                        </p>
                      </div>
                      {/* Karobka narxi */}
                      <div className="col-span-1">
                        <p className="font-semibold text-orange-600 text-sm">
                          {(product as any).boxPrice > 0 ? formatNumber((product as any).boxPrice) : '-'}
                        </p>
                      </div>
                      {/* Chegirmalar */}
                      <div className="col-span-3">
                        <div className="flex flex-wrap gap-1">
                          {(product as any).pricingTiers?.tier1?.discountPercent > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                              {(product as any).pricingTiers.tier1.minQuantity}-{(product as any).pricingTiers.tier1.maxQuantity}: {(product as any).pricingTiers.tier1.discountPercent}%
                            </span>
                          )}
                          {(product as any).pricingTiers?.tier2?.discountPercent > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                              {(product as any).pricingTiers.tier2.minQuantity}-{(product as any).pricingTiers.tier2.maxQuantity}: {(product as any).pricingTiers.tier2.discountPercent}%
                            </span>
                          )}
                          {(product as any).pricingTiers?.tier3?.discountPercent > 0 && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">
                              {(product as any).pricingTiers.tier3.minQuantity}+: {(product as any).pricingTiers.tier3.discountPercent}%
                            </span>
                          )}
                          {!(product as any).pricingTiers?.tier1?.discountPercent && 
                           !(product as any).pricingTiers?.tier2?.discountPercent && 
                           !(product as any).pricingTiers?.tier3?.discountPercent && (
                            <span className="text-surface-400 text-xs">-</span>
                          )}
                        </div>
                      </div>
                      {/* Oldingi narxi */}
                      <div className="col-span-1">
                        <p className={`font-semibold text-sm ${
                          (() => {
                            const oldPrice = (product as any).previousPrice || 0;
                            const newPrice = (product as any).currentPrice || product.price;
                            return (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) ? 'line-through text-red-500' : 'text-surface-900';
                          })()
                        }`}>
                          {formatNumber((product as any).previousPrice || 0)}
                        </p>
                      </div>
                      {/* Hozirgi narxi */}
                      <div className="col-span-1 relative">
                        {(() => {
                          const oldPrice = (product as any).previousPrice || 0;
                          const newPrice = (product as any).currentPrice || product.price;
                          if (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) {
                            const discountPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                            if (discountPercent > 0) {
                              return (
                                <div className="absolute -top-2 -right-1 px-1 py-0.5 bg-red-500 text-white rounded text-[9px] font-bold">
                                  -{discountPercent}%
                                </div>
                              );
                            } else if (discountPercent < 0) {
                              return (
                                <div className="absolute -top-2 -right-1 px-1 py-0.5 bg-green-500 text-white rounded text-[9px] font-bold">
                                  +{Math.abs(discountPercent)}%
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                        <p className="font-semibold text-surface-900 text-sm">{formatNumber((product as any).currentPrice || product.price)}</p>
                      </div>
                      <div className="col-span-1">
                        <span className={`font-semibold text-sm ${
                          product.quantity === 0 ? 'text-danger-600' :
                          product.quantity <= (product.minStock || 100) ? 'text-warning-600' : 'text-success-600'
                        }`}>{product.quantity}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-1">
                        <button onClick={() => openQRModal(product)} className="btn-icon-sm hover:bg-surface-200" title="QR kod">
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button onClick={() => openPrintModal(product)} className="btn-icon-sm hover:bg-blue-100 hover:text-blue-600" title="Print">
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
              <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
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
                    <div key={product._id} className="bg-white rounded-2xl border border-surface-200 hover:border-brand-300 hover:shadow-lg transition-all duration-300 overflow-hidden group">
                      {/* Image Section - Rasm bor bo'lsa ko'rsatish, yo'q bo'lsa icon */}
                      <div 
                        className="relative aspect-square bg-gradient-to-br from-brand-50 to-brand-100 overflow-hidden cursor-pointer"
                        onClick={() => {
                          if (getProductImage(product)) {
                            setSelectedImage(getProductImage(product));
                            setShowImageModal(true);
                          }
                        }}
                      >
                        {getProductImage(product) ? (
                          <img 
                            src={getProductImage(product)!} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            onError={(e) => {
                              // Rasm yuklanmasa, icon ko'rsatish
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${getProductImage(product) ? 'hidden' : ''} w-full h-full flex items-center justify-center`}>
                          <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-lg">
                            {unit === 'metr' || unit === 'rulon' ? <Ruler className="w-10 h-10 text-brand-600" /> :
                             unit === 'karobka' ? <Box className="w-10 h-10 text-brand-600" /> :
                             unit === 'gram' || unit === 'kg' ? <Scale className="w-10 h-10 text-brand-600" /> :
                             <Package className="w-10 h-10 text-brand-600" />}
                          </div>
                        </div>
                        
                        {/* Hover overlay - rasmni kattalashtirish uchun */}
                        {getProductImage(product) && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                              <Search className="w-5 h-5 text-brand-600" />
                            </div>
                          </div>
                        )}
                        
                        {/* Stock Badge */}
                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          stockStatus === 'danger' ? 'bg-red-500 text-white' : 
                          stockStatus === 'warning' ? 'bg-amber-500 text-white' : 
                          'bg-emerald-500 text-white'
                        }`}>
                          {stockStatus === 'danger' ? 'Tugagan' : stockStatus === 'warning' ? 'Kam qoldi' : 'Mavjud'}
                        </div>

                        {/* Code Badge */}
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-mono text-white">
                          #{product.code}
                        </div>

                        {/* Quick Actions */}
                        <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openQRModal(product)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-brand-600 hover:bg-white transition-colors shadow-sm">
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button onClick={() => openPrintModal(product)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-blue-600 hover:bg-white transition-colors shadow-sm">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(product)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-amber-600 hover:bg-white transition-colors shadow-sm">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product._id)} className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center text-surface-600 hover:text-red-600 hover:bg-white transition-colors shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        {/* Name */}
                        <h3 className="font-semibold text-surface-900 text-base mb-3 line-clamp-2 min-h-[2.5rem]">
                          {product.name}
                        </h3>

                        {/* Quantity with Unit */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                            stockStatus === 'danger' ? 'bg-red-50 text-red-700' : 
                            stockStatus === 'warning' ? 'bg-amber-50 text-amber-700' : 
                            'bg-emerald-50 text-emerald-700'
                          }`}>
                            {unit === 'metr' || unit === 'rulon' ? <Ruler className="w-3.5 h-3.5" /> :
                             unit === 'karobka' ? <Box className="w-3.5 h-3.5" /> :
                             unit === 'gram' || unit === 'kg' ? <Scale className="w-3.5 h-3.5" /> :
                             <Package className="w-3.5 h-3.5" />}
                            <span>{formatNumber(product.quantity)} {getUnitLabel(unit)}</span>
                          </div>
                          
                          {/* Conversion info */}
                          {hasConversion && product.unitConversion && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-lg text-xs text-purple-700">
                              <RotateCcw className="w-3 h-3" />
                              <span>= {formatNumber(product.unitConversion.totalBaseUnits)} {getUnitLabel(product.unitConversion.baseUnit)}</span>
                            </div>
                          )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-surface-50 rounded-xl p-2.5">
                            <p className="text-[10px] text-surface-500 uppercase tracking-wide mb-0.5">Tan narxi</p>
                            <p className="font-bold text-sm text-surface-900">
                              {formatNumber((product as any).costPrice || 0)}
                              <span className="text-[10px] text-surface-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                          <div className="bg-brand-50 rounded-xl p-2.5">
                            <p className="text-[10px] text-brand-600 uppercase tracking-wide mb-0.5">Dona narxi</p>
                            <p className="font-bold text-brand-700 text-sm">
                              {formatNumber((product as any).unitPrice || product.price)}
                              <span className="text-[10px] text-brand-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                        </div>

                        {/* Karobka narxi */}
                        {(product as any).boxPrice > 0 && (
                          <div className="bg-orange-50 rounded-xl p-2.5 mb-3">
                            <p className="text-[10px] text-orange-600 uppercase tracking-wide mb-0.5">📦 Karobka narxi</p>
                            <p className="font-bold text-orange-700 text-sm">
                              {formatNumber((product as any).boxPrice)}
                              <span className="text-[10px] text-orange-400 ml-0.5">so'm</span>
                            </p>
                          </div>
                        )}

                        {/* Chegirma darajalari */}
                        {(product as any).pricingTiers && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(product as any).pricingTiers.tier1?.discountPercent > 0 && (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-200">
                                {(product as any).pricingTiers.tier1.minQuantity}-{(product as any).pricingTiers.tier1.maxQuantity} dona: {(product as any).pricingTiers.tier1.discountPercent}%
                              </span>
                            )}
                            {(product as any).pricingTiers.tier2?.discountPercent > 0 && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200">
                                {(product as any).pricingTiers.tier2.minQuantity}-{(product as any).pricingTiers.tier2.maxQuantity} dona: {(product as any).pricingTiers.tier2.discountPercent}%
                              </span>
                            )}
                            {(product as any).pricingTiers.tier3?.discountPercent > 0 && (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200">
                                {(product as any).pricingTiers.tier3.minQuantity}+ dona: {(product as any).pricingTiers.tier3.discountPercent}%
                              </span>
                            )}
                          </div>
                        )}

                        {/* Additional Prices */}
                        {product.prices && (
                          <div className="flex flex-wrap gap-1.5">
                            {product.prices.perMeter > 0 && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                {formatNumber(product.prices.perMeter)}/m
                              </span>
                            )}
                            {product.prices.perRoll > 0 && (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                                {formatNumber(product.prices.perRoll)}/rulon
                              </span>
                            )}
                            {product.prices.perBox > 0 && (
                              <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs font-medium">
                                {formatNumber(product.prices.perBox)}/quti
                              </span>
                            )}
                            {product.prices.perKg > 0 && (
                              <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                                {formatNumber(product.prices.perKg)}/kg
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

      {/* Add/Edit Product Modal */}
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
                  <Package className="w-4 h-4 text-brand-600" />
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
                      <span className="font-semibold">{formatNumber(formData.quantity)}</span> {formData.unit === 'rulon' ? 'rulon' : 'karobka'} = 
                      <span className="font-semibold ml-1">{formatNumber(Number(formData.quantity) * Number(formData.conversionRate))}</span> {formData.baseUnit}
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

      {/* QR Modal */}
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
                <p className="text-sm text-surface-500">Oldingi narxi: {formatNumber((selectedProduct as any).previousPrice || 0)} so'm</p>
                <p className="text-sm text-surface-500">Hozirgi narxi: {formatNumber((selectedProduct as any).currentPrice || selectedProduct.price)} so'm</p>
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
          <div className="modal w-full max-w-4xl p-6 relative z-10 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Print sozlamalari</h3>
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
                    Print tugmasini bosganda Windows print dialog ochiladi va barcha mavjud printerlarni ko'rsatadi
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

                <div className="border-t border-surface-200 pt-4">
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Maxsus o'lcham (ixtiyoriy)</label>
                  <p className="text-xs text-surface-500 mb-3">Agar maxsus o'lcham belgilasangiz, u qog'oz o'lchamidan ustun bo'ladi</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-surface-600 mb-1 block">Eni (mm)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="input"
                        placeholder="Masalan: 50"
                        value={printSettings.customWidth}
                        onChange={e => setPrintSettings({...printSettings, customWidth: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-surface-600 mb-1 block">Bo'yi (mm)</label>
                      <input 
                        type="number" 
                        min="1"
                        className="input"
                        placeholder="Masalan: 25"
                        value={printSettings.customHeight}
                        onChange={e => setPrintSettings({...printSettings, customHeight: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              <div className="bg-surface-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-surface-700 mb-3">Ko'rinish</h4>
                <div className="bg-white shadow-md rounded-xl p-6 flex justify-center items-start min-h-[420px]">
                  <div 
                    className="bg-white border border-gray-200 shadow-lg rounded-xl"
                    style={{
                      width: (printSettings.customWidth && printSettings.customHeight) ? `${printSettings.customWidth}mm` : (printSettings.size === 'card' ? '26mm' : printSettings.size === 'thermal' ? '48mm' : printSettings.size === 'A4' ? '80mm' : printSettings.size === 'A5' ? '140mm' : '120mm'),
                      height: (printSettings.customWidth && printSettings.customHeight) ? `${printSettings.customHeight}mm` : (printSettings.size === 'card' ? '17mm' : printSettings.size === 'thermal' ? '65mm' : printSettings.size === 'A4' ? '105mm' : printSettings.size === 'A5' ? '145mm' : '140mm'),
                      fontSize: printSettings.size === 'card' ? '5px' : printSettings.size === 'thermal' ? '9px' : '11px',
                      transform: printSettings.size === 'card' ? 'scale(4.2)' : printSettings.size === 'thermal' ? 'scale(2.1)' : 'scale(1.8)',
                      transformOrigin: 'center center',
                      overflow: 'hidden',
                      padding: printSettings.size === 'card' ? '1.2mm' : printSettings.size === 'thermal' ? '7px' : '12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      marginTop: '80px'
                    }}
                  >
                    {/* Main content - vertical layout */}
                    <div className="flex flex-col justify-between h-full" style={{gap: printSettings.size === 'card' ? '2px' : '4px'}}>
                      {/* Top - Product info */}
                      <div className="flex flex-col justify-center items-center text-center" style={{flex: 1}}>
                        {/* Price */}
                        <div 
                          className="font-bold"
                          style={{
                            fontSize: printSettings.size === 'card' ? '10px' : printSettings.size === 'thermal' ? '18px' : '22px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '0px' : '1px',
                            fontWeight: '800',
                            color: '#d32f2f'
                          }}
                        >
                          {formatNumber((selectedProduct as any).currentPrice || selectedProduct.price)} so'm
                        </div>

                        <div 
                          className="text-gray-600"
                          style={{
                            fontSize: printSettings.size === 'card' ? '6px' : printSettings.size === 'thermal' ? '12px' : '16px',
                            lineHeight: '1.0',
                            marginBottom: printSettings.size === 'card' ? '0.5px' : '1px',
                            fontWeight: '500',
                            color: '#666'
                          }}
                        >
                          Kod: {selectedProduct.code}
                        </div>

                        <div 
                          className="font-bold text-black"
                          style={{
                          fontSize: printSettings.size === 'card' ? '7px' : printSettings.size === 'thermal' ? '14px' : '18px',
                          lineHeight: '1.1',
                            marginBottom: printSettings.size === 'card' ? '0.5px' : '1px',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: printSettings.size === 'card' ? 1 : 2,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {selectedProduct.name}
                        </div>

                        {/* Additional info only in standard layout */}
                        {printSettings.layout === 'standard' && (
                          <div 
                            className="text-gray-500" 
                            style={{
                              fontSize: printSettings.size === 'card' ? '4px' : printSettings.size === 'thermal' ? '10px' : '12px',
                              lineHeight: '1.0',
                              margin: 0,
                              color: '#888',
                              fontWeight: '400'
                            }}
                          >
                            Miqdor: {selectedProduct.quantity} | {new Date().toLocaleDateString('uz-UZ')}
                          </div>
                        )}
                      </div>

                      {/* Bottom - QR Code */}
                      <div className="flex justify-center items-center" style={{
                        width: '100%',
                        height: 'auto',
                        padding: '2px 0'
                      }}>
                        <div style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: '#ffffff',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <QRCodeSVG
                            value={JSON.stringify({
                              id: selectedProduct._id,
                              code: selectedProduct.code,
                              name: selectedProduct.name,
                              price: selectedProduct.price
                            })}
                            size={printSettings.size === 'card' ? 60 : printSettings.size === 'thermal' ? 120 : 140}
                            level="H"
                            includeMargin={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              maxWidth: printSettings.size === 'card' ? '60px' : printSettings.size === 'thermal' ? '120px' : '140px',
                              maxHeight: printSettings.size === 'card' ? '60px' : printSettings.size === 'thermal' ? '120px' : '140px',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
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
                Print
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

      {/* Image Preview Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 sm:right-0 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors z-10"
              title="Yopish (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Container */}
            <div 
              className="relative bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Mahsulot rasmi"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>

            {/* Info Bar */}
            <div className="mt-4 text-center">
              <p className="text-white/80 text-sm">
                Yopish uchun rasmdan tashqariga bosing yoki ESC tugmasini bosing
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}