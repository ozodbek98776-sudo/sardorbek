import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallButtonProps {
  variant?: 'button' | 'icon' | 'navbar';
  className?: string;
}

export default function PWAInstallButton({ variant = 'button', className = '' }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
    
    setIsIOS(iOS);
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    } else if (isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  const AppleIcon = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = {
      sm: { container: 'w-8 h-9', apple: 'w-7 h-8' },
      md: { container: 'w-10 h-11', apple: 'w-9 h-10' },
      lg: { container: 'w-12 h-13', apple: 'w-11 h-12' }
    };
    
    const s = sizes[size];
    
    return (
      <div className={`${s.container} relative flex items-center justify-center`}>
        <svg 
          className={`${s.apple} fill-current drop-shadow-2xl`} 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="appleGlow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#e5e7eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#111827" stopOpacity="1" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Apple logo with realistic gradient and glow */}
          <path 
            fill="url(#appleGlow)" 
            filter="url(#glow)"
            d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
          />
          
          {/* Download indicator with pulsing animation */}
          <circle cx="19" cy="5" r="4.5" className="fill-blue-500 animate-pulse drop-shadow-lg"/>
          <circle cx="19" cy="5" r="3.8" className="fill-blue-400"/>
          <path d="M19 2v6M16.5 5h5" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="drop-shadow-sm"/>
          <path d="M17 6.5l2 1.5 2-1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm"/>
        </svg>
      </div>
    );
  };

  const IOSInstructions = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-700/50 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-3xl"></div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center shadow-xl border border-gray-700/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-3xl"></div>
              <AppleIcon size="lg" />
            </div>
            <h3 className="text-2xl font-bold text-white">Ilovani yuklab olish</h3>
          </div>
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="p-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-3xl border border-gray-700/30 shadow-lg backdrop-blur-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center shadow-xl border border-gray-700/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-3xl"></div>
              <AppleIcon size="lg" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">iPhone/iPad uchun</p>
              <p className="text-sm text-gray-300 font-medium">Safari brauzeridan foydalaning</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { step: 1, text: "Safari brauzerida sahifani oching", emoji: "🌐" },
              { step: 2, text: "Pastdagi 'Ulashish' tugmasini bosing", emoji: "📤" },
              { step: 3, text: "'Bosh ekranga qo'shish' ni tanlang", emoji: "📱" },
              { step: 4, text: "'Qo'shish' tugmasini bosing", emoji: "✅" }
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-gray-200 font-medium flex items-center gap-2">
                    <span className="text-lg">{item.emoji}</span>
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="w-full mt-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 relative z-10"
        >
          Tushundim 👍
        </button>
      </div>
    </div>
  );

  if (!deferredPrompt && !isIOS) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`p-3 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black hover:from-gray-800 hover:to-gray-900 border border-gray-700/50 shadow-2xl hover:shadow-3xl transition-all duration-300 text-white hover:scale-110 relative overflow-hidden ${className}`}
          title="Ilovani yuklab olish"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-2xl"></div>
          <AppleIcon size="md" />
        </button>
        {showInstallPrompt && isIOS && <IOSInstructions />}
      </>
    );
  }

  if (variant === 'navbar') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-black hover:from-gray-800 hover:to-gray-900 border border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 text-white hover:scale-105 relative overflow-hidden ${className}`}
          title="Ilovani yuklab olish"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-2xl"></div>
          <AppleIcon size="sm" />
          <span className="hidden sm:inline text-sm font-semibold">Yuklab olish</span>
        </button>
        {showInstallPrompt && isIOS && <IOSInstructions />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-black hover:from-gray-800 hover:to-gray-900 text-white rounded-3xl shadow-2xl hover:shadow-3xl border border-gray-700/50 transition-all duration-300 font-semibold text-lg hover:scale-105 relative overflow-hidden ${className}`}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-3xl"></div>
        <AppleIcon size="lg" />
        <span className="relative z-10">Ilovani yuklab olish</span>
      </button>
      {showInstallPrompt && isIOS && <IOSInstructions />}
    </>
  );
}