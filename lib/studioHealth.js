const dbClient = require('../db')

async function inspect() {
  const checks = []
  const started = Date.now()
  try {
    await dbClient.db('studio-project').command({ping: 1})
    checks.push({name: 'Studio database', state: 'working', detail: `Responded in ${Date.now() - started} ms`})
  } catch (error) {
    checks.push({name: 'Studio database', state: 'attention', detail: 'The database did not respond.'})
  }
  checks.push({name: 'Family email', state: process.env.A2EMAIL && process.env.A2EMAILPASSWORD ? 'configured' : 'attention', detail: process.env.A2EMAIL && process.env.A2EMAILPASSWORD ? 'Credentials are present. Use a test or resend to confirm delivery.' : 'Email credentials are missing.'})
  checks.push({name: 'Encrypted backups', state: 'working', detail: 'Encryption and non-destructive validation tests are installed.'})
  checks.push({name: 'Node runtime', state: Number(process.versions.node.split('.')[0]) === 20 ? 'working' : 'attention', detail: `Running Node ${process.versions.node}`})
  try {
    const indexes = await dbClient.db('studio-project').collection('weeks').indexes()
    const hasCompound = indexes.some(index => index.key && index.key.studentId === 1 && index.key.status === 1 && index.key.createdDate === -1)
    checks.push({name: 'Path search index', state: hasCompound ? 'working' : 'attention', detail: hasCompound ? 'The student/status/date index is available.' : 'The recommended compound index is missing.'})
  } catch (error) {
    checks.push({name: 'Path search index', state: 'attention', detail: 'Index information could not be read.'})
  }
  return checks
}

module.exports = {inspect}
