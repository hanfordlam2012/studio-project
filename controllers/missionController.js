const Mission = require('../models/Mission')
const usersCollection = require('../db').db('studio-project').collection('users')
const session = require('express-session')
const ObjectID = require('mongodb').ObjectID

// For timezones
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000))
    return this
}

// BPM GUESS GAME
exports.getRandomBPM = async function() {
    // find Hanford's document
    let userDoc = await usersCollection.findOne({"admin": true})
    let todaysDate = new Date()
    todaysDate.addHours(3)

    // compare Hanford's lastBPMUpdate with today's date
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
    // find student's document
    let userDoc = await usersCollection.findOne({"_id": ObjectID(userId) })
    let todaysDate = new Date()
    todaysDate.addHours(3)

    // compare today's date with student's last guess date
    if (todaysDate.getDate() == userDoc.lastBPMGuess.getDate()) {
        let BPMStatus = userDoc.BPMStatus
        return BPMStatus
    } else {
        return "open"
    }
}

exports.checkBPM = async function(req, res) {
    // find Hanford's, student's documents
    let adminDoc = await usersCollection.findOne({"admin": true})
    let studentDoc = await usersCollection.findOne({"_id": ObjectID(req.session.user.userId) })
    let todaysDate = new Date()
    todaysDate.addHours(3)

    // compare Hanford's ...
    if (adminDoc.randomBPM == req.body.bpmGuess) {
        let newScore = studentDoc.leaderboardScore + 15
        await usersCollection.updateOne({"_id": ObjectID(req.session.user.userId)}, { $set: {"BPMStatus": "success", "lastBPMGuess": todaysDate, "leaderboardScore": newScore} })
        res.redirect('/missions')
    } else {
        let newScore = studentDoc.leaderboardScore + getRndInt(1, 3)
        await usersCollection.updateOne({"_id": ObjectID(req.session.user.userId)}, { $set: {"BPMStatus": "notQuite", "lastBPMGuess": todaysDate, "leaderboardScore": newScore} })
        res.redirect('/missions')
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

// PRACTICE CONVERSATION
exports.updateLastSubmittedDateAndAddPoints = async function(req, res) {
    let randomInt = getRndInt(5, 10)
    await Mission.updateLastSubmittedDateAndAddPoints(randomInt, req.session.user.userId)
    await Mission.updatePracticeConversationAndEmailHanford(req.body, req.session.user.userId, req.session.user.username)
    res.redirect('/practice')
}

function getRndInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

// PACMAN HIGHSCORES
exports.updatePacmanHighscores = async function(req, res) {
    let userDoc = await usersCollection.findOne({"admin": true})
    let userHighscores = req.body.highscores
    let studentUsername = req.body.username
    let currentHighscores = userDoc.pacmanHighscores
    for (let i = 0; i < userHighscores.length; i++){
        if (userHighscores[i] > currentHighscores[i][1]){
            currentHighscores[i][0] = studentUsername
            currentHighscores[i][1] = userHighscores[i]
        }
    }
    await usersCollection.updateOne({"admin": true}, { $set: {"pacmanHighscores": currentHighscores }})
}
