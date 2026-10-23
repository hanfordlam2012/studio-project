const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const nodemailer = require('nodemailer')
const validator = require('validator')
const {ObjectId} = require('mongodb')
const {renderSafeMarkdown} = require('./safeContent')

const MAX_RECORDING_SIZE = 50 * 1024 * 1024
const MAX_SCORE_SIZE = 10 * 1024 * 1024
const RETENTION_DAYS = 30
const root = path.resolve(process.env.SECOND_OPINION_DIR || path.join(__dirname, '..', 'private', 'second-opinions'))
const incomingRoot = path.join(root, '.incoming')
fs.mkdirSync(incomingRoot, {recursive: true})
const collection = () => require('../db').db('studio-project').collection('secondOpinions')
const allowedRecordingTypes = new Map([
  ['audio/mpeg', '.mp3'], ['audio/mp4', '.m4a'], ['audio/x-m4a', '.m4a'],
  ['audio/wav', '.wav'], ['audio/x-wav', '.wav'], ['audio/aac', '.aac'],
  ['audio/ogg', '.ogg'], ['video/mp4', '.mp4'], ['video/quicktime', '.mov']
])
const allowedScoreTypes = new Map([
  ['application/pdf', '.pdf'], ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp']
])
let indexPromise

function ensureIndexes() {
  if (!indexPromise) indexPromise = Promise.all([
    collection().createIndex({createdAt: -1}),
    collection().createIndex({recordingExpiresAt: 1, recordingDeletedAt: 1})
  ])
  return indexPromise
}

const upload = multer({
  storage: multer.diskStorage({
    destination: incomingRoot,
    filename: (req, file, callback) => callback(null, crypto.randomBytes(24).toString('hex'))
  }),
  limits: {fileSize: MAX_RECORDING_SIZE, files: 2, fields: 20},
  fileFilter: (req, file, callback) => {
    const allowed = file.fieldname === 'recording' ? allowedRecordingTypes.has(String(file.mimetype).toLowerCase()) : file.fieldname === 'score' && allowedScoreTypes.has(String(file.mimetype).toLowerCase())
    callback(allowed ? null : new Error('UNSUPPORTED_SECOND_OPINION_FILE'), allowed)
  }
}).fields([{name: 'recording', maxCount: 1}, {name: 'score', maxCount: 1}])

function uploadMessage(error) {
  if (error && error.code === 'LIMIT_FILE_SIZE') return 'The recording must be 50 MB or smaller, and the score 10 MB or smaller.'
  if (error && error.message === 'UNSUPPORTED_SECOND_OPINION_FILE') return 'Use MP3, M4A, WAV, AAC, OGG, MP4 or MOV for the recording, and PDF, JPG, PNG or WebP for the score.'
  return 'The files could not be uploaded. Please try again.'
}

function clean(value, max) {
  return String(value || '').replace(/[\0\r]/g, '').trim().slice(0, max)
}

function safeName(value, fallback) {
  return clean(value, 140).replace(/[<>]/g, '') || fallback
}

async function expectedSignature(file) {
  const handle = await fs.promises.open(file.path, 'r')
  const b = Buffer.alloc(16)
  const result = await handle.read(b, 0, b.length, 0)
  await handle.close()
  const header = b.subarray(0, result.bytesRead)
  const ascii = (start, end) => header.slice(start, end).toString('ascii')
  switch (String(file.mimetype).toLowerCase()) {
    case 'application/pdf': return ascii(0, 4) === '%PDF'
    case 'image/jpeg': return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
    case 'image/png': return header.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/webp': return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    case 'audio/mpeg': return ascii(0, 3) === 'ID3' || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0)
    case 'audio/mp4': case 'audio/x-m4a': case 'video/mp4': case 'video/quicktime': return ascii(4, 8) === 'ftyp'
    case 'audio/wav': case 'audio/x-wav': return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    case 'audio/aac': return header[0] === 0xff && (header[1] === 0xf1 || header[1] === 0xf9)
    case 'audio/ogg': return ascii(0, 4) === 'OggS'
    default: return false
  }
}

function transport() {
  return nodemailer.createTransport({
    host: process.env.A2EMAILHOST || 'sg1-ts3.a2hosting.com',
    port: Number(process.env.A2EMAILPORT) || 465,
    secure: true,
    auth: {user: process.env.A2EMAIL, pass: process.env.A2EMAILPASSWORD}
  })
}

