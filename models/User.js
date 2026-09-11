// lets us hash our passwords after each user input attempt
const bcrypt = require('bcryptjs')
const ObjectId = require('mongodb').ObjectId
// opens connection to database collection
const usersCollection = require('../db').db('studio-project').collection('users')
const weeksCollection = require('../db').db('studio-project').collection('weeks')
const missionsCollection = require('../db').db('studio-project').collection('missions')
const prizesCollection = require('../db').db('studio-project').collection('prizes')
const tutorialsCollection = require('../db').db('studio-project').collection('tutorials')
const pathTemplatesCollection = require('../db').db('studio-project').collection('pathTemplates')
const studioPostsCollection = require('../db').db('studio-project').collection('studioPosts')
const studioPointDonationsCollection = require('../db').db('studio-project').collection('studioPointDonations')
const rewardRequestsCollection = require('../db').db('studio-project').collection('rewardRequests')
const mainDb = require('../db').db('studio-project')
rewardRequestsCollection.createIndex(
  {studentId: 1, prizeId: 1, status: 1},
  {unique: true, partialFilterExpression: {status: 'pending'}, name: 'one_pending_reward_per_student'}
).catch(error => console.error('Reward request index could not be prepared:', error.message))
// more convenient validation
const validator = require("validator")
const sanitizeHTML = require('../lib/safeContent').plainText
const studioPostMedia = require('../lib/studioPostMedia')

let User = function(data) {
    this.data = data
    this.errors = []
}

// prototype methods save memory space
User.prototype.register = function() {
  return new Promise(async (resolve, reject) => {
      try {
      // Validate user data
      this.cleanUp()
      await this.validate()
      } catch(err) {
          console.log(err)
      }
      // If no errors, save data to database
      if (!this.errors.length) {
          // hash user password
          let salt = bcrypt.genSaltSync(10)
          this.data.password = bcrypt.hashSync(this.data.password, salt)
          await usersCollection.insertOne(this.data)
          resolve({
            fName: this.data.fName, 
            lName: this.data.lName, 
            parentName: this.data.parentName, 
            admin: this.data.admin, 
            userId: this.data._id, 
            secret: this.data.secret})
      } else {
          reject(this.errors)
      }
  })
}

User.prototype.cleanUp = function() {


    if (typeof(this.data.fName) != "string") {this.data.fName = ""}
    if (typeof(this.data.lName) != "string") {this.data.lName = ""}
    if (typeof(this.data.parentName) != "string") {this.data.parentName = ""}
    if (typeof(this.data.email) != "string") {this.data.email = ""}
    if (typeof(this.data.mobile) != "string") {this.data.mobile = ""}
    if (typeof(this.data.username) != "string") {this.data.username = ""}
    if (typeof(this.data.password) != "string") {this.data.password = ""}
    if (typeof(this.data.secret) != "string") {this.data.secret = ""}

    // specify the properties to prevent client sending extras
    this.data = {
        fName: this.data.fName.trim(),
        lName: this.data.lName.trim(),
        parentName: this.data.parentName.trim(),
        email: this.data.email.trim(),
        mobile: this.data.mobile.replace(/\s+/g, ''),
        username: this.data.username.trim(),
        password: this.data.password,
        secret: this.data.secret,
        admin: false,
        student: false,
        leaderboardScore: 0,
        missionsAccomplished: [],
        repertoirePolished: [],
        leaderboardColor: '#ffff00',
        lastSubmittedDate: new Date(),
        savedGameScore: 0,
        BPMStatus: "",
        lastBPMGuess: new Date(),
        lessonCount: 0,
        paidLessons: 0,
        practiceConversations: [],
        grade: "",
        lessonVideoURL: "",
        studentBio: "",
        playlistLink: ""
    }
}

User.prototype.validate = function() {
    return new Promise(async (resolve, reject) => {
        try{ 
        // validate existence
        if (this.data.fName == "") {this.errors.push("You must provide a first name.")}
        if (this.data.lName == "") {this.errors.push("You must provide a last name.")}
        if (this.data.parentName == "") {this.errors.push("You must provide a first name.")}
        if (!validator.isEmail(this.data.email)) {this.errors.push("You must provide a valid email.")}
        if (!validator.isMobilePhone(this.data.mobile, 'en-AU')) {this.errors.push("You must provide a valid Australian mobile.")}
        if (this.data.username == "") {this.errors.push("You must provide a username.")}
        if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) {this.errors.push("Username can only contain letters and numbers.")}
        if (this.data.password == "") {this.errors.push("You must provide a password.")}
        // validate length
        if (this.data.fName.length > 0 && this.data.fName.length < 2) {this.errors.push("First name must be at least 2 characters.")}
        if (this.data.fName.length > 30) {this.errors.push("First name cannot exceed 30 characters.")}
        if (this.data.lName.length > 0 && this.data.lName.length < 2) {this.errors.push("Last name must be at least 2 characters.")}
        if (this.data.lName.length > 30) {this.errors.push("Last name cannot exceed 30 characters.")}
        if (this.data.parentName.length > 0 && this.data.parentName.length < 2) {this.errors.push("First name must be at least 2 characters.")}
        if (this.data.parentName.length > 30) {this.errors.push("First name cannot exceed 30 characters.")}
        if (this.data.password.length > 0 && this.data.password.length < 8) {this.errors.push("Password must be at least 8 characters.")}
        if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters.")}
        if (this.data.username.length > 0 && this.data.username.length < 3) {this.errors.push("Username must be at least 3 characters.")}
        if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters.")}
    
        // if username valid then check if already taken
        if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if (usernameExists) {this.errors.push("That username is already taken.")}
        }
        resolve()
        } catch(err) {
            reject(err)
        }
    })
}

User.prototype.login = function() {
    return new Promise(async(resolve, reject) => {
        this.cleanUp()
        // MongoDB methods return Promises
        // then() handles resolve from mongo method
        usersCollection.findOne({username: this.data.username}).then((existingUser) => {
            if (existingUser && bcrypt.compareSync(this.data.password, existingUser.password)) {
                resolve({
                  username: existingUser.username,
                  fName: existingUser.fName, 
                  lName: existingUser.lName, 
                  parentName: existingUser.parentName, 
                  admin: existingUser.admin, 
                  student: existingUser.student,
                  userId: existingUser._id, 
                  secret: existingUser.secret,
                  lessonCount: existingUser.lessonCount,
                  paidLessons: existingUser.paidLessons,
                  leaderboardColor: existingUser.leaderboardColor
                })
            } else {
                reject('Invalid username / password.')
            }
            // in case db fails
        }).catch(function() {
            reject("Please try again later.")
        })
    })
}

