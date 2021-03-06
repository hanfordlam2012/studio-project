// router's job is to handle a list of routes

const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController')
const weekController = require('./controllers/weekController')
const messageController = require('./controllers/messageController')
const missionController = require('./controllers/missionController')
const scoresbyController = require('./controllers/scoresbyController')

// run this function for that route
router.get('/', function(req, res) {
    res.render('home')
})
router.get('/media', function(req, res) {
    res.render('media')
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
router.post('/submitQuiz', missionController.checkQuiz)

// routes for holiday coding


// student navigation
router.get('/practice', userController.mustBeLoggedIn, userController.showPracticePage)
router.get('/missions', userController.mustBeLoggedIn, userController.showMissionsPage)
router.get('/leaderboard', userController.mustBeLoggedIn, userController.showLeaderboardPage)
router.get('/parents', userController.mustBeLoggedIn, userController.showParentsPage)

// scoresby routes
router.get('/scoresby', userController.mustBeLoggedIn, userController.mustBeAdmin, scoresbyController.getDataAndShowScoresbyPage)
router.post('/logContributor', userController.mustBeLoggedIn, userController.mustBeAdmin, scoresbyController.logContributorAndRefresh)

// game routes
router.post('/saveScore', userController.mustBeLoggedIn, missionController.compareScoreAndSave)

// practice routes
router.post('/updateLastSubmittedDateAndAddPoints', userController.mustBeLoggedIn, missionController.updateLastSubmittedDateAndAddPoints)
router.post('/guessBPM', userController.mustBeLoggedIn, missionController.checkBPM)

// admin routes
router.get('/create-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewCreateWeekPage)
router.post('/create-week', userController.mustBeLoggedIn, userController.mustBeAdmin, weekController.createWeek)
router.get('/choose-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewChooseWeekPage)
router.post('/choose-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewEditWeekPage)
router.post('/edit-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.editWeek)

// sitemap
router.get('/sitemap.xml', function(req, res) {
    res.sendFile('sitemap.xml', { root: '.' });
    });

module.exports = router