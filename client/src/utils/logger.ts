/**
 * Production-safe Logger
 * Console.log'larni production'da o'chirish uchun
 */

const isDevelopment = import.meta.env.MODE !== 'production';

const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: any[]) => {
    // Error'lar har doim log qilinadi
    console.error(...args);
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

export default logger;
