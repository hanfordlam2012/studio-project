const crypto = require('crypto')
const multer = require('multer')

const MAGIC = Buffer.from('STUDIOBK1')
const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 25 * 1024 * 1024, files: 1}}).single('backupFile')

async function create(secret, passphrase) {
  if (String(passphrase || '').length < 12) throw new Error('Use a backup passphrase of at least 12 characters.')
  const db = require('../db').db('studio-project')
  const students = await db.collection('users').find({secret: secret}).toArray()
  const studentIds = students.map(student => student._id)
  const [weeks, templates, activities, prizes, studioPosts] = await Promise.all([
    db.collection('weeks').find({studentId: {$in: studentIds}}).toArray(),
    db.collection('pathTemplates').find({secret: secret}).toArray(),
    db.collection('studioActivity').find({secret: secret}).toArray(),
    db.collection('prizes').find({}).toArray(),
    db.collection('studioPosts').find({secret: secret}).toArray()
  ])
  return encryptPayload({format: 'music-learning-studio-backup', version: 1, createdAt: new Date(), collections: {users: students, weeks, pathTemplates: templates, studioActivity: activities, prizes, studioPosts}}, passphrase)
}

function encryptPayload(data, passphrase) {
  if (String(passphrase || '').length < 12) throw new Error('Use a backup passphrase of at least 12 characters.')
  const payload = Buffer.from(JSON.stringify(data))
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.scryptSync(String(passphrase), salt, 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()])
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), encrypted])
}

function inspect(buffer, passphrase) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 70 || !buffer.slice(0, MAGIC.length).equals(MAGIC)) throw new Error('This is not a Studio Backup file.')
  if (String(passphrase || '').length < 12) throw new Error('Enter the backup passphrase.')
  const offset = MAGIC.length, salt = buffer.slice(offset, offset + 16), iv = buffer.slice(offset + 16, offset + 28), tag = buffer.slice(offset + 28, offset + 44), encrypted = buffer.slice(offset + 44)
  const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.scryptSync(String(passphrase), salt, 32), iv)
  decipher.setAuthTag(tag)
  let data
  try { data = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) } catch (error) { throw new Error('The passphrase is incorrect or the backup is damaged.') }
  if (data.format !== 'music-learning-studio-backup' || data.version !== 1 || !data.collections) throw new Error('This backup format is not supported.')
  const counts = {}
  for (const name of ['users', 'weeks', 'pathTemplates', 'studioActivity', 'prizes', 'studioPosts']) counts[name] = Array.isArray(data.collections[name]) ? data.collections[name].length : 0
  return {createdAt: data.createdAt, counts: counts}
}

module.exports = {upload, create, inspect, encryptPayload}
