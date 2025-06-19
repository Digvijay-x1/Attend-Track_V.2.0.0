const express = require('express');
const router = express.Router();
const userModel = require('../models/user');

router.get('/', (req, res) => {
    res.send('Hello World users');
});


router.post('/create', async (req, res) => {
    let {name, email, password, username} = req.body;
    let user = await userModel.create({
        name,
        email,
        password,
        username,
    })
    res.status(201).send(user);
});

module.exports = router;