function escape(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function bankDetails() {
  const details = {
    accountName: clean(process.env.SECOND_OPINION_ACCOUNT_NAME, 100),
    bankName: clean(process.env.SECOND_OPINION_BANK_NAME, 100),
    bsb: clean(process.env.SECOND_OPINION_BSB, 20),
    accountNumber: clean(process.env.SECOND_OPINION_ACCOUNT_NUMBER, 30)
  }
  details.available = Boolean(details.accountName && details.bsb && details.accountNumber)
  return details
}

function makeReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `SO-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

async function saveFile(folder, file, types, label) {
  if (!file) return null
  if (label === 'score' && file.size > MAX_SCORE_SIZE) throw new Error('The score must be 10 MB or smaller.')
  if (!await expectedSignature(file)) throw new Error(`${safeName(file.originalname, label)} does not appear to be a valid file.`)
  const mimeType = String(file.mimetype).toLowerCase()
  const storedName = `${label}-${crypto.randomBytes(16).toString('hex')}${types.get(mimeType)}`
  await fs.promises.rename(file.path, path.join(folder, storedName))
  return {name: safeName(file.originalname, label), storedName, mimeType, size: file.size}
}

async function create(data, files) {
  await ensureIndexes()
  const name = clean(data.name, 80)
  const email = clean(data.email, 160).toLowerCase()
  const piece = clean(data.piece, 160)
  const question = clean(data.question, 2500)
  if (!name || !validator.isEmail(email) || !piece || !question) throw new Error('Please complete your name, email, piece and musical question.')
  if (data.withinLength !== 'yes' || data.consent !== 'yes') throw new Error('Please confirm the recording length and temporary storage consent.')
  const recording = files && files.recording && files.recording[0]
  const score = files && files.score && files.score[0]
  if (!recording) throw new Error('Please attach one recording.')
  const reference = makeReference()
  const folder = path.join(root, reference)
  await fs.promises.mkdir(folder, {recursive: true})
  let recordingFile
  let scoreFile
  try {
    recordingFile = await saveFile(folder, recording, allowedRecordingTypes, 'recording')
    scoreFile = await saveFile(folder, score, allowedScoreTypes, 'score')
    const now = new Date()
    const order = {
      reference, name, email, piece, question,
      recording: recordingFile, score: scoreFile,
      priceAud: 150, maxMinutes: 10, status: 'awaiting-payment',
      createdAt: now, recordingExpiresAt: new Date(now.getTime() + RETENTION_DAYS * 86400000),
      review: {pulse: null, pitch: null, articulation: null, dynamics: null, nextTasks: '', generalComments: ''}
    }
    const result = await collection().insertOne(order)
    order._id = result.insertedId
    await sendReceipt(order).catch(error => console.error('Second opinion receipt email failed:', error.message))
    await sendNotification(order).catch(error => console.error('Second opinion notification email failed:', error.message))
    return order
  } catch (error) {
    await fs.promises.rm(folder, {recursive: true, force: true}).catch(() => {})
    const incoming = [recording, score].filter(Boolean).map(file => fs.promises.unlink(file.path).catch(() => {}))
    await Promise.all(incoming)
    throw error
  }
}

async function sendReceipt(order) {
  const bank = bankDetails()
  const payment = bank.available ? `<p><strong>Bank transfer</strong><br>Account name: ${escape(bank.accountName)}${bank.bankName ? `<br>Bank: ${escape(bank.bankName)}` : ''}<br>BSB: ${escape(bank.bsb)}<br>Account: ${escape(bank.accountNumber)}<br>Reference: <strong>${escape(order.reference)}</strong></p>` : '<p>Hanford will send the bank-transfer details separately.</p>'
  return transport().sendMail({
    from: process.env.A2EMAIL, to: order.email,
    subject: `Piano Second Opinion received · ${order.reference}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#172b2b;max-width:640px"><h1 style="font-size:24px">Your recording has arrived</h1><p>Hello ${escape(order.name)},</p><p>Thank you for sending <strong>${escape(order.piece)}</strong>. Your Piano Second Opinion is $150 AUD and will be prepared within one week after payment is confirmed.</p>${payment}<p>Your recording will be deleted automatically 30 days after submission.</p><p>Warmly,<br>Hanford</p></div>`
  })
}

async function sendNotification(order) {
  if (!process.env.EMAIL) return
  return transport().sendMail({
    from: process.env.A2EMAIL, to: process.env.EMAIL,
    subject: `New Piano Second Opinion · ${order.reference}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><p><strong>${escape(order.name)}</strong> submitted ${escape(order.piece)}.</p><p>${escape(order.question)}</p><p>Open Studio Desk to review the order.</p></div>`
  })
}

