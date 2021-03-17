const scoresbyCollection = require('../db').db('studio-project').collection('scoresby')

exports.getDataAndShowScoresbyPage = async function(req, res) {
      // create contributorArray object
      let contributorArray = await scoresbyCollection.find().sort({date: -1}).toArray()
      let totalPoints = 0
      contributorArray.forEach(function(contributor) {
        totalPoints = totalPoints += Number(contributor.points)
      })
      res.render('scoresby', {contributorArray: contributorArray, totalPoints: totalPoints})
}

exports.logContributorAndRefresh = async function(req, res) {
  let contributor = req.body.name
  let contributorPoints = req.body.points
  let contributorDate = new Date()

  if (parseInt(contributorPoints)) {
    // insert doc into mongo
    scoresbyCollection.insertOne({
      name: contributor,
      points: contributorPoints,
      date: contributorDate
    }).then(() => {
      res.redirect('/scoresby')
    }).catch((err) => {
      // if server problem
      console.log(err)
    })
  } else {
    contributorPoints = 0
    // insert doc into mongo
    scoresbyCollection.insertOne({
      name: contributor,
      points: contributorPoints,
      date: contributorDate
    }).then(() => {
      res.redirect('/scoresby')
    }).catch((err) => {
      // if server problem
      console.log(err)
    })
  }
}

deleteDoc = function () {
  scoresbyCollection.deleteOne( { name: "GORDON" } )
}

deleteDoc()