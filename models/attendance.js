const mongoose = require("mongoose");



const AttendanceSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  status: { type: String, enum: ["present", "absent"] },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSession', required: false },
  markedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
