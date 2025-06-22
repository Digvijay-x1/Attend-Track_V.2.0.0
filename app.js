const express = require('express');
const app = express();
const mongooseConnection = require('./config/mongooseConnection');
const cookieParser = require('cookie-parser');
const usersRouter = require('./routes/usersRouter');
const coursesRouter = require('./routes/coursesRouter');
const attendancesRouter = require('./routes/attendancesRouter');
const classSessionsRouter = require('./routes/classSessionsRouter');
const indexRouter = require('./routes/index');
const path = require('path');
const expressSession = require('express-session');
const flash = require('connect-flash');


require('dotenv').config();


app.use(
    expressSession({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET,
    })
)

app.use(flash());
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: true , limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Add middleware to make path available to all templates
app.use((req, res, next) => {
    res.locals.path = req.path;
    next();
});

app.use('/users', usersRouter);
app.use('/courses', coursesRouter);
app.use('/attendances', attendancesRouter);
app.use('/classSessions', classSessionsRouter);
app.use('/', indexRouter);


app.listen(3000,()=>{
    console.log('Server is running on port 3000');
})
