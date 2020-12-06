const dotenv = require('dotenv')
dotenv.config()
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  module.exports = client;
  const app = require('./app');
  app.listen(process.env.PORT || 3000)
});