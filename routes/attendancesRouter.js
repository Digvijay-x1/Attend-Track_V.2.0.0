const express = require('express');
const userModel = require('../models/user');
const attendanceModel = require('../models/attendance');
const isLoggedIn = require('../middlewares/isLoggedIn');
const router = express.Router();

router.post('/addAttendance', isLoggedIn, async(req, res) => {
    let user = await userModel.findOne({email: req.user.email})
    await user.populate('courses')
    let {courseId, status} = req.body;
    const course = user.courses.find(course => course._id.toString() === courseId);
    
    if (!course) {
        return res.status(404).send('Course not found');
    }
    
    await attendanceModel.create({
        course: course._id,
        status: status,
        user: user._id,
    }) 
    res.redirect('/attendanceInput');
})

// Add a route to render the attendance input page
router.get('/', isLoggedIn, async(req, res) => {
    try {
        const user = await userModel.findOne({email: req.user.email}).populate('courses');
        res.render('attendanceInput', { user });
    } catch (error) {
        console.error('Error loading attendance input page:', error);
        res.status(500).send('Server error');
    }
});

module.exports = router;