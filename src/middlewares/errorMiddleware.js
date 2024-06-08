const createError = require('http-errors')
const logger = require('./loggerMiddleware') // Import the custom logging configuration

// Custom error-handling middleware
const errorHandler = (err, req, res, next) => {
  console.log(err)
  if (res.headersSent) {
    return next(err)
  }

  // Log the error to the console

    logger.error(err)

  // Handle specific error types
  if (err instanceof createError.InternalServerError) {
    res.status(500).json({ error: 'Internal Server Error' })
  } else {
    // Handle other errors with a generic response
    res.status(err.status || 500).json({status:false, error: err.message })
  }
}

//! In future seperate operation error vs development erro

module.exports = errorHandler
