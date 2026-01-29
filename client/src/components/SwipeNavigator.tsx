import { useBackSwipe } from '../hooks/useBackSwipe';

/**
 * Mobil qurilmalar uchun global navigatsiya komponenti.
 * Bu komponent vizual ko'rinishga ega emas, faqat swipe funksiyasini ishga tushiradi.
 * App.tsx da BrowserRouter ichiga qo'yilishi kerak.
 */
const SwipeNavigator = () => {
  // Swipe navigatsiyasini faollashtirish
  useBackSwipe({
    threshold: 60,      // Minimal 60px surish kerak
    edgeThreshold: 30,  // Ekran chetidan 30px masofa
    disableOnInput: true // Inputlarda yozayotganda ishlamaydi
  });

  return null; // Vizual hech narsa qaytarmaydi
};

export default SwipeNavigator;
