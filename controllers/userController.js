const Mission = require('../models/Mission')
const missionController = require('./missionController')
const User = require('../models/User')
const {renderSafeMarkdown} = require('../lib/safeContent')

// REGISTRATION FUNCTIONS
exports.isCorrect = async function (req, res) {
    let bool = await User.checkSecret(req.body.secret)
    res.json(bool)
}

exports.doesUsernameExist = function (req, res) {
    // sent by axios
    User.findByUsername(req.body.username).then(function (userDoc) {
        if (userDoc) {
            res.json(true)
        } else {
            res.json(false)
        }
    }).catch(function (err) {
        console.log(err)
    })
}

exports.doesEmailExist = async function (req, res) {
    // sent by axios
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.register = function (req, res) {
    let user = new User(req.body)
    user.register().then((sessionData) => {
        req.session.user = { 
            fName: sessionData.fName, 
            parentName: sessionData.parentName, 
            admin: sessionData.admin, 
            userId: sessionData.userId 
        }
        req.session.save(function () {
            res.redirect('/reports')
        })
    }).catch((regErrors) => {
        regErrors.forEach(function (error) {
            req.flash('regErrors', error)
        })
        req.session.save(function () {
            res.redirect('/reports')
        })
    })
}

// AUTHENTICATION FUNCTIONS
exports.mustBeLoggedIn = function (req, res, next) {
    if (req.session.user) {
        next()
    } else {
        req.flash("errors", "You must be logged in to perform this action.")
        req.session.save(function () {
            res.redirect('/reports')
        })
    }
}

exports.mustBeAdmin = async function (req, res, next) {
    if (req.session.user.admin == true) {
        next()
    } else {
        req.flash("adErrors", "You must have administrative privileges to perform this action.")
        req.session.save(function () {
            res.redirect('/reports')
        })
    }
}

exports.login = function (req, res) {
    let user = new User(req.body)
    // login() returns a new Promise
    // then() handles Promise resolve
    // catch() handles Promise reject
    user.login().then(function (result) {
        // session property added by express-session in app.js
        // session package recognises changes to session object and auto updates database
        req.session.user = { 
            username: result.username,
            fName: result.fName, 
            lName: result.lName, 
            parentName: result.parentName, 
            admin: result.admin, 
            student: result.student,
            userId: result.userId, 
            secret: result.secret,
            lessonCount: result.lessonCount,
            paidLessons: result.paidLessons,
            leaderboardColor: result.leaderboardColor 
        }
        // so we can manually save to ensure callback function is run after
        req.session.save(function () {
            if (req.session.user.admin == true) {
                res.redirect('/admin')
            } else {
                res.redirect('/reports')
            }
        })
    }).catch(function (e) {
        // create flash object - req.session.flash.errors = [e]
        req.flash('errors', e)
        req.session.save(function () {
            res.redirect('/reports')
        })
    })
}

exports.logout = function (req, res) {
    req.session.destroy(function () {
        res.redirect('/reports')
    })
}

// ADMIN FUNCTIONS
exports.viewAdminPage = async function(req, res) {
    try {
        const dashboard = await User.getAdminDashboard(req.session.user.secret, req.session.user.userId)
        res.render('adminDashboard', {
            students: dashboard.students,
            prizes: dashboard.prizes,
            inbox: dashboard.inbox,
            insights: dashboard.insights,
            reviewed: dashboard.reviewed,
            studioPosts: dashboard.studioPosts,
            rewardRequests: dashboard.rewardRequests,
            adErrors: req.flash('adErrors'),
            adminSuccess: req.flash('adminSuccess')
        })
    } catch (error) {
        req.flash('adErrors', 'The Studio Desk could not be loaded.')
        req.session.save(() => res.redirect('/practice'))
    }
}

exports.updateAdminStudentField = async function(req, res) {
    try {
        const value = await User.updateAdminStudentField(req.session.user.secret, req.body.studentId, req.body.field, req.body.value)
        await require('../lib/studioActivity').record(req.session.user, 'student-field-updated', `Updated ${req.body.field}`)
        res.json({ok: true, value: value})
    } catch (error) {
        res.status(400).json({ok: false, error: error.message || 'That change could not be saved.'})
    }
}

exports.createAdminStudent = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.createAdminStudent(req.session.user.secret, req.body))
        await require('../lib/studioActivity').record(req.session.user, 'student-created', `Created account for ${req.body.fName} ${req.body.lName}`)
    } catch (error) {
        req.flash('adErrors', error.message || 'The student could not be added.')
    }
    req.session.save(() => res.redirect('/admin#studentList'))
}

