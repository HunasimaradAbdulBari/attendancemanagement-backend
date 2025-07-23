const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher'); // Import Teacher model instead of User

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

// Get Teacher's Classes - FIXED VERSION
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id; // This comes from your auth middleware
    
    // Use Teacher model instead of User model
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ message: 'Teacher account is inactive' });
    }

    res.json({
      success: true,
      assignedClasses: teacher.assignedClasses,
      teacherInfo: {
        name: teacher.name,
        employeeId: teacher.employeeId,
        subjects: teacher.subjects
      }
    });
  } catch (error) {
    console.error('Error in getTeacherClasses:', error);
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