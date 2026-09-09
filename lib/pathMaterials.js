const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const ObjectId = require('mongodb').ObjectId

const MAX_FILES = 3
const MAX_FILE_SIZE = 5 * 1024 * 1024
const allowedTypes = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['audio/mpeg', '.mp3'],
  ['audio/mp4', '.m4a'],
  ['audio/x-m4a', '.m4a'],
  ['audio/wav', '.wav'],
  ['audio/x-wav', '.wav'],
  ['audio/aac', '.aac'],
  ['audio/ogg', '.ogg']
])

const root = path.resolve(process.env.PATH_MATERIALS_DIR || path.join(__dirname, '..', 'private', 'path-materials'))
const weeksCollection = () => require('../db').db('studio-project').collection('weeks')
const usersCollection = () => require('../db').db('studio-project').collection('users')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: MAX_FILE_SIZE, files: MAX_FILES},
  fileFilter: (req, file, callback) => callback(allowedTypes.has(String(file.mimetype).toLowerCase()) ? null : new Error('UNSUPPORTED_PATH_MATERIAL'), allowedTypes.has(String(file.mimetype).toLowerCase()))
}).array('materials', MAX_FILES)

function uploadMessage(error) {
  if (error && error.code === 'LIMIT_FILE_SIZE') return 'Each path material must be 5 MB or smaller.'
  if (error && error.code === 'LIMIT_FILE_COUNT') return 'Add no more than three path materials.'
  if (error && error.message === 'UNSUPPORTED_PATH_MATERIAL') return 'Use PDF, JPG, PNG, WebP, MP3, M4A, WAV, AAC, or OGG files.'
  return 'Those path materials could not be uploaded.'
}

function safeDisplayName(value) {
  return String(value || 'Path material').replace(/[\0\r\n]/g, '').replace(/[<>]/g, '').trim().slice(0, 140) || 'Path material'
}

