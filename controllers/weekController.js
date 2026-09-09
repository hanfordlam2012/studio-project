const Week = require('../models/Week')
const usersCollection = require('../db').db('studio-project').collection('users')
const ObjectId = require('mongodb').ObjectId
const Message = require('../models/Message')
const pathMaterials = require('../lib/pathMaterials')

function emailFailureDetails(error, category) {
	const clean = value => String(value || '').replace(/[^a-z0-9_. -]/gi, '').slice(0, 80)
	const responseCode = Number(error && error.responseCode)
	return {
		errorCategory: category,
		errorCode: clean(error && error.code) || 'UNKNOWN',
		errorCommand: clean(error && error.command),
		responseCode: Number.isInteger(responseCode) ? responseCode : null
	}
}

exports.createWeek = function(req, res) {
	try {
		pathMaterials.validateFiles(req.files || [])
	} catch (error) {
		req.flash('createError', error.message)
		return req.session.save(function() { res.redirect('/create-week') })
	}
	let week = new Week(req.body, req.session.user)
	week.createWeek().then(async function(result) {
		let attachments = []
		try {
			attachments = await pathMaterials.addMaterials(String(result.weekId), req.files || [])
			if (req.body.libraryMaterials) attachments = await pathMaterials.reuseMaterials(String(result.weekId), req.body.libraryMaterials, req.session.user.secret)
		} catch (error) {
			req.flash('warning', error.message || 'The path was saved, but its materials could not be stored.')
		}
		if (result.status !== 'published') {
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
						subject: req.body.emailSubject || `A new practice path for ${studentDoc.fName || 'your student'}`,
						attachments: pathMaterials.emailAttachments(result.weekId, attachments)
					})
					await require('../models/User').recordWeekEmailDelivery(String(result.weekId), 'sent', {sentAt: new Date()})
					req.flash('success', 'Path published and family email sent.')
				} catch (err) {
					console.log('Lesson path email failed:', err.message)
					await require('../models/User').recordWeekEmailDelivery(String(result.weekId), 'failed', emailFailureDetails(err, 'delivery-failed'))
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
			familySummary: week.familySummary, subject: week.emailSubject || `A practice path for ${student.fName || 'your student'}`,
			attachments: pathMaterials.emailAttachments(week._id, week.attachments || [])
		})
		await User.recordWeekEmailDelivery(req.body.week_id, 'sent', {sentAt: new Date(), resend: true})
		req.flash('success', 'Family email sent again.')
	} catch (error) {
		try { if (sendAttempted) await require('../models/User').recordWeekEmailDelivery(req.body.week_id, 'failed', emailFailureDetails(error, 'resend-failed')) } catch (ignored) {}
		req.flash('editError', error.message || 'The family email could not be sent.')
	}
	const destination = req.body.returnTo === 'records' ? '/admin/records#deliveries' : '/choose-week'
	req.session.save(() => res.redirect(destination))
}

exports.reschedulePath = async function(req, res) {
	try {
		const date = await require('../models/User').reschedulePath(req.session.user.secret, req.body.week_id, req.body.scheduledFor)
		await require('../lib/studioActivity').record(req.session.user, 'path-rescheduled', `Rescheduled a path for ${date.toISOString()}`)
		req.flash('operationStatus', 'The path has been rescheduled.')
	} catch (error) {
		req.flash('recordErrors', error.message || 'That path could not be rescheduled.')
	}
	req.session.save(() => res.redirect('/admin/records#scheduled'))
}
