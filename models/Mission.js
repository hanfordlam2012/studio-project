const missionsCollection = require('../db').db('studio-project').collection('missions')
const usersCollection = require('../db').db('studio-project').collection('users')
const ObjectID = require('mongodb').ObjectID
const Message = require('./Message')

let Mission = function(data) {
    this.data = data
    this.errors = []
}

// Template to set fields (both existing or not)
giveEveryoneASomething = async function() {
    //let d = new Date()
    //d.setHours(d.getHours() + 11)
    await usersCollection.updateMany(
      {"admin": false},
      { $unset:
         {
            practiceConversation: "",
            skillsStatuses: "",
            completeTotalScore: "",
            practiceReply: "",
            badges: ""
         }
      }
   )
}

// For timezones
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h*60*60*1000))
    return this
}

Mission.getPracticeStatus = function(userId) {
    return new Promise(async(resolve, reject) => {
        let userDoc = await usersCollection.findOne({"_id": ObjectID(userId)})
        let lastSubmittedDate = userDoc.lastSubmittedDate
        let todaysDate = new Date()
        // set time-zone
        todaysDate.addHours(3)
        if (lastSubmittedDate.getDate() == todaysDate.getDate()) {
            resolve(true)
        } else {
            resolve(false)
        }
    })
}

Mission.updatePracticeConversationAndEmailHanford = async function(data, userId, username) {
    //used plural to distinguish from existing practiceConversation, smooth implementation from current
    let userDoc = await usersCollection.findOne({"_id": ObjectID(userId)})
    let practiceConversation = userDoc.practiceConversations
    if(practiceConversation.length > 20) {
        practiceConversation.shift()
        practiceConversation.push(['You', data.practiceConversation])
    } else {
        practiceConversation.push(['You', data.practiceConversation])
    }
    await usersCollection.updateOne({"_id": ObjectID(userId)}, { $set: {"practiceConversations": practiceConversation} })
    Message.sendEmail({message:JSON.stringify(data), email:username})
}

Mission.updateLastSubmittedDateAndAddPoints = async function(points, userId) {
    let userDoc = await usersCollection.findOne({"_id": ObjectID(userId)})
    let leaderboardScore = userDoc.leaderboardScore
    let practicePoints = parseInt(points, 10)
    let todaysDate = new Date()
    // set time-zone
    todaysDate.addHours(3)
    await usersCollection.updateOne({"_id": ObjectID(userId)}, { $set: {"lastSubmittedDate": todaysDate, "leaderboardScore": leaderboardScore + practicePoints} })
}
    

module.exports = Mission