// router's job is to handle a list of routes

const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController')
const weekController = require('./controllers/weekController')
const messageController = require('./controllers/messageController')

// run this function for that route
router.get('/', function(req, res) {
    res.render('home')
})
router.get('/media', function(req, res) {
    res.render('under-construction')
})
router.get('/blog', function(req, res) {
    res.render('under-construction')
})
router.get('/contact', function(req, res) {
    res.render('contact', {status: req.flash('status')})
})
// user routes
router.get('/reports', userController.reports)
router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/logout', userController.logout)
router.post('/sendEmail', messageController.sendEmail)
router.post('/doesUsernameExist', userController.doesUsernameExist)
router.post('/doesEmailExist', userController.doesEmailExist)
router.post('/isCorrect', userController.isCorrect)
//router.post('/submitQuiz',)

// admin routes
router.get('/create-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewCreateWeekPage)
router.post('/create-week', userController.mustBeLoggedIn, userController.mustBeAdmin, weekController.createWeek)
module.exports = router