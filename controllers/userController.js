const Mission = require('../models/Mission')
const missionController = require('./missionController')
const User = require('../models/User')
const {renderSafeMarkdown} = require('../lib/safeContent')

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
            student: result.student,
            userId: result.userId, 
            secret: result.secret,
            lessonCount: result.lessonCount,
            paidLessons: result.paidLessons,
            leaderboardColor: result.leaderboardColor 
        }
        // so we can manually save to ensure callback function is run after
        req.session.save(function () {
            if (req.session.user.admin == true) {
                res.redirect('/admin')
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
exports.viewAdminPage = async function(req, res) {
    try {
        const dashboard = await User.getAdminDashboard(req.session.user.secret, req.session.user.userId)
        res.render('adminDashboard', {
            students: dashboard.students,
            prizes: dashboard.prizes,
            adErrors: req.flash('adErrors'),
            adminSuccess: req.flash('adminSuccess')
        })
    } catch (error) {
        req.flash('adErrors', 'The Studio Desk could not be loaded.')
        req.session.save(() => res.redirect('/practice'))
    }
}

exports.updateAdminStudentField = async function(req, res) {
    try {
        const value = await User.updateAdminStudentField(req.session.user.secret, req.body.studentId, req.body.field, req.body.value)
        res.json({ok: true, value: value})
    } catch (error) {
        res.status(400).json({ok: false, error: error.message || 'That change could not be saved.'})
    }
}

exports.createAdminStudent = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.createAdminStudent(req.session.user.secret, req.body))
    } catch (error) {
        req.flash('adErrors', error.message || 'The student could not be added.')
    }
    req.session.save(() => res.redirect('/admin#studentList'))
}

exports.updateAdminStudentPassword = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.updateAdminStudentPassword(req.session.user.secret, req.body.studentId, req.body.password, req.body.passwordConfirm))
    } catch (error) {
        req.flash('adErrors', error.message || 'The password could not be updated.')
    }
    req.session.save(() => res.redirect('/admin#studentList'))
}

exports.viewAdminStudent = async function(req, res) {
    try {
        const view = await User.getAdminStudentView(req.session.user.secret, req.query.studentId)
        res.render('adminStudentView', {
            student: view.student,
            students: view.students,
            studentIndex: view.index,
            weeks: view.weeks,
            adErrors: req.flash('adErrors')
        })
    } catch (error) {
        req.flash('adErrors', error.message || 'That student view could not be opened.')
        req.session.save(() => res.redirect('/admin#studentList'))
    }
}

exports.saveAdminPrize = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.saveAdminPrize(req.body))
    } catch (error) {
        req.flash('adErrors', error.message || 'The reward could not be saved.')
    }
    req.session.save(() => res.redirect('/admin#rewards'))
}

exports.getStudentData = function (req, res) {
    const studentId = req.body.studentId
    if (!studentId || !studentId.match(/^[a-f\d]{24}$/i)) return res.status(400).json({error: 'That student could not be found.'})
    const users = require('../db').db('studio-project').collection('users')
    users.findOne({_id: new (require('mongodb').ObjectId)(studentId), secret: req.session.user.secret, student: true}, {projection: {_id: 1}}).then((ownedStudent) => {
    if (!ownedStudent) return res.status(404).json({error: 'That student could not be found.'})
    getThesePropertyValuesForUser(['practiceConversations'], studentId).then((practiceConversations) => {
        User.getLatestComments(req.body.studentId).then((lastLessonComments) => {
            const student = req.body.studentId && req.body.studentId.match(/^[a-f\d]{24}$/i)
                ? require('../db').db('studio-project').collection('users').findOne(
                    {_id: new (require('mongodb').ObjectId)(studentId), secret: req.session.user.secret, student: true},
                    {projection: {fName: 1, lName: 1, parentName: 1, email: 1, lessonCount: 1}}
                )
                : Promise.resolve(null)
            student.then((studentContact) => {
            const latestComments = lastLessonComments[0] && lastLessonComments[0].comments
            const lastLessonHTML = latestComments ? renderSafeMarkdown(latestComments) : ''
            res.json(
                {
                    practiceConversations: practiceConversations,
                    lastLessonComments: lastLessonComments,
                    lastLessonHTML: lastLessonHTML,
                    student: studentContact
                }
            )
            })
        })
    })
    })
}

exports.viewCreateWeekPage = function (req, res) {
    User.getStudentList(req.session.user.secret, req.session.user.userId).then(function (studentList) {
        res.render('createWeekV2', {
            studentList: studentList, 
            success: req.flash('success'),
            warnings: req.flash('warning'),
            errors: req.flash('createError')
        })
    }).catch(function () {
        res.send("Student list didn't build sucessfully.")
    })
}

exports.viewChooseWeekPage = function (req, res) {
    User.getStudentList(req.session.user.secret, req.session.user.userId).then(function(studentList) {
        res.render('pathArchive', {
            studentList: studentList,
            success: req.flash('success'),
            errors: req.flash('editError')
        })
    }).catch(function() {
        res.send("Student list didn't build successfully.")
    })
}

exports.getStudentWeekArchive = function(req, res) {
    User.getStudentWeekArchive(req.session.user.secret, req.body.studentId).then(function(weeks) {
        res.json({weeks: weeks})
    }).catch(function() {
        res.status(500).json({weeks: [], error: 'The archive could not be loaded.'})
    })
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
    User.findWeekAndUpdate(req.session.user.secret, req.body).then(async function (result) {
        if (result.publishedNow) {
            await require('../db').db('studio-project').collection('users').updateOne({_id: result.studentId}, {$inc: {lessonCount: 1, leaderboardScore: result.pointsAdd}})
        }
        req.flash('success', result.message)
        req.session.save(function() { res.redirect('/choose-week') })
    }).catch(function(error) {
        req.flash('editError', error)
        req.session.save(function() { res.redirect('/choose-week') })
    })
}

