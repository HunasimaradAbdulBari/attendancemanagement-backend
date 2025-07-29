const jwt = require('jsonwebtoken');
const Student = require('../models/student');
const Teacher = require('../models/Teacher');
const Parent = require('../models/Parent');
const Admin = require('../models/Admin');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'No authorization header provided' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }

    if (!decoded.id || !decoded.userType) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token payload' 
      });
    }

    let user;
    let Model;

    switch (decoded.userType) {
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
        return res.status(401).json({ 
          success: false,
          message: 'Invalid user type in token' 
        });
    }

    try {
      user = await Model.findById(decoded.id).select('-password');
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return res.status(500).json({ 
        success: false,
        message: 'Database error during authentication' 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Set the user object with both user data and userType
    req.user = { 
      id: user._id.toString(), // Ensure string format for consistency
      ...user.toObject(), 
      userType: decoded.userType 
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

module.exports = authMiddleware;