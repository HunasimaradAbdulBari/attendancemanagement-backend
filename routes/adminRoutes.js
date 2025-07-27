const express = require('express');
const router = express.Router();
const {
  adminLogin,
  createAdmin,
  getDashboardStats,
  bulkCreateStudents,
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Admin authentication
router.post('/login', adminLogin);

// Admin management (Super Admin only)
router.post('/create', authMiddleware, roleMiddleware('admin'), createAdmin);

// Dashboard and statistics
router.get('/dashboard/stats', authMiddleware, roleMiddleware('admin'), getDashboardStats);

// Bulk operations
router.post('/bulk/students', authMiddleware, roleMiddleware('admin'), bulkCreateStudents);

// System settings
router.get('/settings', authMiddleware, roleMiddleware('admin'), getSystemSettings);
router.put('/settings', authMiddleware, roleMiddleware('admin'), updateSystemSettings);

module.exports = router;