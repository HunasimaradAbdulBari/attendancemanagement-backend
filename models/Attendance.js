const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  period: {
    type: Number,
    required: true
  },
  remarks: String
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance records
attendanceSchema.index({ student: 1, date: 1, period: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);