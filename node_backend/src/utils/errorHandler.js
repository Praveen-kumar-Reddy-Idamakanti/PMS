/**
 * Custom error handler class
 */
class ErrorHandler extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {object} errors - Additional error details
   */
  constructor(statusCode, message, errors = {}) {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
  }
}

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleError = (err, req, res, next) => {
  const { statusCode = 500, message = 'Internal Server Error', errors = {} } = err;
  
  // Log the error
  if (req.app.get('env') === 'development') {
    console.error('Error:', {
      statusCode,
      message,
      stack: err.stack,
      errors
    });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(Object.keys(errors).length > 0 && { errors })
  });
};

module.exports = {
  ErrorHandler,
  handleError
};
