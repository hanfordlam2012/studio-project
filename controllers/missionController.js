const Mission = require('../models/Mission')
const usersCollection = require('../db').db('studio-project').collection('users')
const session = require('express-session')
const ObjectID = require('mongodb').ObjectID

exports.checkQuiz = async function(req, res) {
    usersCollection.updateOne({"_id": ObjectID(req.body.userId)}, { $set: {"missionStatus": true} })
    Mission.checkQuiz(req.body).then((missionResults) => {
        req.flash('missionResults', missionResults)
        req.session.save(function() {
            res.redirect('/reports')
        })
    })
}