const missionsCollection = require('../db').db('studio-project').collection('missions')
const usersCollection = require('../db').db('studio-project').collection('users')
const weeksCollection = require('../db').db('studio-project').collection('weeks')
const sessionsCollection = require('../db').db('studio-project').collection('sessions')
const ObjectId = require('mongodb').ObjectId
const Message = require('./Message')
const sanitizeHTML = require('../lib/safeContent').plainText
const bcrypt = require('bcryptjs')

let Mission = function(data) {
    this.data = data
    this.errors = []
}

// Template to set fields (both existing or not)
giveEveryoneASomething = async function() {
    //let d = new Date()
    //d.setHours(d.getHours() + 11)
    await usersCollection.updateMany(
      { },
      { $set:
         {
            repertoirePolished: []
         }
      }
   )
}

deleteThese = async function() {
    await weeksCollection.deleteMany()
}

// For timezones
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000))
    return this
}

Mission.getPracticeStatus = function(userId) {
    return new Promise(async(resolve, reject) => {
        let userDoc = await usersCollection.findOne({"_id": new ObjectId(userId)})
        let lastSubmittedDate = userDoc.lastSubmittedDate
        if (!(lastSubmittedDate instanceof Date)) return resolve(false)
        let sydneyDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Australia/Sydney',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
        resolve(sydneyDate.format(lastSubmittedDate) === sydneyDate.format(new Date()))
    })
}

Mission.replyToStudent = async function(studentId, reply, secret) {
    if (typeof studentId !== 'string' || !studentId.match(/^[a-f\d]{24}$/i)) throw new Error('That student could not be found.')
    let userDoc = await usersCollection.findOne({"_id": new ObjectId(studentId), secret: secret, student: true})
    if (!userDoc) throw new Error('That student is not attached to this studio account.')
    let practiceConversation = Array.isArray(userDoc.practiceConversations) ? userDoc.practiceConversations : []
    reply = sanitizeHTML(reply, {allowedTags: [], allowedAttributes: []})
    if (!reply.trim()) throw new Error('Write a reply before sending.')
    if (reply.length > 1200) throw new Error('Keep the reply under 1,200 characters.')
    if(practiceConversation.length > 20) {
        practiceConversation.shift()
        practiceConversation.push(['Hanford', reply])
    } else {
        practiceConversation.push(['Hanford', reply])
    }
    await usersCollection.updateOne({"_id": new ObjectId(studentId), secret: secret, student: true}, { $set: {"practiceConversations": practiceConversation} })
}

Mission.updatePracticeConversationAndEmailHanford = async function(data, userId, username) {
    //used plural to distinguish from existing practiceConversation, smooth implementation from current
    let userDoc = await usersCollection.findOne({"_id": new ObjectId(userId)})
    let practiceConversation = userDoc.practiceConversations
    data.practiceConversation = sanitizeHTML(data.practiceConversation, {allowedTags: [], allowedAttributes: []})
    if(practiceConversation.length > 20) {
        practiceConversation.shift()
        practiceConversation.push(['You', data.practiceConversation])
    } else {
        practiceConversation.push(['You', data.practiceConversation])
    }
    await usersCollection.updateOne({"_id": new ObjectId(userId)}, { $set: {"practiceConversations": practiceConversation} })
    Message.sendEmail({message:JSON.stringify(data), email:username})
}

Mission.updateLastSubmittedDateAndAddPoints = async function(points, userId) {
    const practicePoints = parseInt(points, 10)
    const todaysDate = new Date()
    const awardDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(todaysDate)
    const award = await usersCollection.updateOne({
        _id: new ObjectId(userId),
        student: true,
        lastCorrespondenceAwardDay: {$ne: awardDay}
    }, {
        $set: {lastSubmittedDate: todaysDate, lastCorrespondenceAwardDay: awardDay},
        $inc: {leaderboardScore: practicePoints}
    })
    if (!award.modifiedCount) await usersCollection.updateOne({_id: new ObjectId(userId), student: true}, {$set: {lastSubmittedDate: todaysDate}})
    return Boolean(award.modifiedCount)
}

Mission.claimQuaverAttack = async function(userId, code) {
    const completionHash = String(process.env.QUAVER_COMPLETION_CODE_HASH || '')
    if (!completionHash) throw new Error('The Quaver Attack completion code is awaiting studio setup.')
    const submittedCode = String(code || '').trim()
    if (!submittedCode || submittedCode.length > 80) throw new Error('Enter the code shown at the end of the game.')
    if (!await bcrypt.compare(submittedCode, completionHash)) throw new Error('That is not the completion code. Check the final screen and try again.')
    const completedAt = new Date()
    const result = await usersCollection.updateOne({
        _id: new ObjectId(userId),
        student: true,
        'missionProgress.quaverAttack.completedAt': {$exists: false}
    }, {
        $set: {'missionProgress.quaverAttack.completedAt': completedAt, 'missionProgress.quaverAttack.pointsAwarded': 100},
        $inc: {leaderboardScore: 100}
    })
    if (!result.modifiedCount) return {awarded: false}
    return {awarded: true, completedAt: completedAt}
}
    

module.exports = Mission
