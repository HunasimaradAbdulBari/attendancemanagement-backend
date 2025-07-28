const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true
    },
    periods: [{
      period: Number,
      subject: String,
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher' 
      },
      startTime: String,
      endTime: String
    }]
  }],
  holidays: [{
    date: Date,
    reason: String
  }]
}, {
  timestamps: true
});


timetableSchema.index({ class: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);