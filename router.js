// router's job is to handle a list of routes
const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController')
const weekController = require('./controllers/weekController')
const messageController = require('./controllers/messageController')
const missionController = require('./controllers/missionController')
const scoresbyController = require('./controllers/scoresbyController')
const performanceController = require('./controllers/performanceController')

// run this function for that route
router.get('/', function(req, res) {
    res.render('homeBrief', {status: req.flash('status')})
})


// Retired teaching pages are intentionally no longer public routes.
router.post('/sendQuizToHanford', messageController.sendQuizToHanford)
//router.get('/melody', function(req, res) {res.render('melody')})
//router.post('/sendMelodyToHanford', messageController.sendMelodyToHanford)
//router.get('/showcase', userController.mustBeLoggedIn, performanceController.showShowcasePage)
//router.post('/addPerformanceComment', userController.mustBeLoggedIn, performanceController.addPerformanceComment)
//router.get('/feedback', userController.mustBeLoggedIn, userController.showFeedbackPage)
//router.get('/schedule', userController.showSchedulePage)
router.post('/sendFeedbackToHanford', messageController.sendFeedbackToHanford)

// user routes
router.get('/reports', userController.reports)
router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/logout', userController.logout)
router.post('/sendEmail', messageController.sendEmail)
router.post('/doesUsernameExist', userController.doesUsernameExist)
router.post('/doesEmailExist', userController.doesEmailExist)
router.post('/isCorrect', userController.isCorrect)

// student navigation
router.get('/practice', userController.mustBeLoggedIn, userController.showPracticePage)
router.get('/missions', userController.mustBeLoggedIn, userController.showMissionsPage)
router.get('/leaderboard', userController.mustBeLoggedIn, userController.showLeaderboardPage)
router.get('/parents', userController.mustBeLoggedIn, userController.showParentsPage)
router.get('/parents/print/:weekId', userController.mustBeLoggedIn, userController.showPrintableLesson)

// game routes
//router.post('/saveScore', userController.mustBeLoggedIn, missionController.compareScoreAndSave) FOR LEGATO SMOOTH
//router.post('/sendPacmanHighScores', missionController.updatePacmanHighscores)

// practice routes
router.post('/updateLastSubmittedDateAndAddPoints', userController.mustBeLoggedIn, missionController.updateLastSubmittedDateAndAddPoints)
router.post('/guessBPM', userController.mustBeLoggedIn, missionController.checkBPM)
router.post('/sendCheckedSnapshot', userController.mustBeLoggedIn, messageController.sendCheckedSnapshot)

// admin routes
router.get('/admin', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewAdminPage)
router.get('/admin/student-view', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewAdminStudent)
router.post('/admin/student-field', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.updateAdminStudentField)
router.post('/admin/student-create', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.createAdminStudent)
router.post('/admin/student-password', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.updateAdminStudentPassword)
router.post('/admin/prize', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.saveAdminPrize)
router.get('/create-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewCreateWeekPage)
router.post('/create-week', userController.mustBeLoggedIn, userController.mustBeAdmin, weekController.createWeek)
router.get('/choose-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewChooseWeekPage)
router.post('/choose-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.viewEditWeekPage)
router.post('/getStudentWeekArchive', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.getStudentWeekArchive)
router.post('/edit-week', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.editWeek)
router.post('/week-email-resend', userController.mustBeLoggedIn, userController.mustBeAdmin, weekController.resendWeekEmail)
router.post('/getStudentData', userController.mustBeLoggedIn, userController.mustBeAdmin, userController.getStudentData)
router.post('/replyToStudent', userController.mustBeLoggedIn, userController.mustBeAdmin, missionController.replyToStudent)

// STORY


// sitemap
router.get('/sitemap.xml', function(req, res) {
    res.sendFile('sitemap.xml', { root: '.' });
    });

module.exports = router
