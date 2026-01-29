import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw, Package, Plus, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Image, Upload, Printer, Minus, Ruler, Box, Scale, RotateCcw, Scan } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { UPLOADS_URL } from '../../config/api';

export default function KassaProducts() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
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
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMainWarehouse();
  }, []);

  useEffect(() => {
    if (mainWarehouse) {
      fetchProducts();
    }
  }, [mainWarehouse]);

  // Mahsulotlar yuklanganida displayedProducts ni yangilash
  useEffect(() => {
    setDisplayedProducts(filteredProducts.slice(0, displayCount));
  }, [filteredProducts, displayCount]);

  // Infinite scroll uchun
  useEffect(() => {
    const container = productsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Foydalanuvchi pastga yaqinlashganda keyingi 20 ta mahsulotni yuklash
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && displayCount < filteredProducts.length) {
        setDisplayCount(prev => Math.min(prev + 20, filteredProducts.length));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [displayCount, filteredProducts.length]);

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
    setDisplayCount(20); // Reset display count when filter changes
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
      
      // Fetch all products without limit
      const res = await api.get('/products?mainOnly=true&limit=10000');
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

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if larger than 1920px
          if (width > 1920 || height > 1920) {
            const ratio = Math.min(1920 / width, 1920 / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to blob failed'));
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
    });
  };

  const handleImageUploadForProduct = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const product = products.find(p => p._id === productId);
    if (!product) return;

    const currentImages = (product as any).images || [];
    const remainingSlots = 8 - currentImages.length;
    
    if (remainingSlots <= 0) {
      showAlert('Maksimum 8 ta rasm yuklash mumkin', 'Ogohlantirish', 'warning');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validFiles = Array.from(files).filter(file => {
      if (!allowedTypes.includes(file.type)) {
        showAlert(`${file.name} - noto'g'ri format. Faqat JPG, PNG, WebP qabul qilinadi`, 'Xatolik', 'warning');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const filesToUpload = validFiles.slice(0, remainingSlots);
    const formDataUpload = new FormData();

    setUploading(true);
    setUploadingProductId(productId);
    
    try {
      // Compress each image before uploading
      for (const file of filesToUpload) {
        try {
          const compressedBlob = await compressImage(file);
          formDataUpload.append('images', compressedBlob, file.name);
        } catch (compressionError) {
          console.warn(`Image compression failed for ${file.name}, uploading original:`, compressionError);
          // If compression fails, upload original
          formDataUpload.append('images', file);
        }
      }
      
      // Upload images to server
      const res = await api.post('/products/upload-images', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newImages = [...currentImages, ...res.data.images];
      
      // Update product with new images using the kassa-specific route
      const updatedProduct = await api.put(`/products/${productId}/images`, {
        images: newImages
      });
      
      // Update only this product in the state (no need to fetch all products)
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p._id === productId ? { ...p, images: newImages } : p
        )
      );
      
      showAlert(`${res.data.images.length} ta rasm muvaffaqiyatli yuklandi!`, 'Muvaffaqiyat', 'success');
    } catch (err: any) {
      console.error('Error uploading images:', err);
      const errorMsg = err.response?.data?.message || 'Rasmlarni yuklashda xatolik';
      showAlert(errorMsg, 'Xatolik', 'danger');
    } finally {
      setUploading(false);
      setUploadingProductId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImageFromProduct = async (productId: string, imagePath: string) => {
    const confirmed = await showConfirm(
      "Rasmni o'chirishni tasdiqlaysizmi? Faqat siz yuklagan rasmlarni o'chirishingiz mumkin.",
      "O'chirish"
    );
    if (!confirmed) return;

    try {
      // Rasmni serverdan o'chirish
      const res = await api.delete('/products/delete-image', {
        data: { imagePath, productId }
      });

      // State'ni yangilash
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p._id === productId ? { ...p, images: res.data.images } : p
        )
      );

      showAlert('Rasm o\'chirildi', 'Muvaffaqiyat', 'success');
    } catch (err: any) {
      console.error('Error deleting image:', err);
      const errorMsg = err.response?.data?.message || 'Rasmni o\'chirishda xatolik';
      showAlert(errorMsg, 'Xatolik', 'danger');
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
  
  const printQRCodes = async (products: Product[]) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
      alert('Popup bloklangan. Iltimos, popup ga ruxsat bering.');
      return;
    }

    // QR kodlarni generatsiya qilish
    const qrPromises = products.map(async (product) => {
      try {
        const QRCode = (await import('qrcode')).default;
        const productUrl = `${window.location.origin}/product/${product._id}`;
        const dataUrl = await QRCode.toDataURL(productUrl, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        return { product, qrDataUrl: dataUrl };
      } catch (err) {
        console.error('QR generation error:', err);
        return { product, qrDataUrl: '' };
      }
    });

    const qrData = await Promise.all(qrPromises);

    // Label HTML yaratish
    let labelsHtml = '';
    qrData.forEach(({ product, qrDataUrl }) => {
      labelsHtml += `
        <div class="label">
          <div class="top-section">
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="QR" class="qr-code" />
            </div>
            <div class="info-box">
              <div class="product-code">Kod: ${product.code}</div>
              <div class="product-name">${product.name}</div>
            </div>
          </div>
          <div class="bottom-section">
            <div class="price-box">
              <span class="price-value">${formatNumber(product.price)}</span>
              <span class="price-currency">so'm</span>
            </div>
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Label</title>
        <style>
          @page {
            size: 60mm 40mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label {
            width: 60mm;
            height: 40mm;
            padding: 2mm;
            background: white;
            display: flex;
            flex-direction: column;
            page-break-after: always;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .top-section {
            display: flex;
            gap: 2mm;
            flex: 1;
          }
          .qr-box {
            width: 22mm;
            height: 22mm;
            flex-shrink: 0;
          }
          .qr-code {
            width: 22mm;
            height: 22mm;
            display: block;
            image-rendering: pixelated;
          }
          .info-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .product-code {
            font-size: 7pt;
            font-weight: 600;
            color: #666;
            margin-bottom: 1mm;
          }
          .product-name {
            font-size: 9pt;
            font-weight: 700;
            color: #000;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
          }
          .bottom-section {
            margin-top: 1.5mm;
          }
          .price-box {
            padding: 1.5mm;
            text-align: center;
            background: #f0f0f0;
            border-radius: 1mm;
          }
          .price-value {
            font-size: 14pt;
            font-weight: 900;
            color: #000;
            letter-spacing: -0.5px;
          }
          .price-currency {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            margin-left: 1mm;
          }
          @media print {
            body { background: white; }
          }
          @media screen {
            body { background: #e5e7eb; padding: 10mm; }
            .label { 
              margin-bottom: 5mm;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 200);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
      const imagePath = typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path;
      return `${UPLOADS_URL}${imagePath}`;
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

        {/* Compact Stats - Admin Products ga o'xshash */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`bg-white rounded-lg sm:rounded-xl border-2 transition-all ${
                stat.filter ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''
              } ${
                stockFilter === stat.filter ? 'border-brand-500 shadow-md' : 'border-surface-200'
              }`}
            >
              <div className="p-2 sm:p-2.5 md:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center bg-${stat.color}-50`}>
                    <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-${stat.color}-600`} />
                  </div>
                  <p className="text-[10px] sm:text-xs text-surface-500 font-medium">{stat.label}</p>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-surface-900">{stat.value}</p>
              </div>
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
              <p className="text-surface-500 text-center max-w-md">
                {searchTerm ? 'Qidiruv bo\'yicha tovarlar topilmadi' : 'Tovarlar mavjud emas'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="table-header">
                  <div className="grid grid-cols-14 gap-2 px-4 py-4">
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
                  </div>
                </div>
                {/* Scrollable table body */}
                <div className="max-h-[calc(100vh-400px)] overflow-y-auto divide-y divide-surface-100">
                  {filteredProducts.map(product => (
                    <div key={product._id} className="grid grid-cols-14 gap-2 px-4 py-3 items-center hover:bg-surface-50 transition-colors relative">
                      <div className="col-span-1">
                        {getProductImage(product) ? (
                          <div className="relative">
                            <img 
                              src={getProductImage(product)!} 
                              alt={product.name} 
                              className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => {
                                setSelectedImage(getProductImage(product));
                                setShowImageModal(true);
                              }}
                            />
                            {/* Rasm yuklash tugmasi - juda kichik */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadingProductId(product._id);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploading && uploadingProductId === product._id}
                              className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-50"
                              title="Rasm yuklash"
                            >
                              {uploading && uploadingProductId === product._id ? (
                                <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-2 h-2 text-white" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center">
                              <Image className="w-5 h-5 text-surface-400" />
                            </div>
                            {/* Rasm yuklash tugmasi - juda kichik */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadingProductId(product._id);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploading && uploadingProductId === product._id}
                              className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-50"
                              title="Rasm yuklash"
                            >
                              {uploading && uploadingProductId === product._id ? (
                                <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-2 h-2 text-white" />
                              )}
                            </button>
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
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:hidden">
                {/* Kassa POS style products grid - 20 tadan yuklanish */}
                <div 
                  ref={productsContainerRef}
                  className="max-h-[calc(100vh-300px)] overflow-y-auto p-3 sm:p-4"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3">
                    {displayedProducts.map(product => (
                      <div
                        key={product._id}
                        className="group bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all p-2 sm:p-4 relative"
                      >
                        {/* Mahsulot kartasi */}
                        <div className="w-full">
                          <div 
                            className="w-full aspect-square bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl border-2 border-brand-200 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 transition-transform overflow-hidden cursor-pointer relative"
                            onClick={() => {
                              if (product.images && product.images.length > 0) {
                                const imagePath = typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path;
                                setSelectedImage(`${UPLOADS_URL}${imagePath}`);
                                setShowImageModal(true);
                              }
                            }}
                          >
                            {product.images && product.images.length > 0 ? (
                              <>
                                <img 
                                  src={`${UPLOADS_URL}${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path}`}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Rasm yuklanmasa, default icon ko'rsatish
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<svg class="w-6 h-6 sm:w-8 sm:h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                  }}
                                />
                              </>
                            ) : (
                              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-brand-600" />
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 text-[10px] sm:text-sm truncate">{product.name}</p>
                          
                          {/* Kod va rasm yuklash tugmasi - bir qatorda */}
                          <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                            <p className="text-[9px] sm:text-xs text-slate-500">{product.code}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadingProductId(product._id);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploading && uploadingProductId === product._id}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-50"
                              title="Rasm yuklash"
                            >
                              {uploading && uploadingProductId === product._id ? (
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Upload className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                              )}
                            </button>
                          </div>
                          
                          <p className="font-bold text-brand-600 text-[10px] sm:text-sm">{formatNumber(product.price)} so'm</p>
                          <p className="text-[9px] sm:text-xs text-slate-500 mt-1">Mavjud: {product.quantity} ta</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Loading indicator for infinite scroll */}
                  {displayCount < filteredProducts.length && (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                {/* Hidden file input for image upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (uploadingProductId) {
                      handleImageUploadForProduct(uploadingProductId, e);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 pt-4 sm:p-4">
          <div className="overlay" onClick={closeModal} />
          <div className="modal w-full sm:max-w-lg p-4 sm:p-6 relative z-10 max-h-[calc(100vh-120px)] sm:max-h-[85vh] overflow-y-auto rounded-2xl">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-white pb-3 border-b border-surface-200 -mx-4 sm:-mx-6 px-4 sm:px-6 z-10">
              <h3 className="text-base sm:text-lg font-semibold text-surface-900">{editingProduct ? 'Tovarni tahrirlash' : 'Yangi tovar'}</h3>
              <button onClick={closeModal} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Image Upload */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1.5 sm:mb-2 block">Rasmlar (max 8)</label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={`${UPLOADS_URL}${img}`} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-danger-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                        <div className="spinner w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-surface-400 mb-0.5 sm:mb-1" />
                          <span className="text-[10px] sm:text-xs text-surface-500">Yuklash</span>
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

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1.5 sm:mb-2 block">Kod</label>
                  <input 
                    type="text" 
                    className={`input text-sm sm:text-base py-2 sm:py-2.5 ${codeError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}`}
                    placeholder="1" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    onBlur={e => checkCodeExists(e.target.value)}
                    required 
                  />
                  {codeError && <p className="text-xs sm:text-sm text-danger-600 mt-1">{codeError}</p>}
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1.5 sm:mb-2 block">Miqdori</label>
                  {editingProduct ? (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-3 bg-surface-100 rounded-xl text-center font-semibold text-surface-900 text-sm sm:text-base">
                        {formatNumber(formData.quantity || 0)}
                      </div>
                      <button type="button" onClick={() => openQuantityModal('add')} className="btn-icon bg-success-100 text-success-600 hover:bg-success-200 w-8 h-8 sm:w-10 sm:h-10">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button type="button" onClick={() => openQuantityModal('subtract')} className="btn-icon bg-danger-100 text-danger-600 hover:bg-danger-200 w-8 h-8 sm:w-10 sm:h-10">
                        <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  ) : (
                    <input type="text" className="input text-sm sm:text-base py-2 sm:py-2.5" placeholder="0" value={formatInputNumber(formData.quantity)} onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})} required />
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1.5 sm:mb-2 block">Nomi</label>
                <input type="text" className="input text-sm sm:text-base py-2 sm:py-2.5" placeholder="Tovar nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              
              {/* Oldingi va hozirgi narxlar */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1.5 sm:mb-2 block">Oldingi narxi (so'm)</label>
                  <input type="text" className="input text-sm sm:text-base py-2 sm:py-2.5" placeholder="0" value={formatInputNumber(formData.previousPrice)} onChange={e => setFormData({...formData, previousPrice: parseNumber(e.target.value)})} />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1.5 sm:mb-2 block">Hozirgi narxi (so'm)</label>
                  <input type="text" className="input text-sm sm:text-base py-2 sm:py-2.5" placeholder="0" value={formatInputNumber(formData.currentPrice)} onChange={e => setFormData({...formData, currentPrice: parseNumber(e.target.value)})} required />
                  {/* Chegirma foizi ko'rsatish */}
                  {formData.previousPrice && formData.currentPrice && Number(formData.previousPrice) > 0 && Number(formData.currentPrice) > 0 && (
                    <div className="mt-1.5 sm:mt-2">
                      {(() => {
                        const oldPrice = Number(formData.previousPrice);
                        const newPrice = Number(formData.currentPrice);
                        const discountPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                        
                        if (discountPercent > 0) {
                          return (
                            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 rounded-lg">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs sm:text-sm font-medium text-green-700">{discountPercent}% chegirma</span>
                            </div>
                          );
                        } else if (discountPercent < 0) {
                          return (
                            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 rounded-lg">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs sm:text-sm font-medium text-red-700">{Math.abs(discountPercent)}% qimmatroq</span>
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
              
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 sticky bottom-0 bg-white pb-safe -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-surface-200 mt-4 z-10">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-sm sm:text-base py-2.5 sm:py-3">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1 text-sm sm:text-base py-2.5 sm:py-3" disabled={!!codeError}>Saqlash</button>
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