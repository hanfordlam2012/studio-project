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
const {renderSafeMarkdown, renderPathMarkdown} = require('./lib/safeContent')
// express() returns top-level function
const app = express();

const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet({contentSecurityPolicy: false}))

// Static requests do not need a database-backed session. Serving them first
// avoids a MongoDB round trip for every image, font, stylesheet, and script.
app.use(express.static('public', {
    etag: true,
    maxAge: '1d',
    setHeaders: function(res, filePath) {
        if (/service-worker\.js$|manifest\.webmanifest$|offline\.html$/.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache')
        } else if (/\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?|ttf)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800')
        }
    }
}))

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
    res.locals.displayPathHTML = renderPathMarkdown
    next()
})

// router is middleware
const router = require('./router')

// user inputs accessible from req.body object
app.use(express.urlencoded({extended: false}))
// our app now accepts JSON
app.use(express.json())

const pathMaterials = require('./lib/pathMaterials')
app.use(['/create-week', '/edit-week', '/week-email-resend'], function(req, res, next) {
    if (req.method !== 'POST' || !String(req.headers['content-type'] || '').startsWith('multipart/form-data')) return next()
    pathMaterials.upload(req, res, function(error) {
        if (!error) return next()
        const archiveAction = req.path !== '/create-week'
        req.flash(archiveAction ? 'editError' : 'createError', pathMaterials.uploadMessage(error))
        req.session.save(() => res.redirect(archiveAction ? '/choose-week' : '/create-week'))
    })
})
app.use('/admin/backup-inspect', function(req, res, next) {
    if (req.method !== 'POST') return next()
    require('./lib/studioBackup').upload(req, res, function(error) {
        if (!error) return next()
        req.flash('recordErrors', error && error.code === 'LIMIT_FILE_SIZE' ? 'The backup file is larger than 25 MB.' : 'That backup file could not be read.')
        req.session.save(() => res.redirect('/admin/records#backup'))
    })
})

const accountLimiter = rateLimit({windowMs: 15 * 60 * 1000, max: 40})
const messageLimiter = rateLimit({windowMs: 60 * 60 * 1000, max: 20})
app.use(['/login', '/register', '/doesUsernameExist', '/doesEmailExist'], accountLimiter)
app.use(['/sendEmail', '/sendFeedbackToHanford', '/sendQuizToHanford', '/studio-post'], messageLimiter)
app.use('/missions/quaver-attack/claim', rateLimit({windowMs: 15 * 60 * 1000, max: 10}))

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

app.use(function(req, res) {
    res.status(404).render('404')
})

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
