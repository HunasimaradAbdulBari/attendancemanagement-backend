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

// Admin creation - Allow first admin creation without auth
router.post('/create', async (req, res, next) => {
  try {
    const Admin = require('../models/Admin');
    const adminCount = await Admin.countDocuments({});
    
    if (adminCount === 0) {
      // First admin creation - no auth required
      return createAdmin(req, res);
    } else {
      // Subsequent admin creation - requires auth and admin role
      return authMiddleware(req, res, () => {
        return roleMiddleware('admin')(req, res, () => {
          return createAdmin(req, res);
        });
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard and statistics
router.get('/dashboard/stats', authMiddleware, roleMiddleware('admin'), getDashboardStats);

// Bulk operations
router.post('/bulk/students', authMiddleware, roleMiddleware('admin'), bulkCreateStudents);

// System settings
router.get('/settings', authMiddleware, roleMiddleware('admin'), getSystemSettings);
router.put('/settings', authMiddleware, roleMiddleware('admin'), updateSystemSettings);

module.exports = router;