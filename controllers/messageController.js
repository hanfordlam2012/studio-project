const Message = require('../models/Message')
const session = require('express-session')

exports.sendEmail = async function(req, res) {
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