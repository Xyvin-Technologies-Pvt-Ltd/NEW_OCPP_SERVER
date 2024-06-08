const mongoose = require('mongoose')
const { getSecret } = require('../config/env.config');

let mongoUrl;
let dbName;

const setMongoConnectionDetails = async () => {
  try {
   
    if (process.env.NODE_ENV !== 'production') {
      mongoUrl = process.env.MONGO_URI || 'mongodb+srv://userone:userone@serverlessinstance0.8pwddqq.mongodb.net';
      dbName = process.env.DB_NAME || 'OXIUM_DB';
    } else {
      const mongoSecret = await getSecret();
   

      mongoUrl = mongoSecret.MONGO_URI;
      dbName = mongoSecret.DB_NAME;
    }
  } catch (error) {
    console.error('Error setting MongoDB connection details:', error);
    process.exit(1);
  }
};

const connectDB = async () => {
  try {

    await setMongoConnectionDetails();

    const connectionInstance = await mongoose.connect(`${mongoUrl}/${dbName}`)

    console.log(
      `\n MongoDB connected !!`
    )
    // Event monitoring
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to db')
    })

    mongoose.connection.on('error', (err) => {
      console.log(err.message)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose connection is disconnected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('Mongoose connection closed through app termination')
      process.exit(0)
    })
  } catch (error) {
    console.log('Mongo Error:' + error.message)
    process.exit(1)
  }
}

module.exports = connectDB;
