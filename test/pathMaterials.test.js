const assert = require('assert')
const ejs = require('ejs')
const path = require('path')
const {emailAttachments, hasExpectedSignature, uploadMessage, validateFiles} = require('../lib/pathMaterials')

assert(hasExpectedSignature({mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7')}))
assert(hasExpectedSignature({mimetype: 'audio/mpeg', buffer: Buffer.from('ID3audio')}))
assert(hasExpectedSignature({mimetype: 'audio/wav', buffer: Buffer.from('RIFF0000WAVE')}))
assert(!hasExpectedSignature({mimetype: 'application/pdf', buffer: Buffer.from('<script>')}))
assert.throws(() => validateFiles([{mimetype: 'application/pdf', originalname: 'not-really.pdf', buffer: Buffer.from('<script>')}]), /does not appear/)
assert.strictEqual(uploadMessage({code: 'LIMIT_FILE_SIZE'}), 'Each path material must be 5 MB or smaller.')
const m4aAttachment = emailAttachments('0123456789abcdef01234567', [{
  name: 'Phrase study.m4a', storedName: 'b'.repeat(32) + '.m4a', mimeType: 'audio/x-m4a', size: 2048
}])[0]
assert.strictEqual(m4aAttachment.contentType, 'audio/mp4')
assert.strictEqual(m4aAttachment.contentDisposition, 'attachment')

ejs.renderFile(path.join(__dirname, '..', 'public', 'views', 'includes', 'pathMaterials.ejs'), {
  weekId: '0123456789abcdef01234567',
  materials: [{id: 'a'.repeat(32), name: 'Gentle étude.mp3', mimeType: 'audio/mpeg', size: 2048}]
}).then(output => {
  assert(output.includes('Gentle étude.mp3'))
  assert(output.includes('/path-materials/0123456789abcdef01234567/'))
  console.log('pathMaterials tests passed')
}).catch(error => {
  console.error(error)
  process.exitCode = 1
})
