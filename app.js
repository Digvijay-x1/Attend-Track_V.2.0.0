const express = require('express');
const app = express();
const mongooseConnection = require('./config/mongooseConnection');
const cookieParser = require('cookie-parser');
const usersRouter = require('./routes/usersRouter');
const coursesRouter = require('./routes/coursesRouter');
const attendancesRouter = require('./routes/attendancesRouter');
const classSessionsRouter = require('./routes/classSessionsRouter');

const path = require('path');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use('/users', usersRouter);
app.use('/courses', coursesRouter);
app.use('/attendances', attendancesRouter);
app.use('/classSessions', classSessionsRouter);

app.get('/', (req, res) => {
    res.send('Hello World');
});


app.listen(3000,()=>{
    console.log('Server is running on port 3000');
})
