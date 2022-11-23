const dotenv = require('dotenv')
dotenv.config()
const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  module.exports = client;
  const app = require('./app');
  // dynamic port selection
  const server = app.listen(0, () => {
  console.log('Studio app listening at http://localhost:', server.address().port);
  });
// old code does not allow dynamic port
//app.listen(process.env.PORT || 3000)
});