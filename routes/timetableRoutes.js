const express = require('express');
const router = express.Router();
const {
  getTimetable,
  createTimetable,
  getTeacherClasses,
  getHolidays
} = require('../controllers/timetableController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// ✅ Specific routes first!
router.get('/teacher/classes', authMiddleware, roleMiddleware('teacher'), getTeacherClasses);
router.get('/holidays/:class/:section', authMiddleware, getHolidays);

// ✅ Then the generic ones
router.get('/:class/:section', authMiddleware, getTimetable);
router.post('/', createTimetable);

module.exports = router;
