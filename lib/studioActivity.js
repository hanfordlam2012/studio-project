const collection = () => require('../db').db('studio-project').collection('studioActivity')

async function record(sessionUser, action, detail) {
  if (!sessionUser || !sessionUser.admin) return
  try {
    await collection().insertOne({
      secret: sessionUser.secret,
      actorId: sessionUser.userId,
      action: String(action || '').slice(0, 80),
      detail: String(detail || '').slice(0, 300),
      createdAt: new Date()
    })
  } catch (error) {
    console.log('Studio activity log warning:', error.message)
  }
}

async function recent(secret, limit) {
  return collection().find({secret: secret}).project({secret: 0}).sort({createdAt: -1}).limit(Math.min(Number(limit) || 60, 200)).toArray()
}

module.exports = {record, recent}