exports.updateAdminStudentPassword = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.updateAdminStudentPassword(req.session.user.secret, req.body.studentId, req.body.password, req.body.passwordConfirm))
        await require('../lib/studioActivity').record(req.session.user, 'password-updated', 'Updated a student password')
    } catch (error) {
        req.flash('adErrors', error.message || 'The password could not be updated.')
    }
    req.session.save(() => res.redirect('/admin#studentList'))
}

exports.updateAdminStudentTrophies = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.updateAdminStudentTrophies(req.session.user.secret, req.body.studentId, req.body))
        await require('../lib/studioActivity').record(req.session.user, 'trophies-updated', 'Updated a student trophy cabinet')
    } catch (error) {
        req.flash('adErrors', error.message || 'The trophy cabinet could not be updated.')
    }
    req.session.save(() => res.redirect('/admin#studentList'))
}

exports.submitStudioPost = async function(req, res) {
    try {
        req.flash('studioPostStatus', await User.submitStudioPost(req.session.user.userId, req.body))
    } catch (error) {
        req.flash('studioPostError', error.message || 'The Studio Post could not be submitted.')
    }
    req.session.save(() => res.redirect('/practice?studioPost=review'))
}

exports.showStudioPostsPage = async function(req, res) {
    try {
        const noticeboard = await User.getPublishedStudioPosts(req.session.user.secret, req.session.user.userId)
        res.render('studioPostsPageV2', {
            posts: noticeboard.posts,
            points: noticeboard.points,
            fName: req.session.user.fName,
            studioPostStatus: req.flash('studioPostStatus'),
            studioPostError: req.flash('studioPostError')
        })
    } catch (error) {
        req.flash('adErrors', 'The Studio Noticeboard could not be loaded.')
        req.session.save(() => res.redirect('/practice'))
    }
}

exports.donateStudioPostPoints = async function(req, res) {
    try {
        req.flash('studioPostStatus', await User.donateStudioPostPoints(req.session.user.secret, req.session.user.userId, req.body.postId, req.body.amount))
    } catch (error) {
        req.flash('studioPostError', error.message || 'Those points could not be sent.')
    }
    req.session.save(() => res.redirect('/studio-posts#post-' + encodeURIComponent(req.body.postId || '')))
}

exports.resolveStudioPost = async function(req, res) {
    try {
        const result = await User.resolveStudioPost(req.session.user.secret, req.body.postId, req.body.decision)
        req.flash('adminSuccess', result.message)
        await require('../lib/studioActivity').record(req.session.user, 'studio-post-resolved', result.message)
    } catch (error) {
        req.flash('adErrors', error.message || 'That Studio Post could not be changed.')
    }
    req.session.save(() => res.redirect('/admin#studioPosts'))
}

exports.viewAdminStudent = async function(req, res) {
    try {
        const view = await User.getAdminStudentView(req.session.user.secret, req.query.studentId)
        res.render('adminStudentView', {
            student: view.student,
            students: view.students,
            studentIndex: view.index,
            weeks: view.weeks,
            adErrors: req.flash('adErrors'),
            adminSuccess: req.flash('adminSuccess')
        })
    } catch (error) {
        req.flash('adErrors', error.message || 'That student view could not be opened.')
        req.session.save(() => res.redirect('/admin#studentList'))
    }
}

exports.saveAdminPrize = async function(req, res) {
    try {
        req.flash('adminSuccess', await User.saveAdminPrize(req.body))
        await require('../lib/studioActivity').record(req.session.user, 'points-possibility-saved', String(req.body.title || 'Possibility updated'))
    } catch (error) {
        req.flash('adErrors', error.message || 'The reward could not be saved.')
    }
    req.session.save(() => res.redirect('/admin#rewards'))
}

exports.requestReward = async function(req, res) {
    try {
        req.flash('rewardStatus', await User.requestReward(req.session.user.userId, req.body.prizeId))
    } catch (error) {
        req.flash('adErrors', error.message || 'That reward could not be requested.')
    }
    req.session.save(() => res.redirect('/leaderboard#rewards'))
}

