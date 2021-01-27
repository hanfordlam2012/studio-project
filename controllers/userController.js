const session = require('express-session')
const Mission = require('../models/Mission')
const missionController = require('./missionController')
const User = require('../models/User')

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
        req.session.user = { fName: result.fName, lName: result.lName, parentName: result.parentName, admin: result.admin, userId: result.userId, secret: result.secret }
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

exports.viewCreateWeekPage = function (req, res) {
    User.getStudentList(req.session.user.secret, req.session.user.userId).then(function (studentList) {
        res.render('create-week', { studentList: studentList, success: req.flash('success') })
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

exports.logout = function (req, res) {
    req.session.destroy(function () {
        res.redirect('/reports')
    })
}

exports.register = function (req, res) {
    let user = new User(req.body)
    user.register().then((sessionData) => {
        req.session.user = { fName: sessionData.fName, parentName: sessionData.parentName, admin: sessionData.admin, userId: sessionData.userId }
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

exports.reports = async function (req, res) {

    if (req.session.user) {

        User.getStudentWeeks(req.session.user.userId).then(function (data) {
            let studentWeeks = data.studentWeeks
            let dateLabels = data.graphData.dateLabels
            let rhythmArray = data.graphData.componentsArray.rhythmArray
            let coordinationArray = data.graphData.componentsArray.coordinationArray
            let toneArray = data.graphData.componentsArray.toneArray
            let dynamicsArray = data.graphData.componentsArray.dynamicsArray
            let stylisticArray = data.graphData.componentsArray.stylisticArray

            User.getLatestComments(req.session.user.userId).then(function (latestComments) {

                User.getLeaderboard().then((leaderboard) => {

                    Mission.getPracticeStatus(req.session.user.userId).then((practiceStatus) => {

                        User.getMissionStatus(req.session.user.userId).then(async(missionStatus) => {

                            let randomBPM = await missionController.getRandomBPM()
                            let BPMStatus = await missionController.getBPMStatus(req.session.user.userId)

                            if (!missionStatus) {

                                User.getMissionCode(req.session.user.userId).then(function (missionCode) {
                                    res.render('reports-loggedin', {
                                        // general
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
                                        latestComments: latestComments,
                                        // missions
                                        missionStatus: missionStatus, // true for completed mission (1 mission at a time)
                                        missionCode: missionCode, // string of dynamic HTML
                                        missionResult: req.flash('missionResult'),
                                        leaderboard: leaderboard,
                                        adErrors: req.flash('adErrors'),
                                        practiceStatus: practiceStatus, // true if already practised
                                        randomBPM: randomBPM, // taken from admin acc
                                        BPMStatus: BPMStatus // 'success' 'notQuite' 'open'
                                    })
                                })

                            } else {
                                res.render('reports-loggedin', {
                                    fName: req.session.user.fName,
                                    userId: req.session.user.userId,
                                    parentName: req.session.user.parentName,
                                    admin: req.session.user.admin,
                                    dateLabels: dateLabels,
                                    rhythmArray: rhythmArray,
                                    coordinationArray: coordinationArray,
                                    toneArray: toneArray,
                                    dynamicsArray: dynamicsArray,
                                    stylisticArray: stylisticArray,
                                    studentWeeks: studentWeeks,
                                    latestComments: latestComments,
                                    missionStatus: missionStatus,
                                    missionCode: false,
                                    missionResult: req.flash('missionResult'),
                                    leaderboard: leaderboard,
                                    adErrors: req.flash('adErrors'),
                                    practiceStatus: practiceStatus,
                                    randomBPM: randomBPM,
                                    BPMStatus: BPMStatus
                                })
                            }
                        })
                    })

                    

                })
            })




        })
    } else {
        res.render('reports-guest', { errors: req.flash('errors'), regErrors: req.flash('regErrors') })
    }
}