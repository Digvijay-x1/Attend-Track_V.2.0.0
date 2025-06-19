const mongoose = require('mongoose');



const ClassSessionSchema = mongoose.Schema({
    course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    date:       { type: Date, required: true },                 // Full date of the session (e.g., 2025-06-24)
    // startTime:  { type: String, required: true },               // "10:00" (24h format)
    // endTime:    { type: String },                               // Optional: for UI and notifications
    // topic:      { type: String },                               // Optional: "Introduction to Graphs"
    isCancelled:{ type: Boolean, default: false },              // So you can skip it without deleting
    createdAt:  { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now }
  });

module.exports = mongoose.model('ClassSession', ClassSessionSchema);