exports.resolveRewardRequest = async function(req, res) {
    try {
        const message = await User.resolveRewardRequest(req.session.user.secret, req.body.requestId, req.body.decision)
        req.flash('adminSuccess', message)
        await require('../lib/studioActivity').record(req.session.user, 'reward-request-resolved', message)
    } catch (error) {
        req.flash('adErrors', error.message || 'That reward request could not be changed.')
    }
    req.session.save(() => res.redirect('/admin#rewardRequests'))
}

exports.getStudentData = async function (req, res) {
    const studentId = req.body.studentId
    if (!studentId || !studentId.match(/^[a-f\d]{24}$/i)) return res.status(400).json({error: 'That student could not be found.'})
    try {
        const objectId = new (require('mongodb').ObjectId)(studentId)
        const users = require('../db').db('studio-project').collection('users')
        const student = await users.findOne({_id: objectId, secret: req.session.user.secret, student: true}, {projection: {fName: 1, lName: 1, parentName: 1, email: 1, lessonCount: 1}})
        if (!student) return res.status(404).json({error: 'That student could not be found.'})
        const lastLessonComments = await User.getLatestComments(studentId)
        const latestComments = lastLessonComments[0] && lastLessonComments[0].comments
        res.json({
            lastLessonComments: lastLessonComments,
            lastLessonHTML: latestComments ? renderSafeMarkdown(latestComments) : '',
            student: student
        })
    } catch (error) {
        console.error('Create Week student lookup failed:', error)
        res.status(500).json({error: 'Student details could not be loaded.'})
    }
}

exports.viewCreateWeekPage = function (req, res) {
    Promise.all([User.getStudentList(req.session.user.secret, req.session.user.userId), User.getPathTemplates(req.session.user.secret), User.getMaterialLibrary(req.session.user.secret)]).then(function (results) {
        res.render('createWeekV2', {
            studentList: results[0],
            pathTemplates: results[1],
            materialLibrary: results[2],
            success: req.flash('success'),
            warnings: req.flash('warning'),
            errors: req.flash('createError')
        })
    }).catch(function () {
        res.send("Student list didn't build sucessfully.")
    })
}

exports.viewChooseWeekPage = function (req, res) {
    User.getStudentList(req.session.user.secret, req.session.user.userId).then(function(studentList) {
        res.render('pathArchive', {
            studentList: studentList,
            success: req.flash('success'),
            errors: req.flash('editError')
        })
    }).catch(function() {
        res.send("Student list didn't build successfully.")
    })
}

exports.viewStudioRecords = async function(req, res) {
    try {
        const [students, materials, activity, operations, health] = await Promise.all([
            User.getStudentList(req.session.user.secret, req.session.user.userId),
            User.getMaterialLibrary(req.session.user.secret),
            require('../lib/studioActivity').recent(req.session.user.secret, 80),
            User.getStudioOperations(req.session.user.secret),
            require('../lib/studioHealth').inspect()
        ])
        res.render('studioRecords', {students, materials, activity, deliveries: operations.deliveries, scheduled: operations.scheduled, health, backupStatus: req.flash('backupStatus'), recordErrors: req.flash('recordErrors'), operationStatus: req.flash('operationStatus')})
    } catch (error) {
        req.flash('adErrors', 'Studio Records could not be loaded.')
        req.session.save(() => res.redirect('/admin'))
    }
}

exports.printStudentProgress = async function(req, res) {
    try {
        const report = await User.getStudentProgressReport(req.session.user.secret, req.params.studentId)
        await require('../lib/studioActivity').record(req.session.user, 'progress-report', `Opened progress report for ${report.student.fName} ${report.student.lName}`)
        res.render('studentExport', report)
    } catch (error) { res.status(404).render('404') }
}

exports.downloadStudioBackup = async function(req, res) {
    try {
        const backup = await require('../lib/studioBackup').create(req.session.user.secret, req.body.passphrase)
        await require('../lib/studioActivity').record(req.session.user, 'backup-created', 'Created an encrypted database backup')
        res.attachment(`music-studio-backup-${new Date().toISOString().slice(0, 10)}.studio-backup`).type('application/octet-stream').send(backup)
    } catch (error) {
        req.flash('recordErrors', error.message || 'The encrypted backup could not be created.')
        req.session.save(() => res.redirect('/admin/records#backup'))
    }
}

