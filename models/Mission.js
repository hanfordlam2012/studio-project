const missionsCollection = require('../db').db('studio-project').collection('missions')
const usersCollection = require('../db').db('studio-project').collection('users')
const weeksCollection = require('../db').db('studio-project').collection('weeks')
const sessionsCollection = require('../db').db('studio-project').collection('sessions')
const ObjectId = require('mongodb').ObjectId
const Message = require('./Message')
const sanitizeHTML = require('../lib/safeContent').plainText

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

Mission.replyToStudent = async function(studentId, reply) {
    let userDoc = await usersCollection.findOne({"_id": new ObjectId(studentId)})
    let practiceConversation = userDoc.practiceConversations
    reply = sanitizeHTML(reply, {allowedTags: [], allowedAttributes: []})
    if(practiceConversation.length > 20) {
        practiceConversation.shift()
        practiceConversation.push(['Hanford', reply])
    } else {
        practiceConversation.push(['Hanford', reply])
    }
    await usersCollection.updateOne({"_id": new ObjectId(studentId)}, { $set: {"practiceConversations": practiceConversation} })
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
    let userDoc = await usersCollection.findOne({"_id": new ObjectId(userId)})
    let leaderboardScore = userDoc.leaderboardScore
    let practicePoints = parseInt(points, 10)
    let todaysDate = new Date()
    await usersCollection.updateOne({"_id": new ObjectId(userId)}, { $set: {"lastSubmittedDate": todaysDate, "leaderboardScore": leaderboardScore + practicePoints} })
}
    

module.exports = Mission
