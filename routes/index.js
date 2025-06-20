const express = require('express');
const router = express.Router();
const  isLoggedIn = require('../middlewares/isLoggedIn');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/dashboard', isLoggedIn, (req, res) => {
    res.render('dashboard');
});

router.get('/subjectManagement', isLoggedIn, (req, res) => {
    res.send('hello subjectManagement');
});




module.exports = router;