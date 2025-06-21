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

  router.get('/alerts', isLoggedIn, async (req, res) => {
    try {
        const user = await userModal.findOne({ email: req.user.email }).populate('courses');
        const attendances = await attendanceModel.find({ user: user._id }).populate('course');
        
        // Calculate course-wise attendance statistics
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
        
        // Generate alerts based on attendance data
        const alerts = {
            critical: [],
            warning: [],
            info: [],
            all: []
        };
        
        // Process each course for alerts
        Object.values(courseStatsMap).forEach(entry => {
            const { course, classesAttended, totalClasses } = entry;
            if (totalClasses === 0) return; // Skip courses with no attendance data
            
            const attendancePercentage = Math.round((classesAttended / totalClasses) * 100);
            const classesNeededFor75Percent = Math.ceil((75 * totalClasses - 100 * classesAttended) / (100 - 75));
            
            // Critical alert: Below 75%
            if (attendancePercentage < 75) {
                alerts.critical.push({
                    type: 'critical',
                    title: `${course.title} - Critical Attendance Alert`,
                    message: `Your attendance has dropped to ${attendancePercentage}%. You need to attend ${classesNeededFor75Percent > 0 ? classesNeededFor75Percent : 'more'} more classes to reach 75%.`,
                    course: course,
                    percentage: attendancePercentage,
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
                });
            }
            // Warning alert: Between 75% and 80%
            else if (attendancePercentage >= 75 && attendancePercentage < 80) {
                // Calculate how many classes they can miss before dropping below 75%
                const canMissClasses = Math.floor((classesAttended - 0.75 * totalClasses) / 0.75);
                
                alerts.warning.push({
                    type: 'warning',
                    title: `${course.title} - Approaching Threshold`,
                    message: `Your attendance is at ${attendancePercentage}%. Don't miss more than ${canMissClasses} class${canMissClasses !== 1 ? 'es' : ''} to stay above 75%.`,
                    course: course,
                    percentage: attendancePercentage,
                    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
                });
            }
            // Info alert: Good attendance
            else if (attendancePercentage >= 90) {
                alerts.info.push({
                    type: 'info',
                    title: `${course.title} - Excellent Attendance`,
                    message: `Great job! Your attendance is at ${attendancePercentage}%, well above the required threshold.`,
                    course: course,
                    percentage: attendancePercentage,
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
                });
            }
        });
        
        // Add overall attendance alert if below 75%
        const totalClasses = attendances.length;
        const classesAttended = attendances.filter(att => att.status === 'present').length;
        const overallAttendance = totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;
        
        if (overallAttendance < 75 && totalClasses > 0) {
            alerts.critical.push({
                type: 'critical',
                title: 'Attendance Goal Not Met',
                message: `Your overall attendance has fallen below the 75% requirement. Immediate action needed.`,
                percentage: overallAttendance,
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
            });
        }
        
        // Combine all alerts
        alerts.all = [...alerts.critical, ...alerts.warning, ...alerts.info];
        
        // Count alerts by type
        const alertCounts = {
            critical: alerts.critical.length,
            warning: alerts.warning.length,
            info: alerts.info.length,
            unread: alerts.all.length // Assuming all alerts are unread initially
        };
        
        // Helper function to format time ago
        const formatTimeAgo = (timestamp) => {
            const now = new Date();
            const date = new Date(timestamp);
            const seconds = Math.floor((now - date) / 1000);
            
            let interval = Math.floor(seconds / 31536000);
            if (interval >= 1) {
                return interval + " year" + (interval === 1 ? "" : "s") + " ago";
            }
            
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) {
                return interval + " month" + (interval === 1 ? "" : "s") + " ago";
            }
            
            interval = Math.floor(seconds / 86400);
            if (interval >= 1) {
                return interval + " day" + (interval === 1 ? "" : "s") + " ago";
            }
            
            interval = Math.floor(seconds / 3600);
            if (interval >= 1) {
                return interval + " hour" + (interval === 1 ? "" : "s") + " ago";
            }
            
            interval = Math.floor(seconds / 60);
            if (interval >= 1) {
                return interval + " minute" + (interval === 1 ? "" : "s") + " ago";
            }
            
            return "just now";
        };
        
        res.render('alert', { user, alerts, alertCounts, formatTimeAgo });
    } catch (error) {
        console.error('Error generating alert data:', error);
        res.status(500).send('Failed to generate alert data');
    }
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

// router.get('/alerts', isLoggedIn, async (req, res) => {
//   let user = await userModal.findOne({email: req.user.email})
//   res.render('alert', {user})
// })


module.exports = router;