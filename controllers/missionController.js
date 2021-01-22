const Mission = require('../models/Mission')
const usersCollection = require('../db').db('studio-project').collection('users')
const session = require('express-session')
const ObjectID = require('mongodb').ObjectID

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

exports.compareScoreAndSave = async function(req, res) {
    let userDoc = await usersCollection.findOne({"_id": ObjectID(req.session.user.userId)})
    let currentScore =  parseInt(req.body.score, 10)
    if (userDoc.leaderboardScore >= currentScore) {
        return
    } else {
        usersCollection.updateOne({"_id": ObjectID(req.session.user.userId)}, { $set: {"leaderboardScore": currentScore} })
    }
}