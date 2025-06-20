const userModel = require('../models/user');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/generateToken');


module.exports.registerUser = async (req, res) => {
    

    try {
        let {name, email, username} = req.body;

        let user = await userModel.findOne({email: email});
            if(user) {
            req.flash('error', 'User already exists');
            res.redirect('/');
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, async (err, hash) => {
                if(err) throw err;
                let user = await userModel.create({
                    name,
                    email,
                    password: hash ,
                    username,
                })
                let token = generateToken(user);
                res.cookie('token', token, {httpOnly: true, secure: true, maxAge: 3600000});
                req.flash('success', 'user jwt token created');
                res.redirect('/dashboard');
                
            });
        });
      
        
        
    } catch (error) {
        console.log(error.message);
    }
    
}

module.exports.loginUser = async (req, res) => {
    try {
        let {email, password} = req.body;
        let user = await userModel.findOne({email: email});
        if(!user) {
            req.flash('error', 'email or password is incorrect');
            res.redirect('/');
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if(err) throw err;
            if(result) {
                let token = generateToken(user);
                res.cookie('token', token, {httpOnly: true, secure: true, maxAge: 3600000});
                req.flash('success', 'user jwt token created');
                res.redirect('/dashboard');
            }
            else{
                req.flash('error', 'email or password is incorrect');
                res.redirect('/');
            }
        });
    } catch (error) {
        console.log(error.message);
    }
}

module.exports.logout = (req,res)=>{
    res.cookie('token', '', {httpOnly: true, secure: true, maxAge: 0});
    req.flash('success', 'Logged out successfully');
    res.redirect('/');

}   
