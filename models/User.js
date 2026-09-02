// lets us hash our passwords after each user input attempt
const bcrypt = require('bcryptjs')
const ObjectId = require('mongodb').ObjectId
// opens connection to database collection
const usersCollection = require('../db').db('studio-project').collection('users')
const weeksCollection = require('../db').db('studio-project').collection('weeks')
const missionsCollection = require('../db').db('studio-project').collection('missions')
const prizesCollection = require('../db').db('studio-project').collection('prizes')
const tutorialsCollection = require('../db').db('studio-project').collection('tutorials')
const mainDb = require('../db').db('studio-project')
// more convenient validation
const validator = require("validator")
const sanitizeHTML = require('../lib/safeContent').plainText

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
          lessonCount: 1
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
  return new Promise (async(resolve, reject) => {
    let latestComments = await weeksCollection.find({studentId: new ObjectId(userId), status: {$ne: 'draft'}}).sort({createdDate: -1}).limit(1).project({comments: 1}).toArray() //removed "studentId" quotations
    resolve(latestComments)
  })
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
    BPMStatus: 1
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
  if (!Number.isInteger(price) || price < 1 || price > 999999) throw new Error('Reward cost must be between 1 and 999,999 points.')
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
    leaderboardScore: 1
  }).sort({fName: 1, lName: 1}).toArray()
  const studentIds = students.map(student => student._id)
  const pathCounts = studentIds.length ? await weeksCollection.aggregate([
    {$match: {studentId: {$in: studentIds}, status: {$ne: 'draft'}}},
    {$group: {_id: '$studentId', count: {$sum: 1}, latest: {$max: '$createdDate'}}}
  ]).toArray() : []
  const countsByStudent = new Map(pathCounts.map(item => [String(item._id), item]))
  students.forEach(student => {
    const paths = countsByStudent.get(String(student._id))
    student.pathCount = paths ? paths.count : 0
    student.latestPathDate = paths ? paths.latest : null
  })
  return {students: students, prizes: await User.getPrizeList()}
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
  const weeks = await weeksCollection.find({studentId: students[index]._id, status: {$ne: 'draft'}}).sort({createdDate: -1}).limit(8).toArray()
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
      const wasDraft = existing.status === 'draft'
      const requestedPublish = editData.submissionAction === 'publish'
      const nextStatus = requestedPublish ? 'published' : (wasDraft ? 'draft' : 'published')
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
          ...(wasDraft && requestedPublish ? {publishedDate: new Date()} : {})
        }
      })
      resolve({message: wasDraft && requestedPublish ? 'Draft published successfully.' : 'Path changes saved.', publishedNow: wasDraft && requestedPublish, studentId: existing.studentId, pointsAdd: Number(existing.pointsAdd) || 0})
    } catch (err) {
      reject(err.message === 'Complete every piece and the development snapshot before publishing.' ? err.message : 'Could not update.')
    }
  })
}

User.getStudentWeeks = async function(userId) {
    return new Promise(async(resolve, reject) => {
        // create studentWeeks object
        let studentWeeks = await weeksCollection.find({"studentId": new ObjectId(userId), status: {$ne: 'draft'}}).sort({createdDate: -1}).toArray()
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
  const week = await weeksCollection.findOne({_id: new ObjectId(weekId), status: {$ne: 'draft'}})
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
    return weeksCollection.findOne({_id: new ObjectId(weekId), studentId: new ObjectId(userId), status: {$ne: 'draft'}})
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