exports.inspectStudioBackup = function(req, res) {
    try {
        if (!req.file) throw new Error('Choose a Studio Backup file.')
        const result = require('../lib/studioBackup').inspect(req.file.buffer, req.body.passphrase)
        req.flash('backupStatus', `Valid backup from ${new Date(result.createdAt).toLocaleString('en-AU')}: ${result.counts.users} users, ${result.counts.weeks} paths, ${result.counts.pathTemplates} templates and ${result.counts.studioActivity} activity records. No data was changed.`)
    } catch (error) {
        req.flash('recordErrors', error.message || 'That backup could not be validated.')
    }
    req.session.save(() => res.redirect('/admin/records#backup'))
}

exports.savePathTemplate = async function(req, res) {
    try {
        const templateId = await User.savePathTemplate(req.session.user.secret, req.body)
        await require('../lib/studioActivity').record(req.session.user, 'path-template-saved', String(req.body.name || 'Template updated'))
        res.json({ok: true, templateId: templateId})
    } catch (error) {
        res.status(400).json({ok: false, error: error.message || 'The template could not be saved.'})
    }
}

exports.deletePathTemplate = async function(req, res) {
    try {
        await User.deletePathTemplate(req.session.user.secret, req.body.templateId)
        await require('../lib/studioActivity').record(req.session.user, 'path-template-deleted', 'Removed a reusable path template')
        res.json({ok: true})
    } catch (error) {
        res.status(400).json({ok: false, error: error.message || 'The template could not be removed.'})
    }
}

exports.markPracticeResponseReviewed = async function(req, res) {
    try {
        await User.markPracticeResponseReviewed(req.session.user.secret, req.body.weekId)
        await require('../lib/studioActivity').record(req.session.user, 'practice-update-reviewed', 'Marked a practice update reviewed')
        req.flash('adminSuccess', 'Practice update marked as reviewed.')
    } catch (error) {
        req.flash('adErrors', error.message || 'That practice update could not be changed.')
    }
    req.session.save(() => res.redirect('/admin#nextLessonInbox'))
}

exports.savePracticeResponseFlags = async function(req, res) {
    try {
        await User.savePracticeResponseFlags(req.session.user.secret, req.body.weekId, req.body.teacherFlags)
        await require('../lib/studioActivity').record(req.session.user, 'lesson-flags-saved', 'Updated next-lesson flags')
        req.flash('adminSuccess', 'Next-lesson flags saved.')
    } catch (error) {
        req.flash('adErrors', error.message || 'Those lesson flags could not be saved.')
    }
    req.session.save(() => res.redirect('/admin#nextLessonInbox'))
}

exports.reopenPracticeResponse = async function(req, res) {
    try {
        await User.reopenPracticeResponse(req.session.user.secret, req.body.weekId)
        await require('../lib/studioActivity').record(req.session.user, 'practice-update-reopened', 'Returned a reviewed update to the inbox')
        req.flash('adminSuccess', 'Practice update returned to the Next-Lesson Inbox.')
    } catch (error) {
        req.flash('adErrors', error.message || 'That reviewed update could not be reopened.')
    }
    req.session.save(() => res.redirect('/admin#reviewedUpdates'))
}

exports.getStudentWeekArchive = function(req, res) {
    User.getStudentWeekArchive(req.session.user.secret, req.body.studentId).then(function(weeks) {
        res.json({weeks: weeks})
    }).catch(function() {
        res.status(500).json({weeks: [], error: 'The archive could not be loaded.'})
    })
}

exports.viewEditWeekPage = function (req, res) {
    User.getOneWeek(req.body.week_id).then(function (weekData) {
        res.render('edit-week', {
            week_id: weekData[0]._id,
            pieceName: weekData[0].pieceName,
            rhythm: weekData[0].rhythm,
            coordination: weekData[0].coordination,
            tone: weekData[0].tone,
            dynamics: weekData[0].dynamics,
            stylistic: weekData[0].stylistic,
            techAName: weekData[0].techAName,
            techAScore: weekData[0].techAScore,
            techBName: weekData[0].techBName,
            techBScore: weekData[0].techBScore,
            comments: weekData[0].comments
        })
    })
}

