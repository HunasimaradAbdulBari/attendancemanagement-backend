const jwt = require('jsonwebtoken');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const Admin = require('../models/Admin');

// Generate JWT Token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Login with User Type Selection (Updated with Admin support)
exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({ 
        success: false,
        message: 'Email, password, and user type are required' 
      });
    }

    if (!['student', 'teacher', 'parent', 'admin'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please select a valid user type' 
      });
    }

    let user;
    let Model;

    switch (userType) {
      case 'student':
        Model = Student;
        break;
      case 'teacher':
        Model = Teacher;
        break;
      case 'parent':
        Model = Parent;
        break;
      case 'admin':
        Model = Admin;
        break;
    }

    user = await Model.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Update last login for admin
    if (userType === 'admin') {
      user.lastLogin = new Date();
      await user.save();
    }

    const token = generateToken(user._id, userType);
    
    // Prepare response based on user type
    let responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      userType: userType
    };

    if (userType === 'student') {
      responseUser = {
        ...responseUser,
        rollNumber: user.rollNumber,
        class: user.class,
        section: user.section
      };
    } else if (userType === 'teacher') {
      responseUser = {
        ...responseUser,
        employeeId: user.employeeId,
        subjects: user.subjects || [],
        assignedClasses: user.assignedClasses || []
      };
    } else if (userType === 'admin') {
      responseUser = {
        ...responseUser,
        employeeId: user.employeeId,
        permissions: user.permissions || []
      };
    } else if (userType === 'parent') {
      responseUser = {
        ...responseUser,
        phone: user.phone,
        children: user.children || []
      };
    }

    res.json({
      success: true,
      token,
      user: responseUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Register Parent
exports.registerParent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      alternatePhone,
      address,
      occupation,
      relation
    } = req.body;

    // Validation
    if (!name || !email || !password || !phone || !address || !occupation || !relation) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided' 
      });
    }

    if (!['father', 'mother', 'guardian'].includes(relation)) {
      return res.status(400).json({ 
        success: false,
        message: 'Relation must be father, mother, or guardian' 
      });
    }

    // Check if parent exists
    const existingParent = await Parent.findOne({ email });
    if (existingParent) {
      return res.status(400).json({ 
        success: false,
        message: 'Parent already exists with this email' 
      });
    }

    const parent = new Parent({
      name,
      email,
      password,
      phone,
      alternatePhone,
      address,
      occupation,
      relation
    });

    await parent.save();

    res.status(201).json({
      success: true,
      message: 'Parent registered successfully',
      parent: {
        id: parent._id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone
      }
    });
  } catch (error) {
    console.error('Register parent error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Register Teacher
exports.registerTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      employeeId,
      phone,
      address,
      subjects,
      assignedClasses,
      qualification,
      experience
    } = req.body;

    // Validation
    if (!name || !email || !password || !employeeId || !phone || !address || !qualification) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided' 
      });
    }

    // Check if teacher exists
    const existingTeacher = await Teacher.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    if (existingTeacher) {
      return res.status(400).json({ 
        success: false,
        message: 'Teacher already exists with this email or employee ID' 
      });
    }

    const teacher = new Teacher({
      name,
      email,
      password,
      employeeId,
      phone,
      address,
      subjects: subjects || [],
      assignedClasses: assignedClasses || [],
      qualification,
      experience: experience || 0
    });

    await teacher.save();

    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        employeeId: teacher.employeeId,
        subjects: teacher.subjects
      }
    });
  } catch (error) {
    console.error('Register teacher error:', error);
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

// Register Student
exports.registerStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      rollNumber,
      class: studentClass,
      section,
      parentId,
      phone,
      address,
      dateOfBirth
    } = req.body;

    // Validation
    if (!name || !email || !password || !rollNumber || !studentClass || !section || !parentId || !phone || !address || !dateOfBirth) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be provided' 
      });
    }

    // Check if student exists
    const existingStudent = await Student.findOne({ 
      $or: [{ email }, { rollNumber }] 
    });
    if (existingStudent) {
      return res.status(400).json({ 
        success: false,
        message: 'Student already exists with this email or roll number' 
      });
    }

    // Verify parent exists
    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(400).json({ 
        success: false,
        message: 'Parent not found' 
      });
    }

    const student = new Student({
      name,
      email,
      password,
      rollNumber,
      class: studentClass,
      section,
      parentId,
      phone,
      address,
      dateOfBirth: new Date(dateOfBirth)
    });

    await student.save();

    // Add student to parent's children array
    if (!parent.children.includes(student._id)) {
      parent.children.push(student._id);
      await parent.save();
    }

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        class: student.class,
        section: student.section
      }
    });
  } catch (error) {
    console.error('Register student error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Email or Roll Number already exists' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get Profile (Updated with Admin support)
exports.getProfile = async (req, res) => {
  try {
    const { id, userType } = req.user;
    let user;

    switch (userType) {
      case 'student':
        user = await Student.findById(id).populate('parentId', 'name email phone');
        break;
      case 'teacher':
        user = await Teacher.findById(id);
        break;
      case 'parent':
        user = await Parent.findById(id).populate('children', 'name rollNumber class section');
        break;
      case 'admin':
        user = await Admin.findById(id);
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid user type' 
        });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      user, 
      userType 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Update Profile (Updated with Admin support)
exports.updateProfile = async (req, res) => {
  try {
    const { id, userType } = req.user;
    const updateData = req.body;
    
    // Remove sensitive fields from update data
    delete updateData.password;
    delete updateData.email;
    delete updateData._id;
    delete updateData.__v;
    
    let user;
    let Model;

    switch (userType) {
      case 'student':
        Model = Student;
        break;
      case 'teacher':
        Model = Teacher;
        break;
      case 'parent':
        Model = Parent;
        break;
      case 'admin':
        Model = Admin;
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid user type' 
        });
    }

    user = await Model.findByIdAndUpdate(id, updateData, { 
      new: true, 
      runValidators: true 
    }).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Delete User Account (Updated with Admin support)
exports.deleteUser = async (req, res) => {
  try {
    const { id, userType } = req.user;
    let Model;

    switch (userType) {
      case 'student':
        Model = Student;
        break;
      case 'teacher':
        Model = Teacher;
        break;
      case 'parent':
        Model = Parent;
        break;
      case 'admin':
        Model = Admin;
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: 'Invalid user type' 
        });
    }

    // Soft delete by setting isActive to false
    const user = await Model.findByIdAndUpdate(id, { isActive: false }, { new: true });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get All Students
exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, class: className, section } = req.query;
    
    let query = { isActive: true };
    if (className) query.class = className;
    if (section) query.section = section;

    const students = await Student.find(query)
      .populate('parentId', 'name phone email')
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get All Teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const teachers = await Teacher.find({ isActive: true })
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const total = await Teacher.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all teachers error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Get All Parents
exports.getAllParents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const parents = await Parent.find({ isActive: true })
      .populate('children', 'name rollNumber class section')
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const total = await Parent.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        parents,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all parents error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};