async function list() {
  await ensureIndexes()
  await purgeExpired()
  return collection().find({}).sort({createdAt: -1}).limit(100).toArray()
}

async function saveReview(id, data) {
  if (!ObjectId.isValid(id)) throw new Error('That order could not be found.')
  const statusOptions = ['awaiting-payment', 'paid', 'in-review', 'completed']
  const status = statusOptions.includes(data.status) ? data.status : 'awaiting-payment'
  const score = name => {
    const value = Number(data[name])
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null
  }
  const review = {pulse: score('pulse'), pitch: score('pitch'), articulation: score('articulation'), dynamics: score('dynamics'), nextTasks: clean(data.nextTasks, 5000), generalComments: clean(data.generalComments, 5000)}
  if (status === 'completed' && (!review.pulse || !review.pitch || !review.articulation || !review.dynamics || !review.nextTasks || !review.generalComments)) throw new Error('Complete all four attributes, next tasks and general comments before sending the finished review.')
  const existing = await collection().findOne({_id: new ObjectId(id)})
  if (!existing) throw new Error('That order could not be found.')
  if (status === 'completed' && existing.status !== 'completed') {
    await collection().updateOne({_id: existing._id}, {$set: {review, updatedAt: new Date()}})
    await sendCompleted({...existing, status, review})
    await collection().updateOne({_id: existing._id}, {$set: {status, completedAt: new Date(), updatedAt: new Date()}})
  } else {
    await collection().updateOne({_id: existing._id}, {$set: {status, review, updatedAt: new Date()}})
  }
  return status === 'completed' ? 'The finished Piano Second Opinion was emailed.' : 'The Piano Second Opinion was updated.'
}

async function resendCompleted(id) {
  if (!ObjectId.isValid(id)) throw new Error('That order could not be found.')
  const order = await collection().findOne({_id: new ObjectId(id)})
  if (!order || order.status !== 'completed') throw new Error('Only a completed review can be resent.')
  await sendCompleted(order)
  await collection().updateOne({_id: order._id}, {$set: {lastEmailedAt: new Date()}})
  return 'The completed Piano Second Opinion was emailed again.'
}

async function sendCompleted(order) {
  const labels = [['Pulse', order.review.pulse], ['Pitch', order.review.pitch], ['Articulation', order.review.articulation], ['Dynamics', order.review.dynamics]]
  const ratings = labels.map(item => `<tr><td style="padding:8px 12px;border-bottom:1px solid #d7dfe2">${item[0]}</td><td style="padding:8px 12px;border-bottom:1px solid #d7dfe2"><strong>${item[1]} / 5</strong></td></tr>`).join('')
  return transport().sendMail({
    from: process.env.A2EMAIL, to: order.email,
    subject: `Your Piano Second Opinion · ${order.piece}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#172b2b;max-width:640px"><p>Hello ${escape(order.name)},</p><h1 style="font-size:24px">Piano Second Opinion</h1><h2 style="font-size:19px">${escape(order.piece)}</h2><table style="border-collapse:collapse;width:100%;margin:18px 0">${ratings}</table><h3>Suggested next tasks</h3><div>${renderSafeMarkdown(order.review.nextTasks)}</div><h3>General comments</h3><div>${renderSafeMarkdown(order.review.generalComments)}</div><p>Warmly,<br>Hanford</p></div>`
  })
}

async function findFile(id, kind) {
  if (!ObjectId.isValid(id) || !['recording', 'score'].includes(kind)) return null
  const order = await collection().findOne({_id: new ObjectId(id)})
  const file = order && order[kind]
  if (!file || path.basename(file.storedName) !== file.storedName) return null
  return {path: path.join(root, order.reference, file.storedName), file}
}

async function purgeExpired() {
  const expired = await collection().find({recordingExpiresAt: {$lte: new Date()}, recordingDeletedAt: {$exists: false}}).project({reference: 1}).toArray()
  for (const order of expired) {
    await fs.promises.rm(path.join(root, order.reference), {recursive: true, force: true}).catch(() => {})
    await collection().updateOne({_id: order._id}, {$set: {recordingDeletedAt: new Date(), recording: null, score: null}})
  }
}

setInterval(() => purgeExpired().catch(error => console.error('Second opinion expiry cleanup failed:', error.message)), 6 * 60 * 60 * 1000).unref()

module.exports = {upload, uploadMessage, bankDetails, create, list, saveReview, resendCompleted, findFile, purgeExpired, sendReceipt, sendCompleted}