function hasExpectedSignature(file) {
  const buffer = file.buffer || Buffer.alloc(0)
  const ascii = (start, end) => buffer.slice(start, end).toString('ascii')
  switch (String(file.mimetype).toLowerCase()) {
    case 'application/pdf': return ascii(0, 4) === '%PDF'
    case 'image/jpeg': return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/png': return buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/webp': return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    case 'audio/mpeg': return ascii(0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    case 'audio/mp4':
    case 'audio/x-m4a': return ascii(4, 8) === 'ftyp'
    case 'audio/wav':
    case 'audio/x-wav': return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    case 'audio/aac': return buffer[0] === 0xff && (buffer[1] === 0xf1 || buffer[1] === 0xf9)
    case 'audio/ogg': return ascii(0, 4) === 'OggS'
    default: return false
  }
}

function validateFiles(files) {
  for (const file of files || []) {
    if (!hasExpectedSignature(file)) throw new Error(`${safeDisplayName(file.originalname)} does not appear to be a valid file of the selected type.`)
  }
}

async function addMaterials(weekId, files) {
  if (!files || !files.length) return []
  const week = await weeksCollection().findOne({_id: new ObjectId(weekId)}, {projection: {attachments: 1}})
  if (!week) throw new Error('That path could not be found.')
  const existing = Array.isArray(week.attachments) ? week.attachments : []
  if (existing.length + files.length > MAX_FILES) throw new Error('A path can contain no more than three materials.')
  const folder = path.join(root, String(weekId))
  await fs.promises.mkdir(folder, {recursive: true})
  const materials = []
  try {
    validateFiles(files)
    for (const file of files) {
      const mimeType = String(file.mimetype).toLowerCase()
      const id = crypto.randomBytes(16).toString('hex')
      const storedName = `${id}${allowedTypes.get(mimeType)}`
      await fs.promises.writeFile(path.join(folder, storedName), file.buffer, {flag: 'wx'})
      materials.push({id, name: safeDisplayName(file.originalname), storedName, mimeType, size: file.size})
    }
    await weeksCollection().updateOne({_id: new ObjectId(weekId)}, {$push: {attachments: {$each: materials}}})
    return existing.concat(materials)
  } catch (error) {
    await Promise.all(materials.map(material => fs.promises.unlink(path.join(folder, material.storedName)).catch(() => {})))
    throw error
  }
}

async function reuseMaterials(weekId, references, secret) {
  const refs = [].concat(references || []).slice(0, MAX_FILES)
  if (!refs.length) return (await weeksCollection().findOne({_id: new ObjectId(weekId)}, {projection: {attachments: 1}})).attachments || []
  const target = await weeksCollection().findOne({_id: new ObjectId(weekId)}, {projection: {studentId: 1}})
  if (!target || !await usersCollection().findOne({_id: target.studentId, secret: secret, student: true}, {projection: {_id: 1}})) throw new Error('That path could not receive library materials.')
  const files = []
  for (const reference of refs) {
    const parts = String(reference).split(':')
    if (!ObjectId.isValid(parts[0]) || !/^[a-f\d]{32}$/i.test(parts[1] || '')) continue
    const source = await weeksCollection().findOne({_id: new ObjectId(parts[0])}, {projection: {studentId: 1, attachments: 1}})
    if (!source || !await usersCollection().findOne({_id: source.studentId, secret: secret, student: true}, {projection: {_id: 1}})) continue
    const material = (source.attachments || []).find(item => item.id === parts[1])
    if (!material || path.basename(material.storedName) !== material.storedName) continue
    const buffer = await fs.promises.readFile(path.join(root, String(source._id), material.storedName))
    files.push({originalname: material.name, mimetype: material.mimeType, size: buffer.length, buffer: buffer})
  }
  return addMaterials(weekId, files)
}

async function removeMaterials(weekId, materialIds) {
  const ids = [].concat(materialIds || []).filter(id => /^[a-f\d]{32}$/i.test(String(id)))
  if (!ids.length) return
  const week = await weeksCollection().findOne({_id: new ObjectId(weekId)}, {projection: {attachments: 1}})
  if (!week) throw new Error('That path could not be found.')
  const removed = (week.attachments || []).filter(material => ids.includes(material.id))
  await weeksCollection().updateOne({_id: week._id}, {$pull: {attachments: {id: {$in: ids}}}})
  await Promise.all(removed.map(material => fs.promises.unlink(path.join(root, String(weekId), material.storedName)).catch(() => {})))
}

async function renameMaterials(weekId, materialIds, materialNames) {
  const ids = [].concat(materialIds || [])
  const names = [].concat(materialNames || [])
  if (!ids.length) return
  const week = await weeksCollection().findOne({_id: new ObjectId(weekId)}, {projection: {attachments: 1}})
  if (!week) throw new Error('That path could not be found.')
  const renamed = (week.attachments || []).map(material => {
    const index = ids.indexOf(material.id)
    return index < 0 ? material : Object.assign({}, material, {name: safeDisplayName(names[index])})
  })
  await weeksCollection().updateOne({_id: week._id}, {$set: {attachments: renamed}})
}

async function findAccessibleMaterial(sessionUser, weekId, materialId) {
  if (!sessionUser || !ObjectId.isValid(weekId) || !/^[a-f\d]{32}$/i.test(String(materialId))) return null
  const week = await weeksCollection().findOne({_id: new ObjectId(weekId)})
  if (!week) return null
  const isStudent = sessionUser.student && String(week.studentId) === String(sessionUser.userId) && week.status !== 'draft'
  let isAdmin = false
  if (sessionUser.admin) {
    isAdmin = Boolean(await usersCollection().findOne({_id: week.studentId, secret: sessionUser.secret, student: true}, {projection: {_id: 1}}))
  }
  if (!isStudent && !isAdmin) return null
  const material = (week.attachments || []).find(item => item.id === materialId)
  if (!material || path.basename(material.storedName) !== material.storedName) return null
  return {material, filePath: path.join(root, String(week._id), material.storedName)}
}

function emailAttachments(weekId, materials) {
  return (materials || []).map(material => ({
    filename: safeDisplayName(material.name),
    path: path.join(root, String(weekId), material.storedName),
    // audio/x-m4a is accepted by browsers but inconsistently handled by mail servers.
    contentType: material.mimeType === 'audio/x-m4a' ? 'audio/mp4' : material.mimeType,
    contentDisposition: 'attachment'
  }))
}

module.exports = {MAX_FILES, MAX_FILE_SIZE, upload, uploadMessage, validateFiles, addMaterials, reuseMaterials, removeMaterials, renameMaterials, findAccessibleMaterial, emailAttachments, hasExpectedSignature}
