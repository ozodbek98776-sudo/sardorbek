import { useState, useRef } from 'react';
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
      const response = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('📥 Upload response:', response.data);
      const newImagePaths = response.data.images || [];

      // Extract path strings from image objects
      const imagePaths = newImagePaths.map((img: any) =>
        typeof img === 'string' ? img : img.path
      );

      console.log('✅ Images uploaded:', imagePaths);
      return imagePaths;
    } catch (err) {
      console.error('❌ Error uploading images:', err);
      setError('Rasmlarni yuklashda xatolik');
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
          {uploadedImages.map((imagePath, index) => (
            <div key={`uploaded-${index}`} className="relative group">
              <img
                src={`${UPLOADS_URL}${imagePath}`}
                alt={`Rasm ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
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
