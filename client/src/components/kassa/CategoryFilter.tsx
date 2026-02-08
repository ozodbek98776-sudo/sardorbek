import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Subcategory {
  _id: string;
  name: string;
  order: number;
}

interface Category {
  _id: string;
  name: string;
  subcategories?: Subcategory[];
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  selectedSubcategory?: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange?: (subcategory: string) => void;
}

export function CategoryFilter({ 
  categories, 
  selectedCategory,
  selectedSubcategory = '',
  onCategoryChange,
  onSubcategoryChange
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSubcategories, setShowSubcategories] = useState(false);

  const handleCategorySelect = (category: string) => {
    onCategoryChange(category);
    if (onSubcategoryChange) {
      onSubcategoryChange(''); // Reset subcategory
    }
    setShowSubcategories(!!category); // Show subcategories if category selected
  };

  const handleSubcategorySelect = (subcategory: string) => {
    if (onSubcategoryChange) {
      onSubcategoryChange(subcategory);
    }
  };

  // Tanlangan kategoriyaning bo'limlari
  const currentSubcategories = selectedCategory 
    ? categories.find(c => c.name === selectedCategory)?.subcategories || []
    : [];

  return (
    <div className="space-y-2">
      {/* Horizontal Scrollable Categories - Telegram style */}
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {/* Barchasi button */}
        <button
          onClick={() => {
            handleCategorySelect('');
            setShowSubcategories(false);
          }}
          className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all ${
            selectedCategory === '' 
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' 
              : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-purple-400'
          }`}
        >
          Barchasi
        </button>
        
        {/* Category buttons */}
        {categories.map(category => (
          <button
            key={category._id}
            onClick={() => handleCategorySelect(category.name)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-1 ${
              selectedCategory === category.name 
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' 
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-purple-400'
            }`}
          >
            {category.name}
            {category.subcategories && category.subcategories.length > 0 && (
              <ChevronDown className={`w-3 h-3 transition-transform ${
                selectedCategory === category.name && showSubcategories ? 'rotate-180' : ''
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* Subcategories - Show when category is selected */}
      {selectedCategory && currentSubcategories.length > 0 && showSubcategories && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pl-4">
          {/* Hammasi button for subcategories */}
          <button
            onClick={() => handleSubcategorySelect('')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full font-medium text-xs transition-all ${
              selectedSubcategory === '' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-blue-400'
            }`}
          >
            Hammasi
          </button>
          
          {currentSubcategories.map(sub => (
            <button
              key={sub._id}
              onClick={() => handleSubcategorySelect(sub.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full font-medium text-xs transition-all ${
                selectedSubcategory === sub.name 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-blue-400'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Hide scrollbar with CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

