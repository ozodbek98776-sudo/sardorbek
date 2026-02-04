// Performance monitoring middleware
const logger = require('../services/loggerService');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowRequests: []
    };
    
    this.slowRequestThreshold = 1000; // 1 soniya
    this.maxSlowRequests = 10;
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Response tugaganda
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.metrics.requests++;
        this.metrics.totalResponseTime += duration;
        
        if (res.statusCode >= 400) {
          this.metrics.errors++;
        }
        
        // Sekin so'rovlarni yozib olish
        if (duration > this.slowRequestThreshold) {
          this.metrics.slowRequests.push({
            method: req.method,
            path: req.path,
            duration,
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode
          });
          
          // Faqat oxirgi 10 ta sekin so'rovni saqlash
          if (this.metrics.slowRequests.length > this.maxSlowRequests) {
            this.metrics.slowRequests.shift();
          }
          
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.path,
            duration: `${duration}ms`,
            statusCode: res.statusCode
          });
        }
      });
      
      next();
    };
  }

  getMetrics() {
    const avgResponseTime = this.metrics.requests > 0 
      ? Math.round(this.metrics.totalResponseTime / this.metrics.requests)
      : 0;
    
    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 
        ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2) + '%'
        : '0%',
      avgResponseTime: avgResponseTime + 'ms',
      slowRequests: this.metrics.slowRequests,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowRequests: []
    };
  }
}

module.exports = new PerformanceMonitor();
