const dotenv = require('dotenv')
dotenv.config({quiet: true})
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(process.env.URI);
module.exports = client

client.connect().then(() => {
  const app = require('./app');
  const port = Number(process.env.PORT) || 3000
  const server = app.listen(port, () => {
    console.log('Studio app listening on port', server.address().port);
  });
}).catch((error) => {
    const safeMessage = String(error.message || '').replace(process.env.URI || '', '[redacted]')
    console.error('MongoDB connection failed:', error.name, error.code || '', safeMessage)
    process.exitCode = 1
})
