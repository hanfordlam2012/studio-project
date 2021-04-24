const Week = require('../models/Week')
const usersCollection = require('../db').db('studio-project').collection('users')
const ObjectID = require('mongodb').ObjectID

exports.createWeek = function(req, res) {
	let week = new Week(req.body, req.session.user)
	week.createWeek().then(async function(msg) {
		// find and update student
		let studentDoc = await usersCollection.findOne({"_id": ObjectID(req.body.studentId)})
		let currentLessonCount = studentDoc.lessonCount
		await usersCollection.updateOne(
      { _id: ObjectID(req.body.studentId)},
      { $set:
         {
            lessonCount:  currentLessonCount + 1
         }
      })
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