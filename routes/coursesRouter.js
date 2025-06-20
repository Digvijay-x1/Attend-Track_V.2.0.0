const express = require('express');
const router = express.Router();
const isLoggedIn = require('../middlewares/isLoggedIn');
const upload = require('../config/multer');
const courseModal = require('../models/course');
const userModal = require('../models/user');

router.get('/addCourse', isLoggedIn , (req, res) => {
    res.render('addCourse');
});

router.post('/addCourse', isLoggedIn ,async (req,res)=>{
    try {
        let user = await userModal.findOne({email: req.user.email})
        let {title, code, profName} = req.body;

        let course = await courseModal.create({       
            title,
            code,
            profName,       
            user: user._id,
        })

        user.courses.push(course._id)
        await user.save();
        res.redirect('/subjectManagement');
    } catch (error) {
        res.send(error);
    }
})

module.exports = router;