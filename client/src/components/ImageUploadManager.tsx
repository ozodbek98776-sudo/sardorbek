import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, Loader } from 'lucide-react';
import CameraCapture from './CameraCapture';
import api from '../utils/api';
import { UPLOADS_URL } from '../config/api';

interface ImageUploadManagerProps {
  maxImages?: number;
  onImagesChange: (imagePaths: string[]) => void;
  initialImages?: string[];
}

export default function ImageUploadManager({
  maxImages = 8,
  onImagesChange,
  initialImages = []
}: ImageUploadManagerProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MUAMMO 5 YECHIMI: initialImages o'zgarganda state yangilash
  useEffect(() => {
    setUploadedImages(initialImages);
  }, [initialImages]);

  // Cleanup function - komponent unmount bo'lganda yoki modal yopilganda
  // keraksiz rasmlarni o'chirish uchun
  const cleanupUnusedImages = async (imagesToCleanup: string[]) => {
    if (imagesToCleanup.length === 0) return;
    
    try {
      console.log('🧹 Cleaning up unused images:', imagesToCleanup);
      await api.post('/products/cleanup-images', { imagePaths: imagesToCleanup });
      console.log('✅ Cleanup successful');
    } catch (err) {
      console.error('❌ Cleanup error:', err);
      // Cleanup xatosi muhim emas, faqat log qilamiz
    }
  };

  // Rasmlarni serverga yuklash
  const uploadImagesToServer = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      console.log('📤 Uploading images:', files.length);
      console.log('📤 Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      const response = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('📥 Upload response status:', response.status);
      console.log('📥 Upload response data:', response.data);
      
      // MUAMMO 3 YECHIMI: Response structure ni to'g'ri handle qilish
      let newImagePaths: any[] = [];
      
      if (response.data.images) {
        newImagePaths = response.data.images;
        console.log('📥 Images from response.data.images:', newImagePaths);
      } else if (Array.isArray(response.data)) {
        newImagePaths = response.data;
        console.log('📥 Images from response.data (array):', newImagePaths);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        newImagePaths = response.data.data;
        console.log('📥 Images from response.data.data:', newImagePaths);
      } else {
        console.warn('⚠️ Unexpected response structure:', response.data);
        newImagePaths = [];
      }

      // Path stringlarni extract qilish - object yoki string bo'lishi mumkin
      const imagePaths = newImagePaths.map((img: any) => {
        let path = '';
        if (typeof img === 'string') {
          path = img;
        } else if (img.path) {
          path = img.path;
        } else if (img.url) {
          path = img.url;
        } else {
          console.warn('⚠️ Unknown image format:', img);
          path = '';
        }
        
        // Path ni normalizatsiya qilish - faqat path qaytarish, URL emas
        if (path.startsWith('http')) {
          // Agar to'liq URL bo'lsa, faqat path qismini olish
          try {
            const url = new URL(path);
            path = url.pathname;
          } catch {
            // URL parse qila olmasa, o'zini qaytarish
          }
        }
        
        console.log('🖼️ Processed image path:', path);
        return path;
      }).filter(p => p); // Bo'sh pathlarni filtrlash

      console.log('✅ Images uploaded successfully:', imagePaths);
      return imagePaths;
    } catch (err: any) {
      console.error('❌ Error uploading images:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error message:', err.message);
      setError('Rasmlarni yuklashda xatolik: ' + (err.response?.data?.message || err.message));
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  // Gallery dan rasm qo'shish
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Maksimal rasm sonini tekshirish
    if (uploadedImages.length + files.length > maxImages) {
      setError(`Maksimal ${maxImages} ta rasm yuklash mumkin`);
      return;
    }

    // Rasmlarni yuklash
    const newImagePaths = await uploadImagesToServer(files);

    if (newImagePaths.length > 0) {
      const updatedImages = [...uploadedImages, ...newImagePaths];
      setUploadedImages(updatedImages);
      onImagesChange(updatedImages);
    }

    // File input'ni reset qilish
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Camera dan rasm qo'shish
  const handleCameraCapture = async (file: File) => {
    // Maksimal rasm sonini tekshirish
    if (uploadedImages.length >= maxImages) {
      setError(`Maksimal ${maxImages} ta rasm yuklash mumkin`);
      return;
    }

    // Rasmni yuklash
    const newImagePaths = await uploadImagesToServer([file]);

    if (newImagePaths.length > 0) {
      const updatedImages = [...uploadedImages, ...newImagePaths];
      setUploadedImages(updatedImages);
      onImagesChange(updatedImages);
      setShowCamera(false);
    }
  };

  // Rasmni o'chirish
  const removeImage = (index: number) => {
    const updatedImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updatedImages);
    onImagesChange(updatedImages);
  };

  // Xatoni o'chirish
  const clearError = () => setError(null);

  return (
    <div className="space-y-4">
      {/* Xato xabari */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Yuklangan rasmlar */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {uploadedImages.map((imagePath, index) => {
            // MUAMMO 2 YECHIMI: Path handling to'g'rilash
            let imageUrl = imagePath;
            
            // Agar to'liq URL bo'lsa, o'zgartirishsiz qoldirish
            if (!imagePath.startsWith('http')) {
              // Path ni normalizatsiya qilish
              let normalizedPath = imagePath;
              
              // Agar path `/uploads/` bilan boshlanmasa, qo'shish
              if (!normalizedPath.startsWith('/uploads/')) {
                normalizedPath = `/uploads/products/${normalizedPath}`;
              }
              
              // Base URL qo'shish
              imageUrl = `${UPLOADS_URL}${normalizedPath}`;
            }
            
            console.log(`🖼️ Image ${index + 1} URL:`, imageUrl);
            
            return (
              <div key={`uploaded-${index}`} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Rasm ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    console.error(`❌ Image ${index + 1} load error:`, imageUrl);
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3ERasm yuklana olmadi%3C/text%3E%3C/svg%3E';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Rasm qo'shish tugmalari */}
      {uploadedImages.length < maxImages && (
        <div className="flex gap-2">
          {/* Gallery tugmasi */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Yuklanmoqda...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Galereyadan
              </>
            )}
          </button>

          {/* Camera tugmasi */}
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={isUploading}
            className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            Kameradan
          </button>
        </div>
      )}

      {/* Rasm soni */}
      <p className="text-xs text-gray-500 text-center">
        {uploadedImages.length}/{maxImages} ta rasm
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
