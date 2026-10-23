const secondOpinion = require('../lib/secondOpinion')

exports.show = function(req, res) {
  res.render('secondOpinion', {
    messages: req.flash('secondOpinionStatus'),
    errors: req.flash('secondOpinionError')
  })
}

exports.submit = async function(req, res) {
  try {
    const order = await secondOpinion.create(req.body, req.files)
    req.flash('secondOpinionStatus', `Your recording has arrived. Your reference is ${order.reference}.`)
  } catch (error) {
    req.flash('secondOpinionError', error.message || 'The submission could not be completed.')
  }
  req.session.save(() => res.redirect('/piano-second-opinion#submit'))
}

exports.saveReview = async function(req, res) {
  try {
    req.flash('adminSuccess', await secondOpinion.saveReview(req.body.orderId, req.body))
  } catch (error) {
    req.flash('adErrors', error.message || 'The Piano Second Opinion could not be updated.')
  }
  req.session.save(() => res.redirect('/admin#secondOpinions'))
}

exports.resendCompleted = async function(req, res) {
  try {
    req.flash('adminSuccess', await secondOpinion.resendCompleted(req.body.orderId))
  } catch (error) {
    req.flash('adErrors', error.message || 'The completed review could not be resent.')
  }
  req.session.save(() => res.redirect('/admin#secondOpinions'))
}

exports.download = async function(req, res, next) {
  try {
    const result = await secondOpinion.findFile(req.params.orderId, req.params.kind)
    if (!result) return res.status(404).render('404')
    res.download(result.path, result.file.name)
  } catch (error) {
    next(error)
  }
}

exports.preview = function(req, res) {
  const {renderSafeMarkdown} = require('../lib/safeContent')
  res.json({
    nextTasks: renderSafeMarkdown(String(req.body.nextTasks || '').slice(0, 5000)),
    generalComments: renderSafeMarkdown(String(req.body.generalComments || '').slice(0, 5000))
  })
}
