const Timetable = require('../models/Timetable');
const User = require('../models/User');

// Get Timetable (Student/Teacher)
exports.getTimetable = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    const timetable = await Timetable.findOne({
      class: className,
      section: section
    }).populate('schedule.periods.teacher', 'name');

    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    res.json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create/Update Timetable (Admin)
exports.createTimetable = async (req, res) => {
  try {
    const { class: className, section, schedule, holidays } = req.body;

    let timetable = await Timetable.findOne({
      class: className,
      section: section
    });

    if (timetable) {
      timetable.schedule = schedule;
      timetable.holidays = holidays;
      await timetable.save();
    } else {
      timetable = new Timetable({
        class: className,
        section: section,
        schedule,
        holidays
      });
      await timetable.save();
    }

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      timetable
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Teacher's Classes
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      assignedClasses: teacher.assignedClasses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Holidays
exports.getHolidays = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    const timetable = await Timetable.findOne({
      class: className,
      section: section
    });

    const holidays = timetable ? timetable.holidays : [];

    res.json({ success: true, holidays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};