const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authControllers');
const cookieParser = require('cookie-parser');


router.use(cookieParser());

router.get('/', (req, res) => {
    res.send('Hello World users');
});


router.post('/register', registerUser);

router.post('/login', loginUser);

module.exports = router;