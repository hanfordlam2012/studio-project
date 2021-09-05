const Performance = require('../models/Performance')

exports.showShowcasePage = function(req, res) {
  Performance.getPerformances().then((performances) => {
    res.render('showcase', {
      performances: performances,
      fName: req.session.user.fName
    })
  })
}

exports.addPerformanceComment = function(req, res) {
  console.log(req.body)
  Performance.addPerformanceComment(req.body.performanceId, req.body.studentName, req.body.comment).then(() => {
    res.redirect('/showcase')
  })
}