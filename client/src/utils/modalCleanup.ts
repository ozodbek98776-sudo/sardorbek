/**
 * Modal Cleanup Utility
 * Barcha ochiq modal va overlay larni tozalash
 */

export function cleanupAllModals() {
  console.log('🧹 Modal cleanup boshlandi...');
  
  // Body overflow ni qaytarish
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.classList.remove('overflow-hidden');
  
  // Barcha fixed overlay larni topish
  const selectors = [
    '.fixed.inset-0.bg-black',
    '.fixed.inset-0[class*="bg-black"]',
    '[data-modal="true"]',
    '.overlay',
    '.backdrop-blur',
    '.fixed.z-\\[70\\]',
    '.fixed.z-\\[80\\]',
    '.fixed.z-\\[90\\]',
    '.fixed.z-\\[100\\]'
  ];
  
  let removedCount = 0;
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Faqat overlay bo'lsa o'chirish (ichida content bo'lmasa)
        const hasContent = el.querySelector('div[class*="bg-white"], div[class*="rounded"]');
        if (!hasContent && el.classList.contains('bg-black')) {
          console.log('🗑️ Overlay topildi va o\'chirildi:', selector);
          el.remove();
          removedCount++;
        }
      });
    } catch (e) {
      console.warn('Selector xatosi:', selector, e);
    }
  });
  
  console.log(`✅ Modal cleanup tugadi. ${removedCount} ta overlay o'chirildi`);
  
  return removedCount;
}

// Debug funksiyasi - barcha fixed elementlarni ko'rsatish
export function debugFixedElements() {
  const fixed = document.querySelectorAll('.fixed');
  console.log('🔍 Barcha fixed elementlar:', fixed.length);
  
  fixed.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const zIndex = window.getComputedStyle(el).zIndex;
    const classes = el.className;
    
    console.log(`${i + 1}. Z-index: ${zIndex}, Classes: ${classes}`);
    console.log(`   Position: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
  });
}

// Window load da cleanup
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      cleanupAllModals();
    }, 100);
  });
  
  // Global funksiyalar
  (window as any).cleanupAllModals = cleanupAllModals;
  (window as any).debugFixedElements = debugFixedElements;
  
  console.log('💡 Debug: Browser console da `cleanupAllModals()` yoki `debugFixedElements()` ishlatishingiz mumkin');
}
