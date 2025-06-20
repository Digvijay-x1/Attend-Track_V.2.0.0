const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logout } = require('../controllers/authControllers');
const cookieParser = require('cookie-parser');


router.use(cookieParser());

router.get('/', (req, res) => {
    res.send('Hello World users');
});


router.post('/register', registerUser);

router.post('/login', loginUser);

router.get('/logout', logout);

module.exports = router;