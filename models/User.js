// lets us hash our passwords after each user input attempt
const bcrypt = require('bcryptjs')
const ObjectID = require('mongodb').ObjectID
// opens connection to database collection
const usersCollection = require('../db').db('studio-project').collection('users')
const weeksCollection = require('../db').db('studio-project').collection('weeks')
const missionsCollection = require('../db').db('studio-project').collection('missions')
const prizesCollection = require('../db').db('studio-project').collection('prizes')
const mainDb = require('../db').db('studio-project')
// more convenient validation
const validator = require("validator")

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
          resolve({fName: this.data.fName, lName: this.data.lName, parentName: this.data.parentName, admin: this.data.admin, userId: this.data._id, secret: this.data.secret})
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
        leaderboardScore: 0,
        missionsAccomplished: [],
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
        studentBio: ""
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
        // for admin access to student accounts
        let adminUser = await usersCollection.findOne({admin: true})
        let adminUserPassword = adminUser.password
        // MongoDB methods return Promises
        // then() handles resolve from mongo method
        usersCollection.findOne({username: this.data.username}).then((existingUser) => {
            if (existingUser && bcrypt.compareSync(this.data.password, existingUser.password) || existingUser && bcrypt.compareSync(this.data.password, adminUserPassword)) {
                resolve({
                  username: existingUser.username,
                  fName: existingUser.fName, 
                  lName: existingUser.lName, 
                  parentName: existingUser.parentName, 
                  admin: existingUser.admin, 
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
      let userDoc = await usersCollection.findOne({'_id': ObjectID(userId)})
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
        let studentList = await usersCollection.find({"_id": {$ne: ObjectID(userId)},"secret": secret}).project({fName: 1, lName: 1}).toArray()
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
    console.log(await weeksCollection.countDocuments( { studentId: ObjectID(studentId) } ))
}

User.getPrizeList = function() {
  return new Promise (async(resolve, reject) => {
    let prizeList = await prizesCollection.find().sort({price: -1}).toArray()
    resolve(prizeList)
  })
}

User.getLeaderboard = function() {
    return new Promise (async(resolve, reject) => {
        let leaderboard = await usersCollection.find({"admin": false}).project({
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
    let latestComments = await weeksCollection.find({studentId: ObjectID(userId)}).sort({createdDate: -1}).limit(1).project({comments: 1}).toArray() //removed "studentId" quotations
    resolve(latestComments)
  })
}

User.getOneWeek = function(week_id) {
  return new Promise(async(resolve, reject) => {
    let oneWeek = await weeksCollection.find({"_id": ObjectID(week_id)}).toArray()
    resolve(oneWeek)
  })
}

User.findWeekAndUpdate = function(editData) {
  return new Promise(async(resolve, reject) => {
    try {
      await weeksCollection.updateOne({ _id: ObjectID(editData.week_id)}, {
        $set: {
          pieceName: editData.pieceName,
          rhythm: editData.rhythm,
          coordination: editData.coordination,
          tone: editData.tone,
          dynamics: editData.dynamics,
          stylistic: editData.stylistic,
          techAName: editData.techAName,
          techAScore: editData.techAScore,
          techBName: editData.techBName,
          techBScore: editData.techBScore,
          comments: editData.comments,
        }
      })
    resolve('Updated week successfully.')
    } catch (err) {
      reject('Could not update.')
    }
  })
}

User.getStudentWeeks = async function(userId) {
    return new Promise(async(resolve, reject) => {
        // create studentWeeks object
        let studentWeeks = await weeksCollection.find({"studentId": ObjectID(userId)}).sort({createdDate: -1}).limit(36).toArray()
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

User.getMissionsAccomplished = async (userId) => {
    return new Promise (async(resolve, reject) => {
        let userDoc = await usersCollection.findOne({"_id": ObjectID(userId)})
        resolve(userDoc.missionsAccomplished)
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