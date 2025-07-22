const jwt = require('jsonwebtoken');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');

// Generate JWT Token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Login with User Type Selection
exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!userType || !['student', 'teacher', 'parent'].includes(userType)) {
      return res.status(400).json({ message: 'Please select a valid user type' });
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
    }

    user = await Model.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
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
        subjects: user.subjects,
        assignedClasses: user.assignedClasses
      };
    }

    res.json({
      success: true,
      token,
      user: responseUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    // Check if parent exists
    const existingParent = await Parent.findOne({ email });
    if (existingParent) {
      return res.status(400).json({ message: 'Parent already exists with this email' });
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
    res.status(500).json({ message: error.message });
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

    // Check if teacher exists
    const existingTeacher = await Teacher.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    if (existingTeacher) {
      return res.status(400).json({ 
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
      subjects,
      assignedClasses,
      qualification,
      experience
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
    res.status(500).json({ message: error.message });
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

    // Check if student exists
    const existingStudent = await Student.findOne({ 
      $or: [{ email }, { rollNumber }] 
    });
    if (existingStudent) {
      return res.status(400).json({ 
        message: 'Student already exists with this email or roll number' 
      });
    }

    // Verify parent exists
    const parent = await Parent.findById(parentId);
    if (!parent) {
      return res.status(400).json({ message: 'Parent not found' });
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
      dateOfBirth
    });

    await student.save();

    // Add student to parent's children array
    parent.children.push(student._id);
    await parent.save();

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
    res.status(500).json({ message: error.message });
  }
};

// Get Profile (Updated for different user types)
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
    }
    
    res.json({ success: true, user, userType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};