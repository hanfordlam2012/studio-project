const Message = require('../models/Message')
const session = require('express-session')
const axios = require('axios')

exports.sendEmail = async function(req, res) {
    // CHANGE FRONTEND TO v2 first because v3 gives no fallback for failures
    // axios to verify grecaptcha
    // send a POST request
    // chain next actions via Promise
    Message.sendEmail(req.body).then((response) => {
        req.flash("status", response)
        req.session.save(function() {
            res.redirect('/#contactForm')
        })
    }).catch((err) => {
        req.flash("status", err)
        req.session.save(function() {
            res.redirect('/#contactForm')
        })
    })
}

exports.sendQuizToHanford = function(req, res) {
    Message.sendQuizToHanford(req.body).then((response) => {
        res.send("Thank you very much for sending your responses to Hanford.<br>The next task is to begin your Term 4 Project: MUSIC STYLES POWERPOINT.<br>Please go to OneNote and follow the instructions there.<br>Have a great day!")
    }).catch((err) => {
        res.send(err)
    })
}

exports.sendFeedbackToHanford = function(req, res) {
    Message.sendFeedbackToHanford(req.body).then(() => {
        res.send("Thank you very much! Your feedback has been sent to Hanford. You can close this page now!")
    }).catch((err) => {
        res.send(err)
    })
}

exports.sendMelodyToHanford = function(req, res) {
    Message.sendMelodyToHanford(req.body).then((response) => {
        res.send("Thank you very much! Your responses have been sent to Hanford. You can close this page now!")
    }).catch((err) => {
        res.send(err)
    })
}

exports.sendCheckedSnapshot = async function(req, res) {
    if (!req.body.taskResponses || ![].concat(req.body.taskResponses).filter(Boolean).length) {
        req.flash("checklistStatus", "empty")
        return req.session.save(function() { res.redirect('/practice') })
    }
    try {
        const update = await require('../models/User').saveTaskResponses(req.session.user.userId, req.body.weekId, req.body.taskResponses, req.body.taskLabels, req.body.practiceQuestion)
        const labels = {started: 'Started', changed: 'Something changed', secure: 'Feels secure', help: 'I need help'}
        req.body.checkedItems = update.items.map(item => `${labels[item.status]} — ${item.label || `Task ${item.taskIndex + 1}`}`)
        await Message.sendCheckedSnapshot(req)
        req.flash("checklistStatus", update.awardedPoints ? "successPoints" : "success")
    } catch (error) {
        req.flash("checklistStatus", "fail")
    }
    req.session.save(function() { res.redirect('/practice') })
}
