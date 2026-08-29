// enable new features for our express application
const express = require('express');
// lets browser keep cookies
const session = require('express-session')
// lets us store session data in db
const MongoStore = require('connect-mongo').MongoStore
// lets us display flash messages
const flash = require('connect-flash')
const {csrfSync} = require('csrf-sync')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const {renderSafeMarkdown} = require('./lib/safeContent')
// express() returns top-level function
const app = express();

const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({contentSecurityPolicy: false}))

let sessionOptions = session({
    secret: process.env.SECRET,
    // override default local storage behaviour
    store: MongoStore.create({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    // one day expiry
    cookie: {maxAge: 1000 * 60 * 60 * 10, httpOnly: true, sameSite: 'lax', secure: isProduction}
})

app.use(sessionOptions)
app.use(flash())

// before router
app.use(function(req, res, next) {
    // working with object available within ejs templates
    res.locals.user = req.session.user
    if (req.session.user) res.set('Cache-Control', 'private, no-store')
    // make markdown function available in ejs templates
    res.locals.filterUserHTML = renderSafeMarkdown
    next()
})

// router is middleware
const router = require('./router')

// user inputs accessible from req.body object
app.use(express.urlencoded({extended: false}))
// our app now accepts JSON
app.use(express.json())

const accountLimiter = rateLimit({windowMs: 15 * 60 * 1000, max: 40})
const messageLimiter = rateLimit({windowMs: 60 * 60 * 1000, max: 20})
app.use(['/login', '/register', '/doesUsernameExist', '/doesEmailExist'], accountLimiter)
app.use(['/sendEmail', '/sendFeedbackToHanford', '/sendQuizToHanford'], messageLimiter)

// serve static files
app.use(express.static('public'));
// set path to views
app.set('views', 'public/views');
// set view engine
app.set('view engine', 'ejs');




const {csrfSynchronisedProtection} = csrfSync({
    getTokenFromRequest: req => req.body && req.body._csrf || req.headers['x-csrf-token']
})
app.use(csrfSynchronisedProtection)

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
