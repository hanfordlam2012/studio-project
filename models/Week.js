const weeksCollection = require('../db').db('studio-project').collection('weeks')
const ObjectId = require('mongodb').ObjectId
const sanitizeHTML = require('../lib/safeContent').plainText

function normalizeObservationHeading(value) {
    return String(value || '')
        .replace(/The Quiet Knot/gi, 'What Hanford noticed')
        .replace(/Quiet Knot/gi, 'What Hanford noticed')
        .replace(/What I Noticed/gi, 'What Hanford noticed')
}

// For timezones
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000))
    return this
}

let Week = function(weekData, sessionData) {
    this.weekData = weekData
    this.sessionData = sessionData
    this.errors = []
}

Week.prototype.cleanUp = function() {
    if (typeof(this.weekData.studentId) != "string") {this.weekData.studentId = ""}
    if (typeof(this.weekData.pieceName) != "string") {this.weekData.pieceName = ""}
    if (typeof(this.weekData.rhythm) != "string") {this.weekData.rhythm = ""}
    if (typeof(this.weekData.coordination) != "string") {this.weekData.coordination = ""}
    if (typeof(this.weekData.tone) != "string") {this.weekData.tone = ""}
    if (typeof(this.weekData.dynamics) != "string") {this.weekData.dynamics = ""}
    if (typeof(this.weekData.stylistic) != "string") {this.weekData.stylistic = ""}
    if (typeof(this.weekData.techAName) != "string") {this.weekData.techAName = ""}
    if (typeof(this.weekData.techAScore) != "string") {this.weekData.techAScore = ""}
    if (typeof(this.weekData.techBName) != "string") {this.weekData.techBName = ""}
    if (typeof(this.weekData.techBScore) != "string") {this.weekData.techBScore = ""}
    if (typeof(this.weekData.comments) != "string") {this.weekData.comments = ""}
    if (typeof(this.weekData.lessonFocus) != "string") {this.weekData.lessonFocus = ""}
    if (typeof(this.weekData.quietKnot) != "string") {this.weekData.quietKnot = ""}
    if (typeof(this.weekData.practiceTasks) != "string") {this.weekData.practiceTasks = "[]"}
    if (typeof(this.weekData.pieces) != "string") {this.weekData.pieces = "[]"}
    if (typeof(this.weekData.generalNote) != "string") {this.weekData.generalNote = ""}
    if (typeof(this.weekData.familySummary) != "string") {this.weekData.familySummary = ""}
    if (typeof(this.weekData.emailSubject) != "string") {this.weekData.emailSubject = ""}
    if (typeof(this.weekData.scheduledFor) != "string") {this.weekData.scheduledFor = ""}
    const status = this.weekData.submissionAction === 'draft' ? 'draft' : (this.weekData.submissionAction === 'schedule' ? 'scheduled' : 'published')
    const pointsAdd = Number(this.weekData.pointsAdd)

    const pieces = cleanPieces(this.weekData.pieces)
    const firstPiece = pieces[0]

    let createdDate = new Date()

    // get rid of bogus properties
    this.weekData = {
        studentId: this.weekData.studentId,
        adminId: new ObjectId(this.sessionData.userId),
        pieceName: firstPiece ? firstPiece.pieceName : this.weekData.pieceName.trim(),
        rhythm: this.weekData.rhythm,
        coordination: this.weekData.coordination,
        tone: this.weekData.tone,
        dynamics: this.weekData.dynamics,
        stylistic: this.weekData.stylistic,
        techAName: this.weekData.techAName.trim(),
        techAScore: this.weekData.techAScore,
        techBName: this.weekData.techBName.trim(),
        techBScore: this.weekData.techBScore,
        comments: normalizeObservationHeading(sanitizeHTML(this.weekData.comments, {allowedTags: [], allowedAttributes: []})),
        lessonFocus: firstPiece ? firstPiece.lessonFocus : sanitizeHTML(this.weekData.lessonFocus, {allowedTags: [], allowedAttributes: []}).trim(),
        quietKnot: firstPiece ? firstPiece.quietKnot : sanitizeHTML(this.weekData.quietKnot, {allowedTags: [], allowedAttributes: []}).trim(),
        practiceTasks: firstPiece ? firstPiece.practiceTasks : cleanPracticeTasks(this.weekData.practiceTasks),
        pieces: pieces,
        generalNote: sanitizeHTML(this.weekData.generalNote, {allowedTags: [], allowedAttributes: []}).trim(),
        familySummary: sanitizeHTML(this.weekData.familySummary, {allowedTags: [], allowedAttributes: []}).trim(),
        emailSubject: sanitizeHTML(this.weekData.emailSubject, {allowedTags: [], allowedAttributes: []}).replace(/[\r\n]+/g, ' ').trim().slice(0, 140),
        emailParentRequested: this.weekData.emailParent === 'yes',
        emailDelivery: {state: (status === 'published' || status === 'scheduled') && this.weekData.emailParent === 'yes' ? 'pending' : 'not-requested'},
        pointsAdd: Number.isInteger(pointsAdd) && pointsAdd >= 0 && pointsAdd <= 99999 ? pointsAdd : 0,
        status: status,
        scheduledFor: status === 'scheduled' ? new Date(this.weekData.scheduledFor) : null,
        publishedDate: status === 'published' ? createdDate : null,
        createdDate: createdDate.addHours(11)
    }
}

