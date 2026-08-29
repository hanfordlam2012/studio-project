const Week = require('../models/Week')
const usersCollection = require('../db').db('studio-project').collection('users')
const ObjectId = require('mongodb').ObjectId
const Message = require('../models/Message')

exports.createWeek = function(req, res) {
	let week = new Week(req.body, req.session.user)
	week.createWeek().then(async function(result) {
		if (result.status === 'draft') {
			req.flash('success', result.message)
			return req.session.save(function() { res.redirect('/choose-week') })
		}
		// find and update student
		let studentDoc = await usersCollection.findOne({"_id": new ObjectId(req.body.studentId)})
		let currentLessonCount = Number(studentDoc.lessonCount) || 0
		let currentLeaderboardScore = Number(studentDoc.leaderboardScore) || 0
		
		await usersCollection.updateOne(
      { _id: new ObjectId(req.body.studentId)},
      { $set:
         {
            lessonCount:  currentLessonCount + 1,
						leaderboardScore: Number(currentLeaderboardScore) + Number(req.body.pointsAdd)
         }
      })
		if (req.body.emailParent === 'yes') {
			if (studentDoc.email) {
				try {
					let practiceTasks = []
					let pieces = []
					try { practiceTasks = JSON.parse(req.body.practiceTasks || '[]') } catch (err) {}
					try { pieces = JSON.parse(req.body.pieces || '[]') } catch (err) {}
					await Message.sendLessonPathToParent({
						to: studentDoc.email,
						parentName: studentDoc.parentName,
						studentName: `${studentDoc.fName || ''} ${studentDoc.lName || ''}`.trim(),
						pieceName: req.body.pieceName,
						lessonFocus: req.body.lessonFocus,
						quietKnot: req.body.quietKnot,
						practiceTasks: practiceTasks,
						pieces: pieces,
						generalNote: req.body.generalNote,
						familySummary: req.body.familySummary,
						subject: req.body.emailSubject || `A new practice path for ${studentDoc.fName || 'your student'}`
					})
					await require('../models/User').recordWeekEmailDelivery(String(result.weekId), 'sent', {sentAt: new Date()})
					req.flash('success', 'Path published and family email sent.')
				} catch (err) {
					console.log('Lesson path email failed:', err.message)
					await require('../models/User').recordWeekEmailDelivery(String(result.weekId), 'failed', {errorCategory: 'delivery-failed'})
					req.flash('success', result.message)
					req.flash('warning', 'The path was published, but the family email could not be sent.')
				}
			} else {
				await require('../models/User').recordWeekEmailDelivery(String(result.weekId), 'not-sent', {errorCategory: 'no-address'})
				req.flash('success', result.message)
				req.flash('warning', 'The path was published. No family email was sent because this student has no email on file.')
			}
		} else {
			req.flash('success', result.message)
		}
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

exports.resendWeekEmail = async function(req, res) {
	let sendAttempted = false
	try {
		const User = require('../models/User')
		const data = await User.getAdminWeekForEmail(req.session.user.secret, req.body.week_id)
		await User.recordWeekEmailDelivery(req.body.week_id, 'sending')
		sendAttempted = true
		const week = data.week
		const student = data.student
		await Message.sendLessonPathToParent({
			to: student.email, parentName: student.parentName,
			studentName: `${student.fName || ''} ${student.lName || ''}`.trim(),
			pieceName: week.pieceName, lessonFocus: week.lessonFocus, quietKnot: week.quietKnot,
			practiceTasks: week.practiceTasks || [], pieces: week.pieces || [], generalNote: week.generalNote,
			familySummary: week.familySummary, subject: week.emailSubject || `A practice path for ${student.fName || 'your student'}`
		})
		await User.recordWeekEmailDelivery(req.body.week_id, 'sent', {sentAt: new Date(), resend: true})
		req.flash('success', 'Family email sent again.')
	} catch (error) {
		try { if (sendAttempted) await require('../models/User').recordWeekEmailDelivery(req.body.week_id, 'failed', {errorCategory: 'resend-failed'}) } catch (ignored) {}
		req.flash('editError', error.message || 'The family email could not be sent.')
	}
	req.session.save(() => res.redirect('/choose-week'))
}
