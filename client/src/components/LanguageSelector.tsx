import { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

const languages = [
  { code: 'uz' as Language, name: 'O\'zbekcha', flag: '🇺🇿' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
];

interface LanguageSelectorProps {
  variant?: 'header' | 'sidebar' | 'login';
}

export default function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  if (variant === 'login') {
    return (
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl text-sm font-medium text-slate-700 hover:bg-white/90 transition-all duration-200 shadow-sm"
          >
            <span className="text-lg">{currentLanguage?.flag}</span>
            <span className="hidden sm:block">{currentLanguage?.name}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                    language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.code && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-4 py-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-2xl transition-all duration-200"
        >
          <Globe className="w-5 h-5" />
          <span className="font-medium">{currentLanguage?.name}</span>
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                  language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {language === lang.code && <Check className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Header variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200"
        title="Change Language"
      >
        <Globe className="w-5 h-5" />
        <span className="hidden lg:block text-sm font-medium">{currentLanguage?.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                language === lang.code ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
              {language === lang.code && <Check className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}