const weeksCollection = require('../db').db('studio-project').collection('weeks')
const ObjectID = require('mongodb').ObjectID

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

    // get rid of bogus properties
    this.weekData = {
        studentId: this.weekData.studentId,
        adminId: ObjectID(this.sessionData.userId.str),
        pieceName: this.weekData.pieceName.trim(),
        rhythm: this.weekData.rhythm,
        coordination: this.weekData.coordination,
        tone: this.weekData.tone,
        dynamics: this.weekData.dynamics,
        stylistic: this.weekData.stylistic,
        techAName: this.weekData.techAName.trim(),
        techAScore: this.weekData.techAScore,
        techBName: this.weekData.techBName.trim(),
        techBScore: this.weekData.techBScore,
        comments: this.weekData.comments,
        createdDate: new Date()
    }
}

Week.prototype.validate = function() {
    if (this.weekData.studentId == "") {this.errors.push("Don't forget to select a student!")} else {this.weekData.studentId = ObjectID(this.weekData.studentId)}
    if (this.weekData.pieceName == "") {this.errors.push("Don't forget to add the name of the piece!")}
    if (!this.weekData.rhythm) {this.errors.push("Don't forget to score the rhythm component!")}
    if (!this.weekData.coordination) {this.errors.push("Don't forget to score the coordination component!")}
    if (!this.weekData.tone) {this.errors.push("Don't forget to score the tone component!")}
    if (!this.weekData.dynamics) {this.errors.push("Don't forget to score the dynamics component!")}
    if (!this.weekData.stylistic) {this.errors.push("Don't forget to score the stylistic component!")}
    if (this.weekData.techAName == "") {this.errors.push("Don't forget to add the name of Tech A!")}
    if (!this.weekData.techAScore) {this.errors.push("Don't forget to score Tech A!")}
    if (this.weekData.techBName == "") {this.errors.push("Don't forget to add the name of Tech B!")}
    if (!this.weekData.techBScore) {this.errors.push("Don't forget to score Tech B!")}
    if (this.weekData.comments == "") {this.errors.push("Don't forget to add some helpful comments!")}
}

Week.prototype.createWeek = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length) {
            weeksCollection.insertOne(this.weekData).then(() => {
                resolve("New week created.")
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