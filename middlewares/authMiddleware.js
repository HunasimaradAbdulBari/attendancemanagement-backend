const jwt = require('jsonwebtoken');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const Admin = require('../models/Admin'); // Add Admin model

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;

    switch (decoded.userType) {
      case 'student':
        user = await Student.findById(decoded.id).select('-password');
        break;
      case 'teacher':
        user = await Teacher.findById(decoded.id).select('-password');
        break;
      case 'parent':
        user = await Parent.findById(decoded.id).select('-password');
        break;
      case 'admin':
        user = await Admin.findById(decoded.id).select('-password');
        break;
      default:
        return res.status(401).json({ message: 'Invalid user type' });
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Set the user object with both user data and userType
    req.user = { 
      id: user._id, // Make sure to set the id field
      ...user.toObject(), 
      userType: decoded.userType 
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;