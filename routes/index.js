const express = require('express');
const router = express.Router();
const  isLoggedIn = require('../middlewares/isLoggedIn');
const userModal = require('../models/user');
const attendanceModel = require('../models/attendance');
const courseModel = require('../models/course');
const classSessionModel = require('../models/classSession');
const upload = require('../config/multer');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/dashboard', isLoggedIn, async (req, res) => {
  let user = await userModal.findOne({email: req.user.email})
  res.render('dashboard', {user});
});

// New API endpoint for dashboard data
router.get('/api/dashboard-data', isLoggedIn, async (req, res) => {
  try {
    const user = await userModal.findOne({email: req.user.email});
    await user.populate('courses');
    
    // Get all attendance records for the user
    const attendances = await attendanceModel.find({user: user._id}).populate('course');
    
    // Calculate overall attendance
    const totalClasses = attendances.length;
    const classesAttended = attendances.filter(att => att.status === 'present').length;
    const overallAttendance = totalClasses > 0 ? (classesAttended / totalClasses) * 100 : 0;
    
    // Calculate weekly change
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const lastWeekAttendances = attendances.filter(att => 
      att.markedAt >= oneWeekAgo && att.markedAt <= new Date()
    );
    
    const previousWeekAttendances = attendances.filter(att => 
      att.markedAt >= twoWeeksAgo && att.markedAt < oneWeekAgo
    );
    
    const lastWeekPercentage = lastWeekAttendances.length > 0 
      ? (lastWeekAttendances.filter(att => att.status === 'present').length / lastWeekAttendances.length) * 100 
      : 0;
      
    const previousWeekPercentage = previousWeekAttendances.length > 0 
      ? (previousWeekAttendances.filter(att => att.status === 'present').length / previousWeekAttendances.length) * 100 
      : 0;
    
    const weeklyChange = lastWeekPercentage - previousWeekPercentage;
    
    // Calculate courses below 75% threshold
    const courseStatsMap = {};
    
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
    
    const courseStats = Object.values(courseStatsMap).map(entry => {
      const { course, classesAttended, totalClasses } = entry;
      const attendancePercentage = totalClasses > 0
        ? Math.round((classesAttended / totalClasses) * 100)
        : 0;
      
      return {
        id: course._id,
        name: course.title,
        code: course.code,
        totalClasses,
        classesAttended,
        percentage: attendancePercentage
      };
    });
    
    const belowThreshold = courseStats.filter(course => course.percentage < 75).length;
    
    // Calculate this week's attendance
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const thisWeekAttendances = attendances.filter(att => att.markedAt >= startOfWeek);
    const thisWeekTotal = thisWeekAttendances.length;
    const thisWeekAttended = thisWeekAttendances.filter(att => att.status === 'present').length;
    const thisWeekPercentage = thisWeekTotal > 0 ? Math.round((thisWeekAttended / thisWeekTotal) * 100) : 0;
    
    // Calculate weekly attendance trend for the past 6 weeks
    const weeklyAttendance = [];
    
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (7 * i));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekAttendances = attendances.filter(att => 
        att.markedAt >= weekStart && att.markedAt <= weekEnd
      );
      
      const weekTotal = weekAttendances.length;
      const weekPresent = weekAttendances.filter(att => att.status === 'present').length;
      const weekPercentage = weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0;
      
      weeklyAttendance.push({
        week: 6 - i,
        percentage: weekPercentage
      });
    }
    
    // Return the dashboard data
    res.json({
      overallAttendance: parseFloat(overallAttendance.toFixed(1)),
      weeklyChange: parseFloat(weeklyChange.toFixed(1)),
      totalClasses,
      classesAttended,
      belowThreshold,
      thisWeek: {
        attended: thisWeekAttended,
        total: thisWeekTotal,
        percentage: thisWeekPercentage
      },
      weeklyAttendance,
      subjectAttendance: courseStats
    });
    
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
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

  router.get('/calculator', isLoggedIn, async (req, res) => {
    let user = await userModal.findOne({email: req.user.email})
    await user.populate('courses'); 
    
    // Initialize variables with default values to avoid 'not defined' errors
    const defaultValues = {
      totalClasses: 0,
      totalPresentClasses: 0, 
      currentAttendance: 0,
      targetAttendance: 0,
      estimatedFutureClasses: 0,
      totalClassesInFuture: 0,
      totalPresentClassesInFuture: 0,
      classesNeeded: 0,
      canMissClasses: 0
    };
    
    // Fetch attendance data for each course
    const courseData = [];
    const targetPercentage = 75; // Default target percentage
    const estimatedFutureClasses = 20; // Default future classes assumption
    
    for (const course of user.courses) {
      const totalClasses = await attendanceModel.countDocuments({user: user._id, course: course._id});
      const totalPresentClasses = await attendanceModel.countDocuments({
        user: user._id, 
        course: course._id, 
        status: 'present'
      });
      
      const percentage = totalClasses > 0 ? Math.round((totalPresentClasses / totalClasses) * 100) : 0;
      
      // Calculate classes needed to reach target
      let needsForTarget = 0;
      if (percentage < targetPercentage) {
        // Formula: (target * (total + x) - 100 * present) / (100 - target) = x
        needsForTarget = Math.ceil((targetPercentage * totalClasses - 100 * totalPresentClasses) / (100 - targetPercentage));
        if (needsForTarget < 0) needsForTarget = 0;
      }
      
      // Calculate how many classes can be missed while maintaining target
      let canMiss = 0;
        
      
      const targetDecimal = targetPercentage / 100;
      canMiss = Math.floor(totalClasses + estimatedFutureClasses - (totalPresentClasses / targetDecimal));
      
      // We can't miss more than the future classes, and we can't miss negative classes
      canMiss = estimatedFutureClasses - canMiss;
      if (canMiss < 0) canMiss = 0;
      if (canMiss > estimatedFutureClasses) canMiss = estimatedFutureClasses;
      
      courseData.push({
        id: course._id,
        title: course.title,
        totalClasses,
        attendedClasses: totalPresentClasses,
        percentage,
        canMiss,
        needsForTarget,
        targetAchieved: percentage >= targetPercentage
      });
    }
    
    res.render('calculator', {user, courseData, ...defaultValues});
  });

  router.post('/calculate', isLoggedIn, async (req, res) => {
    let user = await userModal.findOne({email: req.user.email})
    await user.populate('courses');
    let course = user.courses.find(course => course.title === req.body.subject)
    let totalClasses = await attendanceModel.countDocuments({user: user._id, course: course._id})
    let totalPresentClasses = await attendanceModel.countDocuments({user: user._id, course: course._id, status: 'present'})
    let currentAttendance = totalClasses > 0 ? (totalPresentClasses / totalClasses) * 100 : 0
    let targetAttendance = parseFloat(req.body['target-attendance'])
    let estimatedFutureClasses = parseInt(req.body['estimated-future-classes'])
    let totalClassesInFuture = totalClasses + parseInt(estimatedFutureClasses)
    let totalPresentClassesInFuture = (targetAttendance * totalClassesInFuture) / 100
    let classesNeeded = Math.max(0, Math.ceil(totalPresentClassesInFuture - totalPresentClasses))
    
    // Calculate how many classes can be missed
    let canMissClasses = 0;
    
    
    
    const targetDecimal = targetAttendance / 100;
    canMissClasses = Math.floor(totalClasses + estimatedFutureClasses - (totalPresentClasses / targetDecimal));
    
    // We can't miss more than the future classes, and we can't miss negative classes
    canMissClasses = estimatedFutureClasses - canMissClasses;
    if (canMissClasses < 0) canMissClasses = 0;
    if (canMissClasses > estimatedFutureClasses) canMissClasses = estimatedFutureClasses;
    
    // Fetch attendance data for each course for the subject-wise quick calculator
    const courseData = [];
    const targetPercentage = 75; // Default target percentage
    const defaultEstimatedFutureClasses = 20; // Default future classes assumption
    
    for (const c of user.courses) {
      const cTotalClasses = await attendanceModel.countDocuments({user: user._id, course: c._id});
      const cTotalPresentClasses = await attendanceModel.countDocuments({
        user: user._id, 
        course: c._id, 
        status: 'present'
      });
      
      const percentage = cTotalClasses > 0 ? Math.round((cTotalPresentClasses / cTotalClasses) * 100) : 0;
      
      // Calculate classes needed to reach target
      let needsForTarget = 0;
      if (percentage < targetPercentage) {
        // Formula: (target * (total + x) - 100 * present) / (100 - target) = x
        needsForTarget = Math.ceil((targetPercentage * cTotalClasses - 100 * cTotalPresentClasses) / (100 - targetPercentage));
        if (needsForTarget < 0) needsForTarget = 0;
      }
      
      // Calculate how many classes can be missed while maintaining target
      let canMiss = 0;
      
  
      const targetDecimal = targetPercentage / 100;
      canMiss = Math.floor(cTotalClasses + defaultEstimatedFutureClasses - (cTotalPresentClasses / targetDecimal));
      
      // We can't miss more than the future classes, and we can't miss negative classes
      canMiss = defaultEstimatedFutureClasses - canMiss;
      if (canMiss < 0) canMiss = 0;
      if (canMiss > defaultEstimatedFutureClasses) canMiss = defaultEstimatedFutureClasses;
      
      courseData.push({
        id: c._id,
        title: c.title,
        totalClasses: cTotalClasses,
        attendedClasses: cTotalPresentClasses,
        percentage,
        canMiss,
        needsForTarget,
        targetAchieved: percentage >= targetPercentage
      });
    }
    
    res.render('calculator', {
      user, 
      course,
      totalClasses, 
      totalPresentClasses, 
      currentAttendance, 
      targetAttendance, 
      estimatedFutureClasses, 
      totalClassesInFuture, 
      totalPresentClassesInFuture, 
      classesNeeded,
      canMissClasses,
      courseData
    });
  });

  router.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModal.findOne({email: req.user.email})
    res.render('profile', {user})
  })

  router.post('/profile' , isLoggedIn , upload.single('profilePicture') , async (req,res)=>{
    let user = await userModal.findOne({email: req.user.email})
    
    // Only update profile picture if a file was uploaded
    if (req.file) {
      user.profilePicture = req.file.buffer
    }
    
    // Update other fields
    if (req.body.description) {
      user.description = req.body.description
    }
    
    if (req.body.username) {
      user.username = req.body.username
    }
    
    await user.save()  
    
    res.render('profile', {user})
})

router.get('/alerts', isLoggedIn, async (req, res) => {
  let user = await userModal.findOne({email: req.user.email})
  res.render('alert', {user})
})


module.exports = router;