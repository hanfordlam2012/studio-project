const performancesCollection = require('../db').db('studio-project').collection('performances')
const ObjectID = require('mongodb').ObjectID

let Performance = function() {
  this.errors = []
}

Performance.getPerformances = function() {
  return new Promise(async(resolve, reject) => {
    let performances = await performancesCollection.find({}).toArray() //remember toArray()
    resolve(performances)
  })
}

Performance.addPerformanceComment = function(performanceId, studentName, comment) {
  return new Promise(async(resolve, reject) => {
    let performance = await performancesCollection.findOne({"_id": ObjectID(performanceId)})
    let newComment = []
    newComment.push(studentName, comment)
    performance.comments.push(newComment)
    await performancesCollection.updateOne({"_id": ObjectID(performanceId)}, { $set: {"comments": performance.comments} })
    resolve()
  })
}

module.exports = Performance