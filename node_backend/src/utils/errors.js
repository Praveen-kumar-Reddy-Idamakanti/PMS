/**
 * Custom error classes for the application
 */

/**
 * Base error class that extends the native Error class
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Capture stack trace, excluding constructor call from it
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request Error
 * Used when the request contains invalid data
 */
class BadRequestError extends AppError {
  constructor(message = 'Invalid request data') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized Error
 * Used when authentication is required and has failed or has not been provided
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Please authenticate to access this resource') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden Error
 * Used when the user doesn't have permission to access the resource
 */
class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

/**
 * 404 Not Found Error
 * Used when a resource cannot be found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * 409 Conflict Error
 * Used when there's a conflict with the current state of the resource
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * 422 Validation Error
 * Used when the request data fails validation
 */
class ValidationError extends AppError {
  constructor(errors = []) {
    super('Validation failed', 422);
    this.errors = errors;
  }
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
class InternalServerError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500);
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Default to 500 if status code not set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // In development, send the full error stack trace
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // In production, only send the error message
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      // Log the error for debugging
      console.error('ERROR 💥', err);
      
      // Send generic error response
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
      });
    }
  }
};

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  errorHandler,
};
