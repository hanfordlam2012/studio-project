const session = require('express-session')
const Mission = require('../models/Mission')
const missionController = require('./missionController')
const User = require('../models/User')

// REGISTRATION FUNCTIONS
exports.isCorrect = async function (req, res) {
    let bool = await User.checkSecret(req.body.secret)
    res.json(bool)
}

exports.doesUsernameExist = function (req, res) {
    // sent by axios
    User.findByUsername(req.body.username).then(function (userDoc) {
        if (userDoc) {
            res.json(true)
        } else {
            res.json(false)
        }
    }).catch(function (err) {
        console.log(err)
    })
}

exports.doesEmailExist = async function (req, res) {
    // sent by axios
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.register = function (req, res) {
    let user = new User(req.body)
    user.register().then((sessionData) => {
        req.session.user = { 
            fName: sessionData.fName, 
            parentName: sessionData.parentName, 
            admin: sessionData.admin, 
            userId: sessionData.userId 
        }
        req.session.save(function () {
            res.redirect('/reports')
        })
    }).catch((regErrors) => {
        regErrors.forEach(function (error) {
            req.flash('regErrors', error)
        })
        req.session.save(function () {
            res.redirect('/reports')
        })
    })
}


// AUTHENTICATION FUNCTIONS
exports.mustBeLoggedIn = function (req, res, next) {
    if (req.session.user) {
        next()
    } else {
        req.flash("errors", "You must be logged in to perform this action.")
        req.session.save(function () {
            res.redirect('/reports')
        })
    }
}

exports.mustBeAdmin = async function (req, res, next) {
    if (req.session.user.admin == true) {
        next()
    } else {
        req.flash("adErrors", "You must have administrative privileges to perform this action.")
        req.session.save(function () {
            res.redirect('/reports')
        })
    }
}

exports.login = function (req, res) {
    let user = new User(req.body)
    // login() returns a new Promise
    // then() handles Promise resolve
    // catch() handles Promise reject
    user.login().then(function (result) {
        // session property added by express-session in app.js
        // session package recognises changes to session object and auto updates database
        req.session.user = { 
            username: result.username,
            fName: result.fName, 
            lName: result.lName, 
            parentName: result.parentName, 
            admin: result.admin, 
            userId: result.userId, 
            secret: result.secret,
            lessonCount: result.lessonCount,
            paidLessons: result.paidLessons,
            leaderboardColor: result.leaderboardColor 
        }
        // so we can manually save to ensure callback function is run after
        req.session.save(function () {
            if (req.session.user.admin == true) {
                res.redirect('/create-week')
            } else {
                res.redirect('/reports')
            }
        })
    }).catch(function (e) {
        // create flash object - req.session.flash.errors = [e]
        req.flash('errors', e)
        req.session.save(function () {
            res.redirect('/reports')
        })
    })
}

exports.logout = function (req, res) {
    req.session.destroy(function () {
        res.redirect('/reports')
    })
}

// ADMIN FUNCTIONS
exports.getStudentData = function (req, res) {
    console.log(req.body)
    getThesePropertyValuesForUser(['practiceConversations'], req.body.studentId).then((practiceConversations) => {
        User.getLatestComments(req.body.studentId).then((lastLessonComments) => {
            res.json(
                {
                    practiceConversations: practiceConversations,
                    lastLessonComments: lastLessonComments
                }
            )
        })
    })    
}

exports.viewCreateWeekPage = function (req, res) {
    User.getStudentList(req.session.user.secret, req.session.user.userId).then(function (studentList) {
        res.render('create-week', { 
            studentList: studentList, 
            success: req.flash('success') 
        })
    }).catch(function () {
        res.send("Student list didn't build sucessfully.")
    })
}

exports.viewChooseWeekPage = function (req, res) {
    res.render('choose-week', { msg: false })
}

exports.viewEditWeekPage = function (req, res) {
    User.getOneWeek(req.body.week_id).then(function (weekData) {
        res.render('edit-week', {
            week_id: weekData[0]._id,
            pieceName: weekData[0].pieceName,
            rhythm: weekData[0].rhythm,
            coordination: weekData[0].coordination,
            tone: weekData[0].tone,
            dynamics: weekData[0].dynamics,
            stylistic: weekData[0].stylistic,
            techAName: weekData[0].techAName,
            techAScore: weekData[0].techAScore,
            techBName: weekData[0].techBName,
            techBScore: weekData[0].techBScore,
            comments: weekData[0].comments
        })
    })
}

exports.editWeek = function (req, res) {
    User.findWeekAndUpdate(req.body).then(function (result) {
        res.render('choose-week', { msg: result })
    })
}

// STUDENT NAVIGATION FUNCTIONS
exports.showPracticePage = function(req, res) {
    getThesePropertyValuesForUser([
        'leaderboardScore',
        'practiceConversations',
        'lessonVideoURL'
        ],req.session.user.userId).then((userProps) => {
        getFromAdmin([
        'practicePrompt'
        ]).then((adminProps) => {
            User.getLatestComments(req.session.user.userId).then(function (latestComments) {
                Mission.getPracticeStatus(req.session.user.userId).then((practiceStatus) => {
                    missionController.getRandomBPM().then((randomBPM) => {
                        missionController.getBPMStatus(req.session.user.userId).then((BPMStatus) => {
                            res.render('practicePage', {
                                username: req.session.user.username,
                                fName: req.session.user.fName,
                                userId: req.session.user.userId,
                                parentName: req.session.user.parentName,
                                admin: req.session.user.admin,
                                randomBPM: randomBPM, // taken from admin acc + other operations performed, don't modify!
                                BPMStatus: BPMStatus, // 'success' 'notQuite' 'open'
                                latestComments: latestComments,
                                adErrors: req.flash('adErrors'),
                                practiceStatus: practiceStatus, // true if already practised
                                points: userProps.leaderboardScore,
                                lessonCount: req.session.user.lessonCount,
                                paidLessons: req.session.user.paidLessons,
                                leaderboardColor: req.session.user.leaderboardColor,
                                practiceConversation: userProps.practiceConversations,
                                practicePrompt: adminProps.practicePrompt,
                                recordedLessonURL: userProps.lessonVideoURL
                            })
                        })
                    })
                })
            })
        })
    })
}

exports.showMissionsPage = function(req, res) {
    User.getMissionStatuses(req.session.user.userId).then((missionStatuses) => {
        getThesePropertyValuesForUser([
            'leaderboardScore'
            ],req.session.user.userId).then((userProps) => {
                getFromAdmin([
                'pacmanHighscores',
                'interestingVideoURL', 
                'interestingVideoPrompt', 
                'readingPracticePDFPath', 
                'readingPracticePrompt',
                ]).then((adminProps) => {
                    missionController.getRandomBPM().then((randomBPM) => {
                    // function not yet written, need to return object with props BPMStatus, points
                    missionController.getBPMStatus(req.session.user.userId).then((BPMStatus) => {
                        res.render('missionsPage', {
                            username: req.session.user.username,
                            fName: req.session.user.fName,
                            userId: req.session.user.userId,
                            parentName: req.session.user.parentName,
                            admin: req.session.user.admin,
                            missionStatuses: missionStatuses,
                            points: userProps.leaderboardScore,
                            adErrors: req.flash('adErrors'),
                            randomBPM: randomBPM, // taken from admin acc
                            BPMStatus: BPMStatus, // 'success' 'notQuite' 'open'
                            lessonCount: req.session.user.lessonCount,
                            paidLessons: req.session.user.paidLessons,
                            leaderboardColor: req.session.user.leaderboardColor,
                            pacmanHighscores: adminProps.pacmanHighscores,
                            readingPracticePDFPath: adminProps.readingPracticePDFPath,
                            readingPracticePrompt: adminProps.readingPracticePrompt,
                            interestingVideoURL: adminProps.interestingVideoURL,
                            interestingVideoPrompt: adminProps.interestingVideoPrompt
                        })
                    })
                })
            })
        })
    })
}

exports.showLeaderboardPage = function(req, res) {
    User.getPrizeList().then((prizeList) => {
      User.getLeaderboard().then((leaderboardObject) => {
        getThesePropertyValuesForUser([
            'leaderboardScore'
            ],req.session.user.userId).then((userProps) => {
            res.render('leaderboardPage', {
            username: req.session.user.username,
            fName: req.session.user.fName,
            userId: req.session.user.userId,
            parentName: req.session.user.parentName,
            admin: req.session.user.admin,
            leaderboard: leaderboardObject.leaderboard,
            adErrors: req.flash('adErrors'),
            prizeList: prizeList,
            lessonCount: req.session.user.lessonCount,
            paidLessons: req.session.user.paidLessons,
            leaderboardColor: req.session.user.leaderboardColor,
            points: userProps.leaderboardScore
            })
          })
        
        })  
    })
}

exports.showParentsPage = function(req, res) {
    getThesePropertyValuesForUser([
        'leaderboardScore'
        ],req.session.user.userId).then((userProps) => {
        User.getStudentWeeks(req.session.user.userId).then(function (data) {
            let studentWeeks = data.studentWeeks
            let dateLabels = data.graphData.dateLabels
            let rhythmArray = data.graphData.componentsArray.rhythmArray
            let coordinationArray = data.graphData.componentsArray.coordinationArray
            let toneArray = data.graphData.componentsArray.toneArray
            let dynamicsArray = data.graphData.componentsArray.dynamicsArray
            let stylisticArray = data.graphData.componentsArray.stylisticArray
            res.render('parentsPage', {
                // general
                username: req.session.user.username,
                fName: req.session.user.fName,
                userId: req.session.user.userId,
                parentName: req.session.user.parentName,
                admin: req.session.user.admin,
                // record
                dateLabels: dateLabels,
                rhythmArray: rhythmArray,
                coordinationArray: coordinationArray,
                toneArray: toneArray,
                dynamicsArray: dynamicsArray,
                stylisticArray: stylisticArray,
                studentWeeks: studentWeeks,
                adErrors: req.flash('adErrors'),
                lessonCount: req.session.user.lessonCount,
                paidLessons: req.session.user.paidLessons,
                leaderboardColor: req.session.user.leaderboardColor,
                points: userProps.leaderboardScore
            })
        })
    })
}

exports.reports = function (req, res) {
    if (req.session.user) {
        res.redirect('/practice')
    } else {
        res.render('reports-guest', { errors: req.flash('errors'), regErrors: req.flash('regErrors') })
    }
}