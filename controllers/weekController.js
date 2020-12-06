const Week = require('../models/Week')

exports.createWeek = function(req, res) {
	let week = new Week(req.body, req.session.user)
	week.createWeek().then(function(msg) {
			req.flash('success', msg)
		req.session.save(function() {
			res.redirect('/create-week')
		})
	}).catch(function(errors) {
		errors.forEach(function(error) {
			req.flash('createError', error)
		})
		req.session.save(function() {
			res.redirect('/create-week')
		})
	})
}