exports.editWeek = function (req, res) {
    try {
        require('../lib/pathMaterials').validateFiles(req.files || [])
    } catch (error) {
        req.flash('editError', error.message)
        return req.session.save(function() { res.redirect('/choose-week') })
    }
    User.findWeekAndUpdate(req.session.user.secret, req.body).then(async function (result) {
		const pathMaterials = require('../lib/pathMaterials')
		await pathMaterials.renameMaterials(req.body.week_id, req.body.materialIds, req.body.materialNames)
		await pathMaterials.removeMaterials(req.body.week_id, req.body.removeMaterialIds)
		if (req.files && req.files.length) await pathMaterials.addMaterials(req.body.week_id, req.files)
        if (result.publishedNow) {
            await require('../db').db('studio-project').collection('users').updateOne({_id: result.studentId}, {$inc: {lessonCount: 1, leaderboardScore: result.pointsAdd}})
        }
        req.flash('success', result.message)
        req.session.save(function() { res.redirect('/choose-week') })
    }).catch(function(error) {
        req.flash('editError', error)
        req.session.save(function() { res.redirect('/choose-week') })
    })
}

exports.downloadPathMaterial = async function(req, res) {
    try {
        const found = await require('../lib/pathMaterials').findAccessibleMaterial(req.session.user, req.params.weekId, req.params.materialId)
        if (!found) return res.status(404).render('404')
        await require('fs').promises.access(found.filePath, require('fs').constants.R_OK)
        res.type(found.material.mimeType)
        res.set('X-Content-Type-Options', 'nosniff')
        res.sendFile(found.filePath)
    } catch (error) {
        res.status(404).render('404')
    }
}

exports.showFeedbackPage = function(req, res) {
    res.render('feedback', {
        fName: req.session.user.fName
    })
}

exports.showSchedulePage = function(req, res) {
    res.render('schedule')
}

exports.showShopPage = function(req, res) {
    res.render('shop')
}
exports.showHolisticPage = function(req, res) {
    res.render('holistic')
}

exports.showSuccessPage = function(req, res) {
    res.render('success')
}

exports.showPromoPage = function(req, res) {
    res.render('promo')
}

exports.showTutorialsPage = function(req, res) {
    User.getTutorials().then((tutorials) => {
        res.render('tutorials', {
            tutorials: tutorials
    })
    })
}

// STUDENT NAVIGATION FUNCTIONS
const sydneyDay = date => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date)

const practiceSubmittedToday = user => user && user.lastSubmittedDate instanceof Date && sydneyDay(user.lastSubmittedDate) === sydneyDay(new Date())

const bpmFeedbackFrom = user => {
    if (!user || !(user.lastBPMGuess instanceof Date) || sydneyDay(user.lastBPMGuess) !== sydneyDay(new Date())) return {status: 'open', guess: null}
    return {status: user.BPMStatus || 'open', guess: Number(user.lastBPMGuessValue) || null}
}

exports.showPracticePage = async function(req, res) {
    const [userProps, adminProps, latestComments] = await Promise.all([
        User.getPortalStudentSnapshot(req.session.user.userId),
        User.getPortalAdminSnapshot(),
        User.getLatestComments(req.session.user.userId)
    ])
    const randomBPM = await missionController.getRandomBPM(adminProps)
    const BPMFeedback = bpmFeedbackFrom(userProps)
    res.render('practicePageV2', {
        username: req.session.user.username, fName: req.session.user.fName, userId: req.session.user.userId,
        parentName: req.session.user.parentName, admin: req.session.user.admin, randomBPM: randomBPM,
        BPMStatus: BPMFeedback.status, BPMGuess: BPMFeedback.guess, latestComments: latestComments,
        adErrors: req.flash('adErrors'), status: req.flash('status'), checklistStatus: req.flash('checklistStatus'),
        practiceStatus: practiceSubmittedToday(userProps), points: userProps.leaderboardScore,
        lessonCount: req.session.user.lessonCount, paidLessons: req.session.user.paidLessons,
        leaderboardColor: req.session.user.leaderboardColor, practiceConversation: userProps.practiceConversations || [],
        practicePrompt: adminProps.practicePrompt, recordedLessonURL: userProps.lessonVideoURL
    })
}

