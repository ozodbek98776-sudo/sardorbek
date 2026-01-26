/**
 * Production-safe Logger
 * Console.log'larni production'da o'chirish uchun
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args) => {
    // Error'lar har doim log qilinadi
    console.error(...args);
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

module.exports = logger;
