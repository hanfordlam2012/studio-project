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
      {},
      { $set:
         {
            grade: ""
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
    await usersCollection.updateOne({"_id": ObjectID(userId)}, { $set: {"practiceConversation": data.practiceConversation} })
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

Mission.checkQuiz = async function(quizSubmit) {
    return new Promise(async(resolve, reject) => {
        let quizDoc = await missionsCollection.findOne({name: quizSubmit.name})
        let quizScore = 0
        let q1status = ``
        let q2status = ``
        let q3status = ``
        let q4status = ``
        let q5status = ``
        if (!quizSubmit.q1r) {
            q1status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q1a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q1discuss}</p>`
        } else if (quizSubmit.q1r == quizDoc.q1a) {
            q1status = `<p>You answered : "${quizSubmit.q1r}".</p><p class="green-text">Correct! + 10 points</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q1discuss}</p>`
            quizScore = quizScore + 10
        } else {
            q1status = `<p>You answered : "${quizSubmit.q1r}".</p><p class="pink-text">The correct response is "${quizDoc.q1a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q1discuss}</p>`
        }
        if (!quizSubmit.q2r) {
            q2status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q2a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q2discuss}</p>`
        } else if (quizSubmit.q2r == quizDoc.q2a) {
            q2status = `<p>You answered : "${quizSubmit.q2r}".</p><p class="green-text">Correct! + 10 points</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q2discuss}</p>`
            quizScore = quizScore + 10
        } else {
            q2status = `<p>You answered : "${quizSubmit.q2r}".</p><p class="pink-text">The correct response is "${quizDoc.q2a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q2discuss}</p>`
        }
        if (!quizSubmit.q3r) {
            q3status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q3a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q3discuss}</p>`
        } else if (quizSubmit.q3r == quizDoc.q3a) {
            q3status = `<p>You answered : "${quizSubmit.q3r}".</p><p class="green-text">Correct! + 10 points</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q3discuss}</p>`
            quizScore = quizScore + 10
        } else {
            q3status = `<p>You answered : "${quizSubmit.q3r}".</p><p class="pink-text">The correct response is "${quizDoc.q3a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q3discuss}</p>`
        }
        if (!quizSubmit.q4r) {
            q4status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q4a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q4discuss}</p>`
        } else if (quizSubmit.q4r == quizDoc.q4a) {
            q4status = `<p>You answered : "${quizSubmit.q4r}".</p><p class="green-text">Correct! + 10 points</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q4discuss}</p>`
            quizScore = quizScore + 10
        } else {
            q4status = `<p>You answered : "${quizSubmit.q4r}".</p><p class="pink-text">The correct response is "${quizDoc.q4a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q4discuss}</p>`
        }
        if (!quizSubmit.q5r) {
            q5status = `<p>You didn't answer this question.</p><p class="pink-text">The correct response is "${quizDoc.q5a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q5discuss}</p>`
        } else if (quizSubmit.q5r == quizDoc.q5a) {
            q5status = `<p>You answered : "${quizSubmit.q5r}".</p><p class="green-text">Correct! + 10 points</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q5discuss}</p>`
            quizScore = quizScore + 10
        } else {
            q5status = `<p>You answered : "${quizSubmit.q5r}".</p><p class="pink-text">The correct response is "${quizDoc.q5a}".</p><h2 class="orange-text">Discussion</h2><p class="blue-text">${quizDoc.q5discuss}</p>`
        }

        let missionResult = `
        <div class="alert alert-warning text-center pt-4">
            <p>Congrats on giving it a go - I know it was a difficult quiz.</p>
            <p>Read through the discussions and try to learn at least ONE new thing!</p>
            <p>Didn't get the score you wanted? Hanford would be glad to give you <i>some</i> points if you can teach him something new in return.</p>
        </div>
        <div class="question-div">
        <h2>Q1 : <span class="small">${quizDoc.q1}</span></h2>
        <p>${q1status}</p>
        </div>
        <div class="question-div">
        <h2>Q2 : <span class="small">${quizDoc.q2}</span></h2>  
        <p>${q2status}</p>
        </div>
        <div class="question-div">
        <h2>Q3 : <span class="small">${quizDoc.q3}</span></h2>
        <p>${q3status}</p>
        </div>
        <div class="question-div">
        <h2>Q4 : <span class="small">${quizDoc.q4}</span></h2>
        <p>${q4status}</p>
        </div>
        <div class="question-div">
        <h2>Q5 : <span class="small">${quizDoc.q5}</span></h2>
        <p>${q5status}</p>
        </div>
        `
        resolve ({missionResult: missionResult, quizScore: quizScore})
    })
}
    

module.exports = Mission