function cleanPracticeTasks(value) {
    try {
        return JSON.parse(value).slice(0, 6).map((task) => ({
            task: sanitizeHTML(String(task.task || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            why: sanitizeHTML(String(task.why || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            start: sanitizeHTML(String(task.start || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            success: sanitizeHTML(String(task.success || ''), {allowedTags: [], allowedAttributes: []}).trim()
        })).filter((task) => task.task)
    } catch (err) {
        return []
    }
}

function cleanPieces(value) {
    try {
        return JSON.parse(value).slice(0, 4).map((piece) => ({
            pieceName: sanitizeHTML(String(piece.pieceName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            lessonFocus: sanitizeHTML(String(piece.lessonFocus || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            quietKnot: sanitizeHTML(String(piece.quietKnot || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            practiceTasks: cleanPracticeTasks(JSON.stringify(piece.practiceTasks || []))
        })).filter((piece) => piece.pieceName || piece.lessonFocus || piece.quietKnot || piece.practiceTasks.length)
    } catch (err) {
        return []
    }
}

Week.prototype.validate = function() {
    if (this.weekData.studentId == "") {this.errors.push("Don't forget to select a student!")} else {this.weekData.studentId = new ObjectId(this.weekData.studentId)}
    if (this.weekData.status === 'draft') return
    if (this.weekData.status === 'scheduled' && (!this.weekData.scheduledFor || Number.isNaN(this.weekData.scheduledFor.getTime()) || this.weekData.scheduledFor <= new Date() || this.weekData.scheduledFor > new Date(Date.now() + 366 * 24 * 60 * 60 * 1000))) {this.errors.push('Choose a future publication time within the next year.')}
    if (this.weekData.pieceName == "") {this.errors.push("Don't forget to add the name of the first piece!")}
    if (!this.weekData.rhythm) {this.errors.push("Don't forget to score the rhythm component!")}
    if (!this.weekData.coordination) {this.errors.push("Don't forget to score the coordination component!")}
    if (!this.weekData.tone) {this.errors.push("Don't forget to score the tone component!")}
    if (!this.weekData.dynamics) {this.errors.push("Don't forget to score the dynamics component!")}
    if (!this.weekData.stylistic) {this.errors.push("Don't forget to score the stylistic component!")}
    if (this.weekData.comments == "") {this.errors.push("Don't forget to add some helpful comments!")}
}

Week.prototype.createWeek = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            weeksCollection.insertOne(this.weekData).then((result) => {
                resolve({message: this.weekData.status === 'draft' ? 'Draft saved to the Path Archive.' : (this.weekData.status === 'scheduled' ? 'Path scheduled for publication.' : 'Path published.'), weekId: result.insertedId, status: this.weekData.status})
            }).catch(() => {
                // if server problem
                this.errors.push("Please try again later.")
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }
    })
}

module.exports = Week
