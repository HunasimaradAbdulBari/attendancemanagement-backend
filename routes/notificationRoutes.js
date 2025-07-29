const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  getNotificationSummary
} = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all notifications for authenticated user
router.get('/', authMiddleware, getNotifications);

// Get notification summary for dashboard widgets
router.get('/summary', authMiddleware, getNotificationSummary);

// Mark specific notification as read
router.put('/:notificationId/read', authMiddleware, markAsRead);

module.exports = router;