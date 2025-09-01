class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ForbiddenError extends CustomError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

module.exports = {
  CustomError,
  ForbiddenError
};
