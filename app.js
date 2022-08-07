//for webhook
const userController = require('./controllers/userController')

// enable new features for our express application
const express = require('express');
// lets browser keep cookies
const session = require('express-session')
// lets us store session data in db
const MongoStore = require('connect-mongo')(session)
// lets us display flash messages
const flash = require('connect-flash')
const markdown = require('marked')
// CSURF protects against CRSF attacks
const csrf = require('csurf')
// express() returns top-level function
const app = express();

let sessionOptions = session({
    secret: process.env.SECRET,
    // override default local storage behaviour
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    // one day expiry
    cookie: {maxAge: 1000 * 60 * 60 * 10, httpOnly: true}
})

app.use(sessionOptions)
app.use(flash())

// before router
app.use(function(req, res, next) {
    // working with object available within ejs templates
    res.locals.user = req.session.user
    // make markdown function available in ejs templates
    res.locals.filterUserHTML = function(content) {
        return markdown.parse(content)
    }
    next()
})

// router is middleware
const router = require('./router')

//before csrf protection on routes
app.post('/webhook', express.raw({type: 'application/json'}), userController.webhook)

// user inputs accessible from req.body object
app.use(express.urlencoded({extended: false}))
// our app now accepts JSON
app.use(express.json())

// serve static files
app.use(express.static('public'));
// set path to views
app.set('views', 'public/views');
// set view engine
app.set('view engine', 'ejs');




app.use(csrf())

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken()
    next()
})

// tells express to use router for every request to root
app.use('/', router)

app.use(function(err, req, res, next) {
    if (err) {
        if (err.code == "EBADCSRFTOKEN") {
            req.flash('errors', "Cross-site request forgery detected.")
            req.session.save(() => res.redirect('/'))
        } else {
            res.render('404')
            console.log(err)
        }
    }
})

module.exports = app