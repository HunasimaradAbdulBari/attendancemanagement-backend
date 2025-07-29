const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');

// Generate JWT Token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Admin Login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, 'admin');
    
    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        employeeId: admin.employeeId,
        permissions: admin.permissions,
        userType: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Create Admin (Super Admin only)
exports.createAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      employeeId,
      phone,
      address,
      permissions
    } = req.body;

    // Validation
    if (!name || !email || !password || !employeeId || !phone || !address) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided' 
      });
    }

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false,
        message: 'Admin already exists with this email or employee ID' 
      });
    }

    const admin = new Admin({
      name,
      email,
      password,
      employeeId,
      phone,
      address,
      permissions: permissions || ['manage_users', 'manage_timetables', 'view_reports']
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        employeeId: admin.employeeId,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Email or Employee ID already exists' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalParents,
      activeStudents,
      activeTeachers,
      activeParents
    ] = await Promise.all([
      Student.countDocuments({}),
      Teacher.countDocuments({}),
      Parent.countDocuments({}),
      Student.countDocuments({ isActive: true }),
      Teacher.countDocuments({ isActive: true }),
      Parent.countDocuments({ isActive: true })
    ]);

    // Get class-wise student count
    const classStats = await Student.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.class': 1, '_id.section': 1 } }
    ]);

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [recentStudents, recentTeachers, recentParents] = await Promise.all([
      Student.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Teacher.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Parent.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalParents,
          activeStudents,
          activeTeachers,
          activeParents
        },
        classStats,
        recentRegistrations: {
          students: recentStudents,
          teachers: recentTeachers,
          parents: recentParents
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Bulk User Operations
exports.bulkCreateStudents = async (req, res) => {
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Students array is required and must not be empty'
      });
    }

    const results = {
      created: [],
      errors: []
    };

    for (const studentData of students) {
      try {
        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.rollNumber || 
            !studentData.class || !studentData.section || !studentData.parentId) {
          results.errors.push({
            data: studentData,
            error: 'Missing required fields (name, email, rollNumber, class, section, parentId)'
          });
          continue;
        }

        // Check if student exists
        const existingStudent = await Student.findOne({ 
          $or: [{ email: studentData.email }, { rollNumber: studentData.rollNumber }] 
        });
        
        if (existingStudent) {
          results.errors.push({
            data: studentData,
            error: 'Student already exists with this email or roll number'
          });
          continue;
        }

        // Verify parent exists
        const parent = await Parent.findById(studentData.parentId);
        if (!parent) {
          results.errors.push({
            data: studentData,
            error: 'Parent not found'
          });
          continue;
        }

        const student = new Student({
          ...studentData,
          password: studentData.password || 'defaultPassword123',
          dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : new Date()
        });
        
        await student.save();

        // Add student to parent's children array
        if (!parent.children.includes(student._id)) {
          parent.children.push(student._id);
          await parent.save();
        }

        results.created.push({
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        });
      } catch (error) {
        console.error('Error creating student:', error);
        results.errors.push({
          data: studentData,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk operation completed. Created: ${results.created.length}, Errors: ${results.errors.length}`,
      data: {
        results,
        summary: {
          totalProcessed: students.length,
          successful: results.created.length,
          failed: results.errors.length
        }
      }
    });
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// System Settings
exports.getSystemSettings = async (req, res) => {
  try {
    // This would typically come from a settings collection
    // For now, return mock settings
    const settings = {
      schoolName: 'Astra Pre-School',
      academicYear: '2024-25',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      attendanceRequirement: 75,
      maxAbsences: 20,
      notificationSettings: {
        emailEnabled: true,
        smsEnabled: false,
        parentNotifications: true,
        teacherNotifications: true
      },
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: {
        settings
      }
    });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'Settings object is required'
      });
    }
    
    // This would typically update a settings collection
    // For now, just return success with updated timestamp
    const updatedSettings = {
      ...settings,
      lastUpdated: new Date()
    };
    
    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: {
        settings: updatedSettings
      }
    });
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};