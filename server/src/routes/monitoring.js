const express = require('express');
const { isAdmin } = require('../middleware/auth');
const performanceMonitor = require('../middleware/performanceMonitor');
const backupService = require('../services/backupService');

const router = express.Router();

// Get performance metrics (admin only)
router.get('/metrics', isAdmin, (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset metrics (admin only)
router.post('/metrics/reset', isAdmin, (req, res) => {
  try {
    performanceMonitor.reset();
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get system info (admin only)
router.get('/system', isAdmin, (req, res) => {
  try {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    res.json({
      success: true,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        cpu: {
          user: Math.round(cpuUsage.user / 1000),
          system: Math.round(cpuUsage.system / 1000)
        },
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        },
        env: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// List backups (admin only)
router.get('/backups', isAdmin, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json({
      success: true,
      backups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create manual backup (admin only)
router.post('/backups', isAdmin, async (req, res) => {
  try {
    const filepath = await backupService.createBackup();
    res.json({
      success: true,
      message: 'Backup created successfully',
      filepath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Restore backup (admin only)
router.post('/backups/restore', isAdmin, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }
    
    await backupService.restoreBackup(filename);
    res.json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);
  
  return parts.join(' ') || '0s';
}

module.exports = router;
