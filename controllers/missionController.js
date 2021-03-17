const Mission = require('../models/Mission')
const usersCollection = require('../db').db('studio-project').collection('users')
const session = require('express-session')
const ObjectID = require('mongodb').ObjectID

// QUIZ MISSION
exports.checkQuiz = function(req, res) {
    Mission.checkQuiz(req.body).then(async(data) => {
        req.flash('missionResult', data.missionResult)
        let userDoc = await usersCollection.findOne({"_id": ObjectID(req.body.userId)})
        let newScore = userDoc.leaderboardScore + data.quizScore
        usersCollection.updateOne({"_id": ObjectID(req.body.userId)}, { $set: {"missionStatus": true, "leaderboardScore": newScore} })
        req.session.save(function() {
            res.redirect('/reports#mini-missions')
        })
    })
}

// For timezones
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000))
    return this
}

// BPM GUESS GAME
exports.getRandomBPM = async function() {
    let userDoc = await usersCollection.findOne({"admin": true})
    let todaysDate = new Date()
    todaysDate.addHours(3)
    if (todaysDate.getDate() == userDoc.lastBPMUpdate.getDate()) {
        let randomBPM = userDoc.randomBPM
        return randomBPM
    } else {
        let randomBPM = getRndInt(3, 16) * 10
        await usersCollection.updateOne({"admin": true}, { $set: {"randomBPM": randomBPM, "lastBPMUpdate": todaysDate}})
        return randomBPM
    }
}

exports.getBPMStatus = async function(userId) {
    let userDoc = await usersCollection.findOne({"_id": ObjectID(userId) })
    let todaysDate = new Date()
    todaysDate.addHours(3)
    if (todaysDate.getDate() == userDoc.lastBPMGuess.getDate()) {
        let BPMStatus = userDoc.BPMStatus
        return BPMStatus
    } else {
        return "open"
    }
}

exports.checkBPM = async function(req, res) {
    let adminDoc = await usersCollection.findOne({"admin": true})
    let studentDoc = await usersCollection.findOne({"_id": ObjectID(req.session.user.userId) })
    let todaysDate = new Date()
    todaysDate.addHours(3)
    if (adminDoc.randomBPM == req.body.bpmGuess) {
        let newScore = studentDoc.leaderboardScore + 15
        await usersCollection.updateOne({"_id": ObjectID(req.session.user.userId)}, { $set: {"BPMStatus": "success", "lastBPMGuess": todaysDate, "leaderboardScore": newScore} })
        res.redirect('/reports#mini-missions')
    } else {
        let newScore = studentDoc.leaderboardScore + getRndInt(1, 3)
        await usersCollection.updateOne({"_id": ObjectID(req.session.user.userId)}, { $set: {"BPMStatus": "notQuite", "lastBPMGuess": todaysDate, "leaderboardScore": newScore} })
        res.redirect('/reports#mini-missions')
    }
}

// LEGATO SMOOTH
exports.compareScoreAndSave = async function(req, res) {
    let userDoc = await usersCollection.findOne({"_id": ObjectID(req.session.user.userId)})
    let currentGameScore = parseInt(req.body.score, 10)
    if (userDoc.savedGameScore >= currentGameScore) {
        return
    } else {
        let scoreDifference = currentGameScore - userDoc.savedGameScore
        await usersCollection.updateOne({"_id": ObjectID(req.session.user.userId)}, { $set: {"leaderboardScore": userDoc.leaderboardScore + scoreDifference, "savedGameScore": currentGameScore} })
    }
}

// PRACTICE LOTTERY
exports.updateLastSubmittedDateAndAddPoints = async function(req, res) {
    let randomInt = getRndInt(5, 10)
    await Mission.updateLastSubmittedDateAndAddPoints(randomInt, req.session.user.userId)
    res.redirect('/reports#print-button')
}

function getRndInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}