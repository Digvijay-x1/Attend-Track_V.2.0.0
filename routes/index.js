const express = require('express');
const router = express.Router();
const  isLoggedIn = require('../middlewares/isLoggedIn');
const userModal = require('../models/user');
const attendanceModel = require('../models/attendance');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/dashboard', isLoggedIn, (req, res) => {
    res.render('dashboard');
});

router.get('/subjectManagement', isLoggedIn, async (req, res) => {
    let user = await userModal.findOne({email: req.user.email}).populate('courses')
    let attendances = await attendanceModel.find({user: user._id}).populate('course')
    let courseStatsMap = {};
    attendances.forEach(att => {
        const id = att.course._id.toString();
        if (!courseStatsMap[id]) {
            courseStatsMap[id] = {
                course: att.course,
                totalClasses: 0,
                classesAttended: 0
            };
        }
        courseStatsMap[id].totalClasses += 1;
        if (att.status === 'present') {
            courseStatsMap[id].classesAttended += 1;
        }
    });

    // Ensure all user courses are included, even those with zero attendance
    user.courses.forEach(course => {
        const id = course._id.toString();
        if (!courseStatsMap[id]) {
            courseStatsMap[id] = {
                course: course,
                totalClasses: 0,
                classesAttended: 0
            };
        }
    });

    const courseStats = Object.values(courseStatsMap).map(entry => {
        const { course, classesAttended, totalClasses } = entry;
        const attendancePercentage = totalClasses > 0
            ? Math.round((classesAttended / totalClasses) * 100)
            : 0;
        return {
            ...course.toObject(),
            attendancePercentage,
            classesAttended,
            totalClasses
        };
    });
    res.render('subjectManagement', {user , courses: courseStats, attendances});
});

router.get('/attendanceInput', isLoggedIn, async (req, res) => {
    let user = await userModal.findOne({email: req.user.email})
    await user.populate('courses');
    let attendances = await attendanceModel.find({user: user._id}).populate('course').sort({markedAt: -1}).limit(3)
    res.render('attendanceInput', {user, attendances});
});

router.get('/analytics', isLoggedIn, async (req, res) => {
    let user = await userModal.findOne({ email: req.user.email }).populate('courses');
    let attendances = await attendanceModel.find({ user: user._id }).populate('course');
  
    let courseStatsMap = {};
  
    attendances.forEach(att => {
      const id = att.course._id.toString();
      if (!courseStatsMap[id]) {
        courseStatsMap[id] = {
          course: att.course,
          totalClasses: 0,
          classesAttended: 0
        };
      }
      courseStatsMap[id].totalClasses += 1;
      if (att.status === 'present') {
        courseStatsMap[id].classesAttended += 1;
      }
    });
  
    // Now calculate percentages
    const courseStats = Object.values(courseStatsMap).map(entry => {
      const { course, classesAttended, totalClasses } = entry;
      const attendancePercentage = totalClasses > 0
        ? Math.round((classesAttended / totalClasses) * 100)
        : 0;
  
      return {
        ...course.toObject(), // convert course Mongoose doc to plain object
        attendancePercentage,
        classesAttended,
        totalClasses
      };
    });
  
    // Sort to find best course
    courseStats.sort((a, b) => b.attendancePercentage - a.attendancePercentage);
    const bestCourse = courseStats[0] || null;
    let bestAttendanceRate = bestCourse
  ? Math.round((bestCourse.classesAttended / bestCourse.totalClasses) * 100)
  : 0;

  
    res.render('analytics', {
      user,
      courses: courseStats,
      bestCourse,
      attendances,
      bestAttendanceRate
    });
  });

module.exports = router;