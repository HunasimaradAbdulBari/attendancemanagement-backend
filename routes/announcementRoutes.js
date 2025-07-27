const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead,
  getAnnouncementStats
} = require('../controllers/announcementController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Public routes (authenticated users)
router.get('/', authMiddleware, getAnnouncements);
router.put('/:id/read', authMiddleware, markAsRead);

// Teacher/Admin routes
router.post('/', authMiddleware, roleMiddleware('teacher', 'admin'), createAnnouncement);
router.put('/:id', authMiddleware, roleMiddleware('teacher', 'admin'), updateAnnouncement);
router.delete('/:id', authMiddleware, roleMiddleware('teacher', 'admin'), deleteAnnouncement);

// Admin/Teacher stats routes
router.get('/:id/stats', authMiddleware, roleMiddleware('teacher', 'admin'), getAnnouncementStats);

module.exports = router;