exports.showMissionsPage = async function(req, res) {
    const [userProps, adminProps] = await Promise.all([
        User.getPortalStudentSnapshot(req.session.user.userId),
        User.getPortalAdminSnapshot()
    ])
    const randomBPM = await missionController.getRandomBPM(adminProps)
    res.render('missionsPageV2', {
        username: req.session.user.username, fName: req.session.user.fName, userId: req.session.user.userId,
        parentName: req.session.user.parentName, admin: req.session.user.admin,
        missionsAccomplished: userProps.missionsAccomplished || [], repertoirePolished: userProps.repertoirePolished || [],
        quaverCompletedAt: userProps.missionProgress && userProps.missionProgress.quaverAttack && userProps.missionProgress.quaverAttack.completedAt,
        quaverCodeReady: Boolean(process.env.QUAVER_COMPLETION_CODE_HASH), missionStatus: req.flash('missionStatus'), missionErrors: req.flash('missionErrors'),
        points: userProps.leaderboardScore, adErrors: req.flash('adErrors'), randomBPM: randomBPM,
        BPMStatus: bpmFeedbackFrom(userProps).status, lessonCount: req.session.user.lessonCount,
        paidLessons: req.session.user.paidLessons, leaderboardColor: req.session.user.leaderboardColor,
        pacmanHighscores: adminProps.pacmanHighscores, readingPracticePDFPath: adminProps.readingPracticePDFPath,
        readingPracticePrompt: adminProps.readingPracticePrompt, interestingVideoURL: adminProps.interestingVideoURL,
        interestingVideoPrompt: adminProps.interestingVideoPrompt, practiceConversation: userProps.practiceConversations || [],
        practicePrompt: adminProps.practicePrompt, practiceStatus: practiceSubmittedToday(userProps)
    })
}

exports.showLeaderboardPage = async function(req, res) {
    const [prizeList, leaderboardObject, userProps, adminProps] = await Promise.all([
        User.getPrizeList(), User.getLeaderboard(), User.getPortalStudentSnapshot(req.session.user.userId), User.getPortalAdminSnapshot()
    ])
    res.render('leaderboardPageV2', {
        username: req.session.user.username, fName: req.session.user.fName, userId: req.session.user.userId,
        parentName: req.session.user.parentName, admin: req.session.user.admin, leaderboard: leaderboardObject.leaderboard,
        adErrors: req.flash('adErrors'), prizeList: prizeList, lessonCount: req.session.user.lessonCount,
        paidLessons: req.session.user.paidLessons, leaderboardColor: req.session.user.leaderboardColor,
        points: userProps.leaderboardScore, practiceConversation: userProps.practiceConversations || [],
        rewardStatus: req.flash('rewardStatus'),
        quaverCompletedAt: userProps.missionProgress && userProps.missionProgress.quaverAttack && userProps.missionProgress.quaverAttack.completedAt,
        practicePrompt: adminProps.practicePrompt, practiceStatus: practiceSubmittedToday(userProps)
    })
}

exports.showParentsPage = async function(req, res) {
    const [userProps, data] = await Promise.all([
        User.getPortalStudentSnapshot(req.session.user.userId),
        User.getStudentWeeks(req.session.user.userId)
    ])
            let studentWeeks = data.studentWeeks
            let dateLabels = data.graphData.dateLabels
            let rhythmArray = data.graphData.componentsArray.rhythmArray
            let coordinationArray = data.graphData.componentsArray.coordinationArray
            let toneArray = data.graphData.componentsArray.toneArray
            let dynamicsArray = data.graphData.componentsArray.dynamicsArray
            let stylisticArray = data.graphData.componentsArray.stylisticArray
            res.render('lessonHistoryV2', {
                // general
                username: req.session.user.username,
                fName: req.session.user.fName,
                userId: req.session.user.userId,
                parentName: req.session.user.parentName,
                admin: req.session.user.admin,
                // record
                playlistLink: userProps.playlistLink,
                dateLabels: dateLabels,
                rhythmArray: rhythmArray,
                coordinationArray: coordinationArray,
                toneArray: toneArray,
                dynamicsArray: dynamicsArray,
                stylisticArray: stylisticArray,
                studentWeeks: studentWeeks.slice().reverse(),
                adErrors: req.flash('adErrors'),
                lessonCount: req.session.user.lessonCount,
                paidLessons: req.session.user.paidLessons,
                leaderboardColor: req.session.user.leaderboardColor,
                points: userProps.leaderboardScore
            })
}

exports.reports = function (req, res) {
    if (req.session.user && req.session.user.student) {
        res.redirect('/practice')
    } else {    
        res.render('reports-guest', { errors: req.flash('errors'), regErrors: req.flash('regErrors') })
    }
}

exports.showPrintableLesson = async function(req, res) {
    try {
        const week = await User.getPrintableStudentWeek(req.session.user.userId, req.params.weekId)
        if (!week) return res.status(404).render('404')
        res.render('printLesson', {week: week, studentName: req.session.user.fName || req.session.user.username})
    } catch (error) {
        res.status(404).render('404')
    }
}
