import { useBackSwipe } from '../hooks/useBackSwipe';

/**
 * Mobil qurilmalar uchun professional global navigatsiya komponenti.
 * Bu komponent vizual ko'rinishga ega emas, faqat swipe funksiyasini ishga tushiradi.
 * App.tsx da BrowserRouter ichiga qo'yilishi kerak.
 * 
 * Xususiyatlar:
 * - Ekranning istalgan joyidan o'nga swipe = orqaga qaytish
 * - Smooth va responsive
 * - Input va modal larda ishlamaydi
 * - Vertikal scroll bilan konflikt qilmaydi
 */
const SwipeNavigator = () => {
  // Professional swipe navigatsiyasini faollashtirish
  useBackSwipe({
    threshold: 80,           // Minimal 80px surish kerak (professional feel)
    edgeThreshold: 30,       // Edge mode uchun (hozir ishlatilmaydi)
    disableOnInput: true,    // Inputlarda yozayotganda ishlamaydi
    fullScreenSwipe: true    // Ekranning istalgan joyidan swipe qilish
  });

  return null; // Vizual hech narsa qaytarmaydi
};

export default SwipeNavigator;
