const assert = require('assert')
const studioBackup = require('../lib/studioBackup')

const passphrase = 'test-only-passphrase-47'
const payload = {
  format: 'music-learning-studio-backup',
  version: 1,
  createdAt: '2026-09-04T00:00:00.000Z',
  collections: {users: [{}], weeks: [{}, {}], pathTemplates: [], studioActivity: [{}], prizes: [], studioPosts: []}
}

const encrypted = studioBackup.encryptPayload(payload, passphrase)
const summary = studioBackup.inspect(encrypted, passphrase)

assert.deepStrictEqual(summary.counts, {users: 1, weeks: 2, pathTemplates: 0, studioActivity: 1, prizes: 0, studioPosts: 0})
assert.throws(() => studioBackup.inspect(encrypted, 'wrong-passphrase'), /incorrect or the backup is damaged/)
assert.throws(() => studioBackup.encryptPayload(payload, 'too-short'), /at least 12 characters/)

console.log('Studio backup encryption and validation tests passed.')
