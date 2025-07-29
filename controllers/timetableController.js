const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');

// Get Timetable (Student/Teacher)
exports.getTimetable = async (req, res) => {
  try {
    const { class: className, section } = req.params;
    
    const timetable = await Timetable.findOne({
      class: className,
      section: section
    }).populate('schedule.periods.teacher', 'name');

    if (!timetable) {
      return res.status(404).json({ 
        success: false,
        message: 'Timetable not found' 
      });
    }

    res.json({ 
      success: true, 
      timetable 
    });
  } catch (error) {
    console.error('Error getting timetable:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Create/Update Timetable (Admin)
exports.createTimetable = async (req, res) => {
  try {
    const { class: className, section, schedule, holidays } = req.body;

    if (!className || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class and section are required'
      });
    }

    let timetable = await Timetable.findOne({
      class: className,
      section: section
    });

    if (timetable) {
      timetable.schedule = schedule || timetable.schedule;
      timetable.holidays = holidays || timetable.holidays;
      await timetable.save();
    } else {
      timetable = new Timetable({
        class: className,
        section: section,
        schedule: schedule || [],
        holidays: holidays || []
      });
      await timetable.save();
    }

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      timetable
    });
  } catch (error) {
    console.error('Error creating/updating timetable:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Teacher's Classes - FIXED VERSION
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    if (!teacherId) {
      return res.status(400).json({ 
        success: false,
        message: 'Teacher ID not found in request' 
      });
    }

    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher not found' 
      });
    }

    if (!teacher.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Teacher account is inactive' 
      });
    }

    // Ensure assignedClasses has a default structure
    const assignedClasses = teacher.assignedClasses || [];

    res.json({
      success: true,
      data: {
        assignedClasses: assignedClasses,
        teacherInfo: {
          name: teacher.name,
          employeeId: teacher.employeeId,
          subjects: teacher.subjects || []
        }
      }
    });
  } catch (error) {
    console.error('Error in getTeacherClasses:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
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

    const holidays = timetable ? (timetable.holidays || []) : [];

    res.json({ 
      success: true, 
      holidays 
    });
  } catch (error) {
    console.error('Error getting holidays:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};