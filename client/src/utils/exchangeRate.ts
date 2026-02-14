/**
 * USD to UZS Exchange Rate Utilities
 */

export const getExchangeRate = (): number => {
  const saved = localStorage.getItem('usdToUzsRate');
  return saved ? Number(saved) : 12000;
};

export const convertUsdToUzs = (usd: number): number => {
  const rate = getExchangeRate();
  // O'nlik sonlarni qo'llab-quvvatlash uchun
  const result = usd * rate;
  // Agar natija o'nlik bo'lsa, saqlab qolish, aks holda yumarlash
  return result % 1 === 0 ? Math.round(result) : Math.round(result * 100) / 100;
};

export const convertUzsToUsd = (uzs: number): number => {
  const rate = getExchangeRate();
  return Math.round((uzs / rate) * 100) / 100;
};