// retrieve props from db
// returns object with requested props and values
getThesePropertyValuesForUser = function(arrayOfProperties,userId) {
  return new Promise(async(resolve, reject) => {
    try {
      let returnObject = {}
      let userDoc = await usersCollection.findOne({'_id': new ObjectId(userId)})
      arrayOfProperties.forEach((prop) => {
        if (userDoc.hasOwnProperty(prop)) {
          returnObject[prop] = userDoc[prop]
        } else {
          console.log(prop + "not found for this user.")
        }
      })
      resolve(returnObject)
    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

getFromAdmin = function(arrayOfProperties) {
  return new Promise(async(resolve, reject) => {
    try {
      let returnObject = {}
      let adminDoc = await usersCollection.findOne({'admin': true})
      arrayOfProperties.forEach((prop) => {
        if (adminDoc.hasOwnProperty(prop)) {
          returnObject[prop] = adminDoc[prop]
        } else {
          console.log(prop + "not found for admin.")
        }
      })
      resolve(returnObject)
    } catch(err) {
      console.log(err)
      reject(err)
    }
  })
}


User.getStudentList = async function(secret, userId) {
    return new Promise(async (resolve, reject) => {
        let studentList = await usersCollection.find({"_id": {$ne: new ObjectId(userId)},"secret": secret}).project({
          fName: 1,
          lName: 1,
          parentName: 1,
          email: 1,
          lessonCount: 1,
          leaderboardScore: 1
        }).toArray()
        studentList = studentList.filter(student => student.fName != "superuser")
        resolve(studentList)
    }).catch(function(err) {reject(err)})
}

User.checkSecret = function(secret) {
    return new Promise(async (resolve, reject) => {
        let user = await usersCollection.findOne({username: "superuser"})
        if (secret == user.secret[0]) {
            console.log(true)
            resolve (true)
        } else {
            console.log(false)
            resolve(false)
        }
    })
}

User.findByUsername = async function(username) {
    return new Promise(async (resolve, reject) => {
        try {
        let userDoc = await usersCollection.findOne({username: username})
        resolve(userDoc)  
        } catch(err) {
            reject(err)
        }
    })
}

User.doesEmailExist = function(email) {
    return new Promise(async (resolve, reject) => {
        if (typeof(email) != "string") {
            resolve(false)
            return
        }

        let user = await usersCollection.findOne({email: email})
        if (user) {
            resolve (true)
        } else {
            resolve(false)
        }
    })
}

// UNSUSED - for counting document based on query
User.countLessons = async function(studentId) {
    console.log(await weeksCollection.countDocuments( { studentId: new ObjectId(studentId) } ))
}

User.getPrizeList = function() {
  return new Promise (async(resolve, reject) => {
    let prizeList = await prizesCollection.find().sort({price: -1}).toArray()
    resolve(prizeList)
  })
}

User.getLeaderboard = function() {
    return new Promise (async(resolve, reject) => {
        let leaderboard = await usersCollection.find({"student": true}).project({
          username: 1, 
          leaderboardScore: 1,
          badges: 1, 
          leaderboardColor: 1, 
          grade: 1,
          studentBio: 1
        }).sort({leaderboardScore: -1}).toArray()
        resolve({leaderboard: leaderboard})
    })
}

User.getLatestComments = function(userId) {
  return weeksCollection
    .find({studentId: new ObjectId(userId), status: 'published'})
    .sort({createdDate: -1})
    .limit(1)
    .project({comments: 1, attachments: 1, pieces: 1, practiceTasks: 1, pieceName: 1, lessonFocus: 1, quietKnot: 1, practiceResponse: 1})
    .toArray()
}

User.getOneWeek = function(week_id) {
  return new Promise(async(resolve, reject) => {
    let oneWeek = await weeksCollection.find({"_id": new ObjectId(week_id)}).toArray()
    resolve(oneWeek)
  })
}

User.getPortalStudentSnapshot = function(userId) {
  return usersCollection.findOne({_id: new ObjectId(userId)}, {projection: {
    leaderboardScore: 1,
    practiceConversations: 1,
    lessonVideoURL: 1,
    missionsAccomplished: 1,
    repertoirePolished: 1,
    playlistLink: 1,
    lastSubmittedDate: 1,
    lastBPMGuess: 1,
    lastBPMGuessValue: 1,
    BPMStatus: 1,
    missionProgress: 1
  }})
}

User.getPortalAdminSnapshot = function() {
  return usersCollection.findOne({admin: true}, {projection: {
    practicePrompt: 1,
    pacmanHighscores: 1,
    interestingVideoURL: 1,
    interestingVideoPrompt: 1,
    readingPracticePDFPath: 1,
    readingPracticePrompt: 1,
    randomBPM: 1,
    lastBPMUpdate: 1
  }})
}

function normaliseRecipientEmails(value) {
  const emails = String(value || '').split(';').map(email => email.trim().toLowerCase()).filter(Boolean)
  if (!emails.length) return ''
  if (emails.length > 5) throw new Error('Enter no more than five family email addresses.')
  if (emails.some(email => !validator.isEmail(email))) throw new Error('Enter valid email addresses separated by semicolons.')
  return [...new Set(emails)].join('; ')
}

User.saveAdminPrize = async function(data) {
  const title = sanitizeHTML(String(data.title || ''), {allowedTags: [], allowedAttributes: []}).trim()
  const desc = sanitizeHTML(String(data.desc || ''), {allowedTags: [], allowedAttributes: []}).trim()
  const price = Number(data.price)
  const color = /^#[0-9a-f]{6}$/i.test(String(data.color || '')) ? String(data.color) : '#087f76'
  if (!title || title.length > 80) throw new Error('Reward titles must contain 1 to 80 characters.')
  if (desc.length > 180) throw new Error('Reward descriptions cannot exceed 180 characters.')
  if (!Number.isInteger(price) || price === 0 || price < -999999 || price > 999999) throw new Error('Point value must be between -999,999 and 999,999, excluding zero.')
  const prize = {title: title, desc: desc, price: price, color: color}
  if (!data.prizeId) {
    await prizesCollection.insertOne(prize)
    return 'Reward added.'
  }
  if (!String(data.prizeId).match(/^[a-f\d]{24}$/i)) throw new Error('That reward could not be found.')
  const result = await prizesCollection.updateOne({_id: new ObjectId(data.prizeId)}, {$set: prize})
  const matched = typeof result.matchedCount == 'number' ? result.matchedCount : result.result && result.result.n
  if (!matched) throw new Error('That reward could not be found.')
  return 'Reward updated.'
}

User.requestReward = async function(userId, prizeId) {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(prizeId)) throw new Error('That reward could not be requested.')
  const [student, prize] = await Promise.all([
    usersCollection.findOne({_id: new ObjectId(userId), student: true}, {projection: {secret: 1, leaderboardScore: 1}}),
    prizesCollection.findOne({_id: new ObjectId(prizeId)})
  ])
  if (!student || !prize) throw new Error('That reward is no longer available.')
  const listedValue = Number(prize.price)
  if (!Number.isInteger(listedValue) || listedValue >= 0) throw new Error('That catalogue item earns points and is not redeemable.')
  const cost = Math.abs(listedValue)
  if (Number(student.leaderboardScore || 0) < cost) throw new Error(`You need ${cost - Number(student.leaderboardScore || 0)} more points for that reward.`)
  const existing = await rewardRequestsCollection.findOne({studentId: student._id, prizeId: prize._id, status: 'pending'})
  if (existing) return 'That reward is already waiting for Hanford to review.'
  try {
    await rewardRequestsCollection.insertOne({
      studentId: student._id,
      prizeId: prize._id,
      secret: student.secret,
      title: String(prize.title || 'Reward').slice(0, 80),
      cost: cost,
      status: 'pending',
      createdAt: new Date()
    })
  } catch (error) {
    if (error && error.code === 11000) return 'That reward is already waiting for Hanford to review.'
    throw error
  }
  return 'Your reward request is waiting for Hanford to review.'
}

User.resolveRewardRequest = async function(secret, requestId, decision) {
  if (!ObjectId.isValid(requestId) || !['approve', 'decline'].includes(decision)) throw new Error('That reward request could not be changed.')
  const request = await rewardRequestsCollection.findOne({_id: new ObjectId(requestId), secret: secret, status: 'pending'})
  if (!request) throw new Error('That reward request has already been handled.')
  if (decision === 'decline') {
    const declined = await rewardRequestsCollection.updateOne({_id: request._id, status: 'pending'}, {$set: {status: 'declined', resolvedAt: new Date()}})
    if (!declined.modifiedCount) throw new Error('That reward request has already been handled.')
    return `Declined ${request.title}.`
  }
  const claimed = await rewardRequestsCollection.updateOne({_id: request._id, status: 'pending'}, {$set: {status: 'processing'}})
  if (!claimed.modifiedCount) throw new Error('That reward request has already been handled.')
  const student = await usersCollection.findOneAndUpdate(
    {_id: request.studentId, secret: secret, student: true, leaderboardScore: {$gte: request.cost}},
    {$inc: {leaderboardScore: -request.cost}},
    {returnDocument: 'after', projection: {leaderboardScore: 1}}
  )
  const updatedStudent = student && (student.value || student)
  if (!updatedStudent || typeof updatedStudent.leaderboardScore !== 'number') {
    await rewardRequestsCollection.updateOne({_id: request._id, status: 'processing'}, {$set: {status: 'pending'}})
    throw new Error('The student no longer has enough points for this reward.')
  }
  await rewardRequestsCollection.updateOne({_id: request._id, status: 'processing'}, {$set: {status: 'approved', resolvedAt: new Date(), balanceAfter: updatedStudent.leaderboardScore}})
  return `Approved ${request.title}; ${request.cost} points were deducted.`
}

User.getAdminDashboard = async function(secret, userId) {
  const students = await usersCollection.find({
    _id: {$ne: new ObjectId(userId)},
    secret: secret,
    student: true
  }).project({
    fName: 1,
    lName: 1,
    parentName: 1,
    email: 1,
    username: 1,
    lessonCount: 1,
    paidLessons: 1,
    leaderboardScore: 1,
    missionsAccomplished: 1,
    repertoirePolished: 1
  }).sort({fName: 1, lName: 1}).toArray()
  const studentIds = students.map(student => student._id)
  const pathCounts = studentIds.length ? await weeksCollection.aggregate([
    {$match: {studentId: {$in: studentIds}, status: 'published'}},
    {$group: {_id: '$studentId', count: {$sum: 1}, latest: {$max: '$createdDate'}}}
  ]).toArray() : []
  const countsByStudent = new Map(pathCounts.map(item => [String(item._id), item]))
  students.forEach(student => {
    const paths = countsByStudent.get(String(student._id))
    student.pathCount = paths ? paths.count : 0
    student.latestPathDate = paths ? paths.latest : null
  })
  const inboxWeeks = studentIds.length ? await weeksCollection.find({
    studentId: {$in: studentIds},
    'practiceResponse.updatedAt': {$exists: true},
    'practiceResponse.reviewedAt': {$exists: false}
  }).project({studentId: 1, pieceName: 1, pieces: 1, lessonFocus: 1, practiceResponse: 1}).sort({'practiceResponse.updatedAt': -1}).limit(16).toArray() : []
  const studentNames = new Map(students.map(student => [String(student._id), `${student.fName} ${student.lName}`.trim()]))
  const inbox = inboxWeeks.map(week => ({
    weekId: week._id,
    studentId: week.studentId,
    studentName: studentNames.get(String(week.studentId)) || 'Student',
    pieceName: week.pieceName || (week.pieces && week.pieces[0] && week.pieces[0].pieceName) || 'Lesson path',
    lessonFocus: week.lessonFocus || (week.pieces && week.pieces[0] && week.pieces[0].lessonFocus) || '',
    response: week.practiceResponse
  }))
  const recentResponses = studentIds.length ? await weeksCollection.find({
    studentId: {$in: studentIds},
    'practiceResponse.updatedAt': {$exists: true}
  }).project({studentId: 1, practiceResponse: 1}).sort({'practiceResponse.updatedAt': -1}).limit(300).toArray() : []
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const currentResponses = recentResponses.filter(week => new Date(week.practiceResponse.updatedAt) >= thirtyDaysAgo)
  const studentsWithRecentUpdates = new Set(currentResponses.map(week => String(week.studentId)))
  const breakdown = function(valueForWeek) {
    const totals = new Map()
    currentResponses.forEach(week => {
      const count = valueForWeek(week)
      if (count) totals.set(String(week.studentId), (totals.get(String(week.studentId)) || 0) + count)
    })
    return [...totals.entries()].map(([studentId, count]) => ({name: studentNames.get(studentId) || 'Student', count: count})).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }
  const insights = {
    updates: currentResponses.length,
    helpRequests: currentResponses.reduce((sum, week) => sum + (week.practiceResponse.items || []).filter(item => item.status === 'help').length, 0),
    secureTasks: currentResponses.reduce((sum, week) => sum + (week.practiceResponse.items || []).filter(item => item.status === 'secure').length, 0),
    questions: currentResponses.filter(week => String(week.practiceResponse.question || '').trim()).length,
    quietStudents: students.filter(student => !studentsWithRecentUpdates.has(String(student._id))).length,
    details: {
      updates: breakdown(() => 1),
      helpRequests: breakdown(week => (week.practiceResponse.items || []).filter(item => item.status === 'help').length),
      secureTasks: breakdown(week => (week.practiceResponse.items || []).filter(item => item.status === 'secure').length),
      questions: breakdown(week => String(week.practiceResponse.question || '').trim() ? 1 : 0),
      quietStudents: students.filter(student => !studentsWithRecentUpdates.has(String(student._id))).map(student => ({name: `${student.fName} ${student.lName}`.trim(), count: ''}))
    }
  }
  const reviewed = recentResponses.filter(week => week.practiceResponse.reviewedAt).slice(0, 50).map(week => ({
    weekId: week._id,
    studentId: week.studentId,
    studentName: studentNames.get(String(week.studentId)) || 'Student',
    response: week.practiceResponse
  }))
  const studioPosts = studentIds.length ? await studioPostsCollection.find({studentId: {$in: studentIds}, secret: secret, status: {$in: ['pending', 'published']}}).sort({createdAt: -1}).limit(60).toArray() : []
  studioPosts.forEach(post => { post.studentName = studentNames.get(String(post.studentId)) || 'Student' })
  const rewardRequests = studentIds.length ? await rewardRequestsCollection.find({studentId: {$in: studentIds}, secret: secret, status: 'pending'}).sort({createdAt: 1}).limit(50).toArray() : []
  rewardRequests.forEach(request => {
    request.studentName = studentNames.get(String(request.studentId)) || 'Student'
    const student = students.find(item => String(item._id) === String(request.studentId))
    request.currentPoints = student ? Number(student.leaderboardScore || 0) : 0
  })
  return {students: students, prizes: await User.getPrizeList(), inbox: inbox, insights: insights, reviewed: reviewed, studioPosts: studioPosts, rewardRequests: rewardRequests}
}

User.updateAdminStudentTrophies = async function(secret, studentId, data) {
  if (!String(studentId || '').match(/^[a-f\d]{24}$/i)) throw new Error('That student could not be found.')
  const cleanList = value => String(value || '').split(/\r?\n/).map(item => sanitizeHTML(item).trim()).filter(Boolean).slice(0, 60).map(item => item.slice(0, 180))
  const result = await usersCollection.updateOne({_id: new ObjectId(studentId), secret: secret, student: true}, {$set: {
    repertoirePolished: cleanList(data.repertoirePolished),
    missionsAccomplished: cleanList(data.missionsAccomplished)
  }})
  const matched = typeof result.matchedCount === 'number' ? result.matchedCount : result.result && result.result.n
  if (!matched) throw new Error('That student could not be found.')
  return 'The trophy cabinet was updated.'
}

User.submitStudioPost = async function(userId, data) {
  if (!String(userId || '').match(/^[a-f\d]{24}$/i)) throw new Error('Your account could not be found.')
  const student = await usersCollection.findOne({_id: new ObjectId(userId), student: true}, {projection: {secret: 1}})
  if (!student) throw new Error('Your account could not be found.')
  const kinds = {reflection: 'Musical reflection', progress: 'Work in progress', discovery: 'Musical discovery', concert: 'Concert review'}
  const kind = kinds[data.kind] ? data.kind : 'reflection'
  const message = sanitizeHTML(String(data.message || '')).trim().slice(0, 1200)
  const link = String(data.link || '').trim().slice(0, 500)
  if (!message) throw new Error('Add a short note for your Studio Post.')
  if (link && (!validator.isURL(link, {protocols: ['http', 'https'], require_protocol: true}) || !/^https?:\/\//i.test(link))) throw new Error('Use a complete http or https link.')
  await studioPostsCollection.insertOne({studentId: student._id, secret: student.secret, kind: kind, label: kinds[kind], message: message, link: link, status: 'pending', createdAt: new Date()})
  return 'Your private Studio Post draft is waiting for Hanford to review.'
}

function cleanStudioPostData(data) {
  const kinds = {reflection: 'Musical reflection', progress: 'Work in progress', discovery: 'Musical discovery', concert: 'Concert review'}
  const kind = kinds[data.kind] ? data.kind : 'reflection'
  const message = sanitizeHTML(String(data.message || '')).trim().slice(0, 1200)
  const link = String(data.link || '').trim().slice(0, 500)
  if (!message) throw new Error('Add a short note for the Studio Post.')
  if (link && (!validator.isURL(link, {protocols: ['http', 'https'], require_protocol: true}) || !/^https?:\/\//i.test(link))) throw new Error('Use a complete http or https link.')
  return {kind: kind, label: kinds[kind], message: message, link: link}
}

User.updateAdminStudioPost = async function(secret, postId, data) {
  if (!ObjectId.isValid(postId)) throw new Error('That Studio Post could not be found.')
  const clean = cleanStudioPostData(data)
  const result = await studioPostsCollection.updateOne(
    {_id: new ObjectId(postId), secret: secret, status: {$in: ['pending', 'published']}},
    {$set: {...clean, updatedAt: new Date()}}
  )
  if (!result.matchedCount) throw new Error('That Studio Post is no longer editable.')
  return 'Studio Post changes saved.'
}

User.removeAdminStudioPost = async function(secret, postId) {
  if (!ObjectId.isValid(postId)) throw new Error('That Studio Post could not be found.')
  const result = await studioPostsCollection.updateOne(
    {_id: new ObjectId(postId), secret: secret, status: {$in: ['pending', 'published']}},
    {$set: {status: 'removed', removedAt: new Date()}}
  )
  if (!result.modifiedCount) throw new Error('That Studio Post was already removed or handled elsewhere.')
  return 'The Studio Post was removed. Previously awarded and gifted points were left unchanged.'
}

User.getPublishedStudioPosts = async function(secret, viewerId) {
  if (!ObjectId.isValid(viewerId)) throw new Error('Your account could not be found.')
  const viewerObjectId = new ObjectId(viewerId)
  const [posts, viewer] = await Promise.all([
    studioPostsCollection.find({secret: secret, status: 'published'}).sort({publishedAt: -1, createdAt: -1}).limit(40).toArray(),
    usersCollection.findOne({_id: viewerObjectId, secret: secret, student: true}, {projection: {leaderboardScore: 1}})
  ])
  if (!viewer) throw new Error('Your account could not be found.')
  const authorIds = [...new Map(posts.map(post => [String(post.studentId), post.studentId])).values()]
  const authors = authorIds.length ? await usersCollection.find({_id: {$in: authorIds}, secret: secret, student: true}).project({_id: 1, fName: 1}).toArray() : []
  const authorNames = new Map(authors.map(author => [String(author._id), author.fName || 'A student']))
  posts.forEach(post => {
    post.posterName = authorNames.get(String(post.studentId)) || 'A student'
    post.isOwnPost = String(post.studentId) === String(viewerObjectId)
    post.donatedPoints = Math.max(0, Number(post.donatedPoints) || 0)
    post.media = studioPostMedia(post.link)
  })
  return {posts: posts, points: Math.max(0, Number(viewer.leaderboardScore) || 0)}
}

User.donateStudioPostPoints = async function(secret, senderId, postId, amountValue) {
  if (!ObjectId.isValid(senderId) || !ObjectId.isValid(postId)) throw new Error('That Studio Post could not be found.')
  const amount = Number(amountValue)
  if (![1, 3, 5].includes(amount)) throw new Error('Choose a 1, 3 or 5 point gift.')
  const senderObjectId = new ObjectId(senderId)
  const post = await studioPostsCollection.findOne({_id: new ObjectId(postId), secret: secret, status: 'published'}, {projection: {studentId: 1}})
  if (!post) throw new Error('That Studio Post is no longer available.')
  if (String(post.studentId) === String(senderObjectId)) throw new Error('Keep your points for applauding somebody else.')
  const recipient = await usersCollection.findOne({_id: post.studentId, secret: secret, student: true}, {projection: {_id: 1}})
  if (!recipient) throw new Error('The poster’s account is no longer available.')
  const deducted = await usersCollection.updateOne({_id: senderObjectId, secret: secret, student: true, leaderboardScore: {$gte: amount}}, {$inc: {leaderboardScore: -amount}})
  if (!deducted.modifiedCount) throw new Error('You do not have enough points for that gift.')
  const credited = await usersCollection.updateOne({_id: recipient._id, secret: secret, student: true}, {$inc: {leaderboardScore: amount}})
  if (!credited.modifiedCount) {
    await usersCollection.updateOne({_id: senderObjectId, secret: secret, student: true}, {$inc: {leaderboardScore: amount}})
    throw new Error('The gift could not be delivered, so your points were returned.')
  }
  await Promise.all([
    studioPostsCollection.updateOne({_id: post._id, secret: secret, status: 'published'}, {$inc: {donatedPoints: amount, donationCount: 1}}),
    studioPointDonationsCollection.insertOne({secret: secret, postId: post._id, fromStudentId: senderObjectId, toStudentId: recipient._id, amount: amount, createdAt: new Date()})
  ])
  return `${amount} point${amount === 1 ? '' : 's'} sent as a little applause.`
}

User.resolveStudioPost = async function(secret, postId, decision) {
  if (!ObjectId.isValid(postId)) throw new Error('That Studio Post could not be found.')
  if (!['approve', 'decline'].includes(decision)) throw new Error('Choose whether to publish or decline the post.')
  const post = await studioPostsCollection.findOne({_id: new ObjectId(postId), secret: secret, status: 'pending'})
  if (!post) throw new Error('That Studio Post has already been handled.')
  if (decision === 'decline') {
    const declined = await studioPostsCollection.updateOne({_id: post._id, secret: secret, status: 'pending'}, {$set: {status: 'declined', resolvedAt: new Date()}})
    if (!declined.modifiedCount) throw new Error('That Studio Post has already been handled.')
    return {message: 'The Studio Post draft was declined.'}
  }
  const pointsAwarded = post.kind === 'concert' ? 55 : 33
  const publishedAt = new Date()
  const published = await studioPostsCollection.updateOne({_id: post._id, secret: secret, status: 'pending'}, {$set: {status: 'published', publishedAt: publishedAt, resolvedAt: publishedAt, pointsAwarded: pointsAwarded}})
  if (!published.modifiedCount) throw new Error('That Studio Post has already been handled.')
  const student = await usersCollection.updateOne({_id: post.studentId, secret: secret, student: true}, {$inc: {leaderboardScore: pointsAwarded}})
  if (!student.modifiedCount) {
    await studioPostsCollection.updateOne({_id: post._id, status: 'published'}, {$set: {status: 'pending'}, $unset: {publishedAt: '', resolvedAt: '', pointsAwarded: ''}})
    throw new Error('The student account could not be credited, so the post remains pending.')
  }
  return {message: `The Studio Post is live and ${pointsAwarded} points were awarded.`}
}

function cleanTemplatePieces(value) {
  const pieces = Array.isArray(value) ? value : []
  return pieces.slice(0, 4).map(piece => ({
    pieceName: sanitizeHTML(String(piece.pieceName || '')).trim().slice(0, 120),
    lessonFocus: sanitizeHTML(String(piece.lessonFocus || '')).trim().slice(0, 600),
    quietKnot: sanitizeHTML(String(piece.quietKnot || '')).trim().slice(0, 600),
    practiceTasks: (Array.isArray(piece.practiceTasks) ? piece.practiceTasks : []).slice(0, 6).map(task => ({
      task: sanitizeHTML(String(task.task || '')).trim().slice(0, 500),
      start: sanitizeHTML(String(task.start || '')).trim().slice(0, 300),
      why: sanitizeHTML(String(task.why || '')).trim().slice(0, 500),
      success: sanitizeHTML(String(task.success || '')).trim().slice(0, 500)
    })).filter(task => task.task)
  })).filter(piece => piece.pieceName || piece.lessonFocus || piece.practiceTasks.length)
}

User.getPathTemplates = function(secret) {
  return pathTemplatesCollection.find({secret: secret}).sort({name: 1}).toArray()
}

User.getMaterialLibrary = async function(secret) {
  const students = await usersCollection.find({secret: secret, student: true}).project({_id: 1, fName: 1, lName: 1}).toArray()
  const names = new Map(students.map(student => [String(student._id), `${student.fName} ${student.lName}`.trim()]))
  const weeks = students.length ? await weeksCollection.find({studentId: {$in: students.map(student => student._id)}, 'attachments.0': {$exists: true}}).project({studentId: 1, pieceName: 1, attachments: 1, createdDate: 1}).sort({createdDate: -1}).limit(100).toArray() : []
  return weeks.flatMap(week => (week.attachments || []).map(material => ({weekId: week._id, materialId: material.id, name: material.name, mimeType: material.mimeType, studentName: names.get(String(week.studentId)) || 'Student', pieceName: week.pieceName || 'Lesson path', createdDate: week.createdDate}))).slice(0, 150)
}

User.getStudioOperations = async function(secret) {
  const students = await usersCollection.find({secret: secret, student: true}).project({_id: 1, fName: 1, lName: 1, parentName: 1, email: 1}).toArray()
  const studentIds = students.map(student => student._id)
  const names = new Map(students.map(student => [String(student._id), `${student.fName || ''} ${student.lName || ''}`.trim() || student.username || 'Student']))
  const contacts = new Map(students.map(student => [String(student._id), student.email || 'No family email recorded']))
  const weeks = studentIds.length ? await weeksCollection.find({studentId: {$in: studentIds}, $or: [{status: 'scheduled'}, {'emailDelivery.state': {$exists: true, $ne: 'not-requested'}}]}).project({studentId: 1, status: 1, scheduledFor: 1, createdDate: 1, publishedDate: 1, pieceName: 1, pieces: 1, emailSubject: 1, emailDelivery: 1, pointsAdd: 1}).sort({createdDate: -1}).limit(200).toArray() : []
  const label = week => (week.pieces || []).map(piece => piece.pieceName).filter(Boolean).join(', ') || week.pieceName || 'Lesson path'
  return {
    scheduled: weeks.filter(week => week.status === 'scheduled').sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor)).map(week => Object.assign(week, {studentName: names.get(String(week.studentId)), pathLabel: label(week)})),
    deliveries: weeks.filter(week => week.emailDelivery && week.emailDelivery.state !== 'not-requested').map(week => Object.assign(week, {studentName: names.get(String(week.studentId)), recipients: contacts.get(String(week.studentId)), pathLabel: label(week)}))
  }
}

User.reschedulePath = async function(secret, weekId, scheduledFor) {
  if (!ObjectId.isValid(weekId)) throw new Error('That scheduled path could not be found.')
  const date = new Date(scheduledFor)
  if (Number.isNaN(date.getTime()) || date <= new Date() || date > new Date(Date.now() + 366 * 86400000)) throw new Error('Choose a future time within the next year.')
  const student = await usersCollection.findOne({secret: secret, student: true, _id: (await weeksCollection.findOne({_id: new ObjectId(weekId)}, {projection: {studentId: 1}}) || {}).studentId}, {projection: {_id: 1}})
  if (!student) throw new Error('That scheduled path could not be found.')
  const result = await weeksCollection.updateOne({_id: new ObjectId(weekId), studentId: student._id, status: 'scheduled'}, {$set: {scheduledFor: date}})
  if (!result.modifiedCount) throw new Error('That path is no longer awaiting publication.')
  return date
}

User.publishScheduledPath = async function(secret, weekId) {
  if (!ObjectId.isValid(weekId)) throw new Error('That scheduled path could not be found.')
  const week = await weeksCollection.findOne({_id: new ObjectId(weekId), status: 'scheduled'})
  if (!week) throw new Error('That path is no longer awaiting publication.')
  const student = await usersCollection.findOne({_id: week.studentId, secret: secret, student: true})
  if (!student) throw new Error('That scheduled path could not be found.')
  const now = new Date()
  const published = await weeksCollection.updateOne({_id: week._id, status: 'scheduled'}, {$set: {status: 'published', publishedDate: now, createdDate: now}, $unset: {scheduledFor: ''}})
  if (!published.modifiedCount) throw new Error('That path was already handled elsewhere.')
  await usersCollection.updateOne({_id: student._id}, {$inc: {lessonCount: 1, leaderboardScore: Number(week.pointsAdd) || 0}})
  return {week, student}
}

User.getStudentProgressReport = async function(secret, studentId) {
  if (!ObjectId.isValid(studentId)) throw new Error('That student could not be found.')
  const student = await usersCollection.findOne({_id: new ObjectId(studentId), secret: secret, student: true}, {projection: {fName: 1, lName: 1, lessonCount: 1, paidLessons: 1, leaderboardScore: 1}})
  if (!student) throw new Error('That student could not be found.')
  const weeks = await weeksCollection.find({studentId: student._id, status: 'published'}).sort({createdDate: -1}).project({adminId: 0, studentId: 0, emailDelivery: 0}).toArray()
  return {student: student, weeks: weeks, generatedAt: new Date()}
}

User.savePathTemplate = async function(secret, data) {
  const name = sanitizeHTML(String(data.name || '')).trim().slice(0, 80)
  const pieces = cleanTemplatePieces(data.pieces)
  if (!name) throw new Error('Give this template a name.')
  if (!pieces.length) throw new Error('Add at least one piece or task before saving a template.')
  const existing = await pathTemplatesCollection.findOne({secret: secret, name: name})
  if (existing) {
    await pathTemplatesCollection.updateOne({_id: existing._id}, {$set: {pieces: pieces, updatedAt: new Date()}})
    return existing._id
  }
  const result = await pathTemplatesCollection.insertOne({secret: secret, name: name, pieces: pieces, createdAt: new Date(), updatedAt: new Date()})
  return result.insertedId
}

User.deletePathTemplate = async function(secret, templateId) {
  if (!ObjectId.isValid(templateId)) throw new Error('That template could not be found.')
  const result = await pathTemplatesCollection.deleteOne({_id: new ObjectId(templateId), secret: secret})
  if (!result.deletedCount) throw new Error('That template could not be found.')
}

User.saveTaskResponses = async function(userId, weekId, responseValues, labels, question) {
  if (!ObjectId.isValid(weekId)) throw new Error('That lesson path could not be found.')
  const latest = await weeksCollection.find({studentId: new ObjectId(userId), status: 'published'}).sort({createdDate: -1}).limit(1).project({_id: 1, pieces: 1, practiceTasks: 1}).toArray()
  if (!latest.length || String(latest[0]._id) !== String(weekId)) throw new Error('Only the current path can receive a practice update.')
  const allowed = new Set(['started', 'changed', 'secure', 'help'])
  const values = [].concat(responseValues || [])
  const cleanLabels = [].concat(labels || [])
  const serverLabels = Array.isArray(latest[0].pieces) && latest[0].pieces.length
    ? latest[0].pieces.flatMap(piece => (piece.practiceTasks || []).map(task => task.task))
    : (latest[0].practiceTasks || []).map(task => task.task)
  const items = values.map((value, index) => {
    const parts = String(value).split(':')
    const taskIndex = Number(parts[0])
    const status = parts[1]
    if (!Number.isInteger(taskIndex) || taskIndex < 0 || taskIndex > 30 || !allowed.has(status)) return null
    return {taskIndex: taskIndex, status: status, label: sanitizeHTML(String(serverLabels[taskIndex] || cleanLabels[index] || '')).trim().slice(0, 500)}
  }).filter(Boolean)
  if (!items.length) throw new Error('Choose a response for at least one task.')
  const cleanQuestion = sanitizeHTML(String(question || ''), {allowedTags: [], allowedAttributes: []}).trim().slice(0, 1000)
  await weeksCollection.updateOne({_id: latest[0]._id}, {
    $set: {'practiceResponse.items': items, 'practiceResponse.question': cleanQuestion, 'practiceResponse.teacherFlags': [], 'practiceResponse.updatedAt': new Date()},
    $unset: {'practiceResponse.reviewedAt': ''}
  })
  const award = await weeksCollection.updateOne({_id: latest[0]._id, 'practiceResponse.pointsAwarded': {$ne: true}}, {$set: {'practiceResponse.pointsAwarded': true, 'practiceResponse.pointsAwardedAt': new Date()}})
  const awardedPoints = Boolean(typeof award.modifiedCount === 'number' ? award.modifiedCount : award.result && award.result.nModified)
  if (awardedPoints) await usersCollection.updateOne({_id: new ObjectId(userId)}, {$inc: {leaderboardScore: 5}})
  return {items: items, awardedPoints: awardedPoints}
}

User.savePracticeResponseFlags = async function(secret, weekId, flagValues) {
  if (!ObjectId.isValid(weekId)) throw new Error('That practice update could not be found.')
  const week = await weeksCollection.findOne({_id: new ObjectId(weekId)}, {projection: {studentId: 1, practiceResponse: 1}})
  if (!week || !await usersCollection.findOne({_id: week.studentId, secret: secret, student: true}, {projection: {_id: 1}})) throw new Error('That practice update could not be found.')
  const allowed = new Set(['revisit', 'listen', 'celebrate', 'explain'])
  const responseIndexes = new Set(((week.practiceResponse && week.practiceResponse.items) || []).map(item => item.taskIndex))
  const teacherFlags = [].concat(flagValues || []).map(value => {
    const parts = String(value).split(':')
    const taskIndex = Number(parts[0])
    const flag = parts[1]
    return Number.isInteger(taskIndex) && responseIndexes.has(taskIndex) && allowed.has(flag) ? {taskIndex: taskIndex, flag: flag} : null
  }).filter(Boolean)
  await weeksCollection.updateOne({_id: week._id}, {$set: {'practiceResponse.teacherFlags': teacherFlags}})
  return teacherFlags
}

User.markPracticeResponseReviewed = async function(secret, weekId) {
  if (!ObjectId.isValid(weekId)) throw new Error('That practice update could not be found.')
  const week = await weeksCollection.findOne({_id: new ObjectId(weekId)}, {projection: {studentId: 1}})
  if (!week || !await usersCollection.findOne({_id: week.studentId, secret: secret, student: true}, {projection: {_id: 1}})) throw new Error('That practice update could not be found.')
  await weeksCollection.updateOne({_id: week._id}, {$set: {'practiceResponse.reviewedAt': new Date()}})
}

User.reopenPracticeResponse = async function(secret, weekId) {
  if (!ObjectId.isValid(weekId)) throw new Error('That reviewed update could not be found.')
  const week = await weeksCollection.findOne({_id: new ObjectId(weekId)}, {projection: {studentId: 1, practiceResponse: 1}})
  if (!week || !week.practiceResponse || !week.practiceResponse.reviewedAt || !await usersCollection.findOne({_id: week.studentId, secret: secret, student: true}, {projection: {_id: 1}})) throw new Error('That reviewed update could not be found.')
  await weeksCollection.updateOne({_id: week._id}, {$unset: {'practiceResponse.reviewedAt': ''}})
}

User.getAdminStudentView = async function(secret, studentId) {
  if (typeof studentId != 'string' || !studentId.match(/^[a-f\d]{24}$/i)) throw new Error('That student could not be found.')
  const students = await usersCollection.find({secret: secret, student: true}).project({
    fName: 1,
    lName: 1,
    username: 1,
    lessonCount: 1,
    paidLessons: 1,
    leaderboardScore: 1,
    missionsAccomplished: 1,
    repertoirePolished: 1,
    practiceConversations: 1
  }).sort({fName: 1, lName: 1}).toArray()
  const index = students.findIndex(student => String(student._id) === studentId)
  if (index < 0) throw new Error('That student is not attached to this studio account.')
  const weeks = await weeksCollection.find({studentId: students[index]._id, status: 'published'}).sort({createdDate: -1}).limit(8).toArray()
  return {student: students[index], students: students, index: index, weeks: weeks}
}

User.updateAdminStudentField = async function(secret, studentId, field, rawValue) {
  if (typeof studentId != 'string' || !studentId.match(/^[a-f\d]{24}$/i)) throw new Error('That student could not be found.')
  const limits = {lessonCount: 999, paidLessons: 999, leaderboardScore: 999999}
  const textLimits = {fName: 30, lName: 30, parentName: 60, email: 500, username: 30}
  let value
  if (Object.prototype.hasOwnProperty.call(limits, field)) {
    value = Number(rawValue)
    if (!Number.isInteger(value) || value < 0 || value > limits[field]) {
      throw new Error(field === 'leaderboardScore' ? 'Points must be between 0 and 999,999.' : 'Lesson counts must be between 0 and 999.')
    }
  } else if (Object.prototype.hasOwnProperty.call(textLimits, field)) {
    value = sanitizeHTML(String(rawValue || ''), {allowedTags: [], allowedAttributes: []}).trim()
    if ((field === 'fName' || field === 'lName') && !value) throw new Error('Student names cannot be empty.')
    if (value.length > textLimits[field]) throw new Error('That value is too long.')
    if (field === 'email') value = normaliseRecipientEmails(value)
    if (field === 'username') {
      if (!validator.isAlphanumeric(value) || value.length < 3) throw new Error('Username must contain 3 to 30 letters and numbers.')
      const existing = await usersCollection.findOne({username: value, _id: {$ne: new ObjectId(studentId)}}, {projection: {_id: 1}})
      if (existing) throw new Error('That username is already in use.')
    }
  } else {
    throw new Error('That field cannot be edited here.')
  }
  const result = await usersCollection.updateOne({_id: new ObjectId(studentId), secret: secret, student: true}, {$set: {[field]: value}})
  const matched = typeof result.matchedCount == 'number' ? result.matchedCount : result.result && result.result.n
  if (!matched) throw new Error('That student is not attached to this studio account.')
  return value
}

User.createAdminStudent = async function(secret, data) {
  const clean = {
    fName: sanitizeHTML(String(data.fName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
    lName: sanitizeHTML(String(data.lName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
    parentName: sanitizeHTML(String(data.parentName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
    email: normaliseRecipientEmails(data.email),
    username: String(data.username || '').trim(),
    password: String(data.password || '')
  }
  if (!clean.fName || !clean.lName) throw new Error('Enter the student’s first name and surname.')
  if (clean.fName.length > 30 || clean.lName.length > 30 || clean.parentName.length > 60) throw new Error('One of the names is too long.')
  if (!validator.isAlphanumeric(clean.username) || clean.username.length < 3 || clean.username.length > 30) throw new Error('Username must contain 3 to 30 letters and numbers.')
  if (clean.password.length < 8 || clean.password.length > 72) throw new Error('Password must contain 8 to 72 characters.')
  if (clean.password !== String(data.passwordConfirm || '')) throw new Error('The password confirmation does not match.')
  if (await usersCollection.findOne({username: clean.username})) throw new Error('That username is already in use.')
  const student = {
    fName: clean.fName, lName: clean.lName, parentName: clean.parentName, email: clean.email,
    mobile: '', username: clean.username, password: bcrypt.hashSync(clean.password, 12), secret: secret,
    admin: false, student: true, leaderboardScore: 0, missionsAccomplished: [], repertoirePolished: [],
    leaderboardColor: '#ffff00', lastSubmittedDate: new Date(), savedGameScore: 0, BPMStatus: '',
    lastBPMGuess: new Date(), lessonCount: 0, paidLessons: 0, practiceConversations: [], grade: '',
    lessonVideoURL: '', studentBio: '', playlistLink: ''
  }
  await usersCollection.insertOne(student)
  return `${clean.fName} ${clean.lName} was added to Student Pulse.`
}

User.updateAdminStudentPassword = async function(secret, studentId, password, passwordConfirm) {
  if (typeof studentId != 'string' || !studentId.match(/^[a-f\d]{24}$/i)) throw new Error('That student could not be found.')
  password = String(password || '')
  if (password.length < 8 || password.length > 72) throw new Error('Password must contain 8 to 72 characters.')
  if (password !== String(passwordConfirm || '')) throw new Error('The password confirmation does not match.')
  const result = await usersCollection.updateOne(
    {_id: new ObjectId(studentId), secret: secret, student: true},
    {$set: {password: bcrypt.hashSync(password, 12)}}
  )
  const matched = typeof result.matchedCount == 'number' ? result.matchedCount : result.result && result.result.n
  if (!matched) throw new Error('That student is not attached to this studio account.')
  return 'The student password was updated.'
}

User.getStudentWeekArchive = async function(secret, studentId) {
  if (typeof studentId != 'string' || !studentId.match(/^[a-f\d]{24}$/i)) return []
  const student = await usersCollection.findOne({_id: new ObjectId(studentId), secret: secret, student: true}, {projection: {_id: 1}})
  if (!student) return []
  return weeksCollection.find({studentId: new ObjectId(studentId)})
    .sort({createdDate: -1})
    .project({adminId: 0})
    .toArray()
}

User.findWeekAndUpdate = function(secret, editData) {
  return new Promise(async(resolve, reject) => {
    try {
      let pieces = []
      try {
        pieces = JSON.parse(editData.pieces || '[]').slice(0, 4).map(piece => ({
          pieceName: sanitizeHTML(String(piece.pieceName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          lessonFocus: sanitizeHTML(String(piece.lessonFocus || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          quietKnot: sanitizeHTML(String(piece.quietKnot || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          practiceTasks: (piece.practiceTasks || []).slice(0, 6).map(task => ({
            task: sanitizeHTML(String(task.task || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            start: sanitizeHTML(String(task.start || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            why: sanitizeHTML(String(task.why || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            success: sanitizeHTML(String(task.success || ''), {allowedTags: [], allowedAttributes: []}).trim()
          })).filter(task => task.task)
        })).filter(piece => piece.pieceName || piece.lessonFocus || piece.quietKnot || piece.practiceTasks.length)
      } catch (err) {}
      const firstPiece = pieces[0]
      const existing = await weeksCollection.findOne({_id: new ObjectId(editData.week_id)})
      if (!existing) throw new Error('Missing path')
      const student = await usersCollection.findOne({_id: existing.studentId, secret: secret, student: true}, {projection: {_id: 1}})
      if (!student) throw new Error('Wrong studio')
      const wasUnpublished = existing.status !== 'published'
      const requestedPublish = editData.submissionAction === 'publish'
      const nextStatus = requestedPublish ? 'published' : existing.status
      const completeSnapshot = ['rhythm', 'coordination', 'tone', 'dynamics', 'stylistic'].every(field => editData[field])
      const completePieces = pieces.length && pieces.every(piece => piece.pieceName && piece.practiceTasks.length)
      if (requestedPublish && (!completePieces || !completeSnapshot)) throw new Error('Complete every piece and the development snapshot before publishing.')
      await weeksCollection.updateOne({ _id: existing._id}, {
        $set: {
          pieceName: firstPiece ? firstPiece.pieceName : sanitizeHTML(String(editData.pieceName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          rhythm: editData.rhythm,
          coordination: editData.coordination,
          tone: editData.tone,
          dynamics: editData.dynamics,
          stylistic: editData.stylistic,
          ...(Object.prototype.hasOwnProperty.call(editData, 'techAName') ? {
            techAName: sanitizeHTML(String(editData.techAName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            techAScore: editData.techAScore,
            techBName: sanitizeHTML(String(editData.techBName || ''), {allowedTags: [], allowedAttributes: []}).trim(),
            techBScore: editData.techBScore
          } : {}),
          comments: sanitizeHTML(String(editData.comments || ''), {allowedTags: [], allowedAttributes: []}),
          lessonFocus: firstPiece ? firstPiece.lessonFocus : sanitizeHTML(String(editData.lessonFocus || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          quietKnot: firstPiece ? firstPiece.quietKnot : sanitizeHTML(String(editData.quietKnot || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          practiceTasks: firstPiece ? firstPiece.practiceTasks : (() => {
            try { return JSON.parse(editData.practiceTasks || '[]').slice(0, 6).map(task => ({
              task: sanitizeHTML(String(task.task || ''), {allowedTags: [], allowedAttributes: []}).trim(),
              start: sanitizeHTML(String(task.start || ''), {allowedTags: [], allowedAttributes: []}).trim(),
              why: sanitizeHTML(String(task.why || ''), {allowedTags: [], allowedAttributes: []}).trim(),
              success: sanitizeHTML(String(task.success || ''), {allowedTags: [], allowedAttributes: []}).trim()
            })).filter(task => task.task) } catch (err) { return [] }
          })(),
          ...(pieces.length ? {pieces: pieces} : {}),
          generalNote: sanitizeHTML(String(editData.generalNote || ''), {allowedTags: [], allowedAttributes: []}).trim(),
          status: nextStatus,
          ...(wasUnpublished && requestedPublish ? {publishedDate: new Date(), createdDate: new Date()} : {})
        }
      })
      resolve({message: wasUnpublished && requestedPublish ? 'Path published successfully.' : 'Path changes saved.', publishedNow: wasUnpublished && requestedPublish, studentId: existing.studentId, pointsAdd: Number(existing.pointsAdd) || 0})
    } catch (err) {
      reject(err.message === 'Complete every piece and the development snapshot before publishing.' ? err.message : 'Could not update.')
    }
  })
}

User.getStudentWeeks = async function(userId) {
    return new Promise(async(resolve, reject) => {
        // create studentWeeks object
        let studentWeeks = await weeksCollection.find({"studentId": new ObjectId(userId), status: 'published'}).sort({createdDate: -1}).toArray()
        studentWeeks.reverse() // Array method reverses in place
        // create graphData object
        let dateLabels = []
        let rhythmArray = []
        let coordinationArray = []
        let toneArray = []
        let dynamicsArray = []
        let stylisticArray = []
        studentWeeks.forEach(function(studentWeek) {
            let date = studentWeek.createdDate.getDate()
            let month = studentWeek.createdDate.getMonth()+1
            let fulldate = date.toString() + '/' + month.toString()
            dateLabels.push(fulldate)
            rhythmArray.push(Number(studentWeek.rhythm))
            coordinationArray.push(Number(studentWeek.coordination))
            toneArray.push(Number(studentWeek.tone))
            dynamicsArray.push(Number(studentWeek.dynamics))
            stylisticArray.push(Number(studentWeek.stylistic))
        })

        let graphData = {
            dateLabels: dateLabels,
            componentsArray: {
                rhythmArray, 
                coordinationArray, 
                toneArray, 
                dynamicsArray, 
                stylisticArray}
        }
        let data = {studentWeeks, graphData}
        resolve(data)
    }).catch(function(err) {reject(err)})
}

User.getAdminWeekForEmail = async function(secret, weekId) {
  if (typeof weekId != 'string' || !weekId.match(/^[a-f\d]{24}$/i)) throw new Error('That path could not be found.')
  const week = await weeksCollection.findOne({_id: new ObjectId(weekId), status: 'published'})
  if (!week) throw new Error('Only published paths can be emailed.')
  const student = await usersCollection.findOne({_id: week.studentId, secret: secret, student: true})
  if (!student) throw new Error('That path is not attached to this studio account.')
  if (!student.email) throw new Error('This student has no family email on file.')
  const attemptedAt = week.emailDelivery && week.emailDelivery.attemptedAt
  if (attemptedAt && Date.now() - new Date(attemptedAt).getTime() < 120000) throw new Error('Please wait two minutes before sending this path again.')
  return {week: week, student: student}
}

User.recordWeekEmailDelivery = function(weekId, state, extra) {
  return weeksCollection.updateOne({_id: new ObjectId(weekId)}, {$set: {emailDelivery: Object.assign({state: state, attemptedAt: new Date()}, extra || {})}})
}

User.getPrintableStudentWeek = async function(userId, weekId) {
    if (typeof weekId != 'string' || !weekId.match(/^[a-f\d]{24}$/i)) return null
    return weeksCollection.findOne({_id: new ObjectId(weekId), studentId: new ObjectId(userId), status: 'published'})
}

User.getTutorials = async function() {
    return new Promise(async(resolve, reject) => {
        // create tutorials object
        let tutorials = await tutorialsCollection.find().sort({dateCreated: -1}).toArray()
        resolve(tutorials)
    }).catch(function(err) {reject(err)})
}

User.getMissionsAccomplished = async (userId) => {
    return new Promise (async(resolve, reject) => {
        let userDoc = await usersCollection.findOne({"_id": new ObjectId(userId)})
        resolve(userDoc.missionsAccomplished)
    })
}

User.getRepertoirePolished = async (userId) => {
  return new Promise (async(resolve, reject) => {
      let userDoc = await usersCollection.findOne({"_id": new ObjectId(userId)})
      resolve(userDoc.repertoirePolished)
  })
}

User.getMissionCode = async function() {
    return new Promise(async(resolve, reject) => {
        let missionCode = ""
        let missionDoc = await missionsCollection.findOne({name: "quiz1"})
        if (!missionDoc) {
            resolve (false)
            // 5 QUESTION QUIZZES
        } else if (missionDoc.type == 'theCristoforiConnection') {
            missionCode = '<div class="alert alert-success text-center">There is a Game mission - put your thinking cap on and go for it!<br>What is the Cristofori Connection...?</div>' +
            '<iframe class="rounded" src="..\\..\\files\\TheCristoforiConnection\\index.html" frameborder="0" height="650px" width="100%"></iframe>'
            resolve (missionCode)
        } else if (missionDoc.type == 'legatoSmooth') {
          missionCode = `<div class="alert alert-success text-center pt-4 mb-3"><p>Music: <strong><em>Jupiter</em></strong> by Gustav Holst. Enjoy!</p><p style="text-decoration: underline overline double;">LEGATO SMOOTH HALL OF FAME</p><p>*** <strong>SWEETCUTIEPIE</strong> ***<br>*** <strong>DANIEL2006</strong> ***</p></div>
                        <iframe class="rounded" src="..\\..\\files\\LegatoSmooth\\index.html" frameborder="0" height="800px" width="100%"></iframe>`
          resolve (missionCode)
      }
    })
}

module.exports = User
