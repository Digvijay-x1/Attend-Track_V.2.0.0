const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middlewares/isLoggedIn');
const upload = require('../config/multer');
const courseModal = require('../models/course');
const userModal = require('../models/user');

router.get('/addCourse', isLoggedIn , (req, res) => {
    res.render('addCourse');
});

router.post('/addCourse', isLoggedIn, async (req, res) => {
    try {
        let user = await userModal.findOne({email: req.user.email});
        let {title, code, profName, schedule} = req.body;

        // Handle schedule data - it could be single object or array
        let scheduleArray = [];
        
        if (schedule) {
            if (Array.isArray(schedule)) {
                // Multiple entries from form like: schedule[0][dayOfWeek], schedule[1][dayOfWeek], etc.
                scheduleArray = schedule.map(entry => ({
                    dayOfWeek: parseInt(entry.dayOfWeek),
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    status: entry.status || 'scheduled'
                }));
            } else {
                // Single entry
                scheduleArray = [{
                    dayOfWeek: parseInt(schedule.dayOfWeek),
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    status: schedule.status || 'scheduled'
                }];
            }
        }

        let course = await courseModal.create({       
            title,
            code,
            profName,       
            user: user._id,
            schedule: scheduleArray
        });

        user.courses.push(course._id);
        await user.save();
        res.redirect('/subjectManagement');
    } catch (error) {
        console.error('Error creating course:', error);
        res.send(error);
    }
});
module.exports = router;