exports.showFeedbackPage = function(req, res) {
    res.render('feedback', {
        fName: req.session.user.fName
    })
}

exports.showSchedulePage = function(req, res) {
    res.render('schedule')
}

exports.showShopPage = function(req, res) {
    res.render('shop')
}
exports.showHolisticPage = function(req, res) {
    res.render('holistic')
}

exports.showSuccessPage = function(req, res) {
    res.render('success')
}

exports.showPromoPage = function(req, res) {
    res.render('promo')
}

exports.showTutorialsPage = function(req, res) {
    User.getTutorials().then((tutorials) => {
        res.render('tutorials', {
            tutorials: tutorials
    })
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
                        missionController.getBPMFeedback(req.session.user.userId).then((BPMFeedback) => {
                            res.render('practicePageV2', {
                                username: req.session.user.username,
                                fName: req.session.user.fName,
                                userId: req.session.user.userId,
                                parentName: req.session.user.parentName,
                                admin: req.session.user.admin,
                                randomBPM: randomBPM, // taken from admin acc + other operations performed, don't modify!
                                BPMStatus: BPMFeedback.status, // 'success' 'notQuite' 'open'
                                BPMGuess: BPMFeedback.guess,
                                latestComments: latestComments,
                                adErrors: req.flash('adErrors'),
                                status: req.flash('status'),
                                checklistStatus: req.flash('checklistStatus'),
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
  
    User.getMissionsAccomplished(req.session.user.userId).then((missionsAccomplished) => {
        User.getRepertoirePolished(req.session.user.userId).then((repertoirePolished) => {
        getThesePropertyValuesForUser([
            'leaderboardScore',
            'practiceConversations'
            ],req.session.user.userId).then((userProps) => {
                getFromAdmin([
                'pacmanHighscores',
                'interestingVideoURL', 
                'interestingVideoPrompt', 
                'readingPracticePDFPath', 
                'readingPracticePrompt',
                'practicePrompt'
                ]).then((adminProps) => {
                    missionController.getRandomBPM().then((randomBPM) => {
                    // function not yet written, need to return object with props BPMStatus, points
                    missionController.getBPMStatus(req.session.user.userId).then((BPMStatus) => {
                        Mission.getPracticeStatus(req.session.user.userId).then((practiceStatus) => {
                        res.render('missionsPageV2', {
                            username: req.session.user.username,
                            fName: req.session.user.fName,
                            userId: req.session.user.userId,
                            parentName: req.session.user.parentName,
                            admin: req.session.user.admin,
                            missionsAccomplished: missionsAccomplished,
                            repertoirePolished: repertoirePolished,
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
                            interestingVideoPrompt: adminProps.interestingVideoPrompt,
                            practiceConversation: userProps.practiceConversations,
                            practicePrompt: adminProps.practicePrompt,
                            practiceStatus: practiceStatus // true if already practised
                        })
                        })
                    })
                })
            })
        })
    })
})}

exports.showLeaderboardPage = function(req, res) {
    User.getPrizeList().then((prizeList) => {
      User.getLeaderboard().then((leaderboardObject) => {
        getThesePropertyValuesForUser([
            'leaderboardScore',
            'practiceConversations'
            ],req.session.user.userId).then((userProps) => {
                getFromAdmin([
                    'practicePrompt'
                    ]).then((adminProps) => {
                        Mission.getPracticeStatus(req.session.user.userId).then((practiceStatus) => {
                        res.render('leaderboardPageV2', {
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
                            points: userProps.leaderboardScore,
                            practiceConversation: userProps.practiceConversations,
                            practicePrompt: adminProps.practicePrompt,
                            practiceStatus: practiceStatus, // true if already practised
                        })
                    })
                    })
        
                })  
            })
        })
}

exports.showParentsPage = function(req, res) {
    getThesePropertyValuesForUser([
        'leaderboardScore',
        'playlistLink'
        ],req.session.user.userId).then((userProps) => {
        User.getStudentWeeks(req.session.user.userId).then(function (data) {
            let studentWeeks = data.studentWeeks
            let dateLabels = data.graphData.dateLabels
            let rhythmArray = data.graphData.componentsArray.rhythmArray
            let coordinationArray = data.graphData.componentsArray.coordinationArray
            let toneArray = data.graphData.componentsArray.toneArray
            let dynamicsArray = data.graphData.componentsArray.dynamicsArray
            let stylisticArray = data.graphData.componentsArray.stylisticArray
            res.render('lessonHistoryV2', {
                // general
                username: req.session.user.username,
                fName: req.session.user.fName,
                userId: req.session.user.userId,
                parentName: req.session.user.parentName,
                admin: req.session.user.admin,
                // record
                playlistLink: userProps.playlistLink,
                dateLabels: dateLabels,
                rhythmArray: rhythmArray,
                coordinationArray: coordinationArray,
                toneArray: toneArray,
                dynamicsArray: dynamicsArray,
                stylisticArray: stylisticArray,
                studentWeeks: studentWeeks.slice().reverse(),
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
    if (req.session.user && req.session.user.student) {
        res.redirect('/practice')
    } else {    
        res.render('reports-guest', { errors: req.flash('errors'), regErrors: req.flash('regErrors') })
    }
}

exports.showPrintableLesson = async function(req, res) {
    try {
        const week = await User.getPrintableStudentWeek(req.session.user.userId, req.params.weekId)
        if (!week) return res.status(404).render('404')
        res.render('printLesson', {week: week, studentName: req.session.user.fName || req.session.user.username})
    } catch (error) {
        res.status(404).render('404')
    }
}
