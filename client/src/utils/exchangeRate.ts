/**
 * USD to UZS Exchange Rate Utilities
 * Server-based: barcha foydalanuvchilarga bir xil kurs
 */
import api from './api';

let cachedRate: number = 12000;
let lastFetch: number = 0;
const CACHE_TTL = 60000; // 1 minut cache

// Serverdan kursni olish
export const fetchExchangeRate = async (): Promise<number> => {
  try {
    const { data } = await api.get('/settings/exchange-rate');
    cachedRate = data.rate || 12000;
    lastFetch = Date.now();
    return cachedRate;
  } catch {
    return cachedRate;
  }
};

// Kursni sinxron olish (cache dan)
export const getExchangeRate = (): number => {
  // Agar cache eskirgan bo'lsa, background da yangilash
  if (Date.now() - lastFetch > CACHE_TTL) {
    fetchExchangeRate();
  }
  return cachedRate;
};

// Kursni to'g'ridan-to'g'ri set qilish (socket orqali kelganda)
export const setExchangeRate = (rate: number): void => {
  cachedRate = rate;
  lastFetch = Date.now();
};

// Serverga kursni saqlash
export const saveExchangeRate = async (rate: number): Promise<boolean> => {
  try {
    await api.put('/settings/exchange-rate', { rate });
    cachedRate = rate;
    lastFetch = Date.now();
    return true;
  } catch {
    return false;
  }
};

export const convertUsdToUzs = (usd: number): number => {
  const rate = getExchangeRate();
  const result = usd * rate;
  return result % 1 === 0 ? Math.round(result) : Math.round(result * 100) / 100;
};

export const convertUzsToUsd = (uzs: number): number => {
  const rate = getExchangeRate();
  return Math.round((uzs / rate) * 100) / 100;
};
