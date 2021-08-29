const Message = require('../models/Message')
const session = require('express-session')
const axios = require('axios')

exports.sendEmail = async function(req, res) {
    // CHANGE FRONTEND TO v2 first because v3 gives no fallback for failures
    // axios to verify grecaptcha
    // send a POST request
    // chain next actions via Promise
    console.log(req.body)
    Message.sendEmail(req.body).then((response) => {
        req.flash("status", response)
        req.session.save(function() {
            res.redirect('/contact')
        })
    }).catch((err) => {
        req.flash("status", err)
        req.session.save(function() {
            res.redirect('/contact')
        })
    })
}

exports.sendQuizToHanford = function(req, res) {
    Message.sendQuizToHanford(req.body).then((response) => {
        res.send("Thank you very much! Your responses have been sent to Hanford.")
    }).catch((err) => {
        res.send(err)
    })
}

exports.sendMelodyToHanford = function(req, res) {
    Message.sendMelodyToHanford(req.body).then((response) => {
        res.send("Thank you very much! Your responses have been sent to Hanford.")
    }).catch((err) => {
        res.send(err)
    })
}

exports.sendPacmanToHanford = function(req, res) {
    Message.sendPacmanToHanford(req.body).then((response) => {
        res.send("Thank you very much! Your responses have been sent to Hanford.")
    }).catch((err) => {
        res.send(err)
    })
}