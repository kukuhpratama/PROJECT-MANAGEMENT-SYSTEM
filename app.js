var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var flash = require('connect-flash');
const fileUpload = require('express-fileupload')

//model setup
const {
  Pool
} = require('pg');

// // PG ADMIN
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pms',
  password: '12345',
  port: 5432
});
console.log("Successful connection to the database");

//initialize router
var indexRouter = require('./routes/index')(pool);
var projectsRouter = require('./routes/projects')(pool);
var profileRouter = require('./routes/profile')(pool);
var usersRouter = require('./routes/users')(pool);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// // SESSION USE
app.use(
  session({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true
  })
);
// FLASH USE
app.use(flash());
// FILE-UPLOAD USE
app.use(fileUpload());


//call the router
app.use('/', indexRouter);
app.use('/projects', projectsRouter);
app.use('/profile', profileRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;