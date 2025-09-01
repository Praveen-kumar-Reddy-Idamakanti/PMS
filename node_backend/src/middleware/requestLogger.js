const logger = require('../utils/logger');
const { logActivity } = require('../utils/activityLogger');

// List of paths to exclude from logging
const EXCLUDED_PATHS = [
  '/health',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known/',
  '/api/auth/login'  // Skip logging for login route
];

// File extensions to exclude from logging
const EXCLUDED_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.woff', '.woff2', '.ttf', '.svg', '.eot', '.map'
];

/**
 * Middleware to log all incoming requests and responses
 */
const requestLogger = async (req, res, next) => {
  const start = Date.now();
  
  // Skip logging for excluded paths and static files
  const path = req.path.toLowerCase();
  const isExcluded = EXCLUDED_PATHS.some(p => path.startsWith(p)) ||
                    EXCLUDED_EXTENSIONS.some(ext => path.endsWith(ext));
  
  if (isExcluded) {
    return next();
  }

  // Store the original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let responseSent = false;

  // Helper to log the response
  const logResponse = (body) => {
    if (responseSent) return;
    responseSent = true;
    
    const responseTime = Date.now() - start;
    const { statusCode } = res;
    
    // Only log errors
    if (statusCode >= 400) {
      logger.error(`[${statusCode}] ${req.method} ${req.originalUrl} - ${responseTime}ms`);
    }

    // Log activity for successful state-changing requests
    if (statusCode < 400 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      let activityType = 'SYSTEM_EVENT';
      const path = req.originalUrl.toLowerCase();
      
      if (path.includes('/api/attendance/checkin')) {
        activityType = 'USER_CHECKIN';
      } else if (path.includes('/api/attendance/checkout')) {
        activityType = 'USER_CHECKOUT';
      } else if (path.includes('/api/remote-attendance/request')) {
        activityType = 'ADMIN_ACTION';
      } else if (path.includes('/api/users')) {
        activityType = req.method === 'POST' ? 'USER_CREATE' : 
                     req.method === 'PUT' || req.method === 'PATCH' ? 'USER_UPDATE' :
                     req.method === 'DELETE' ? 'USER_DELETE' : 'SYSTEM_EVENT';
      }
      
      logActivity(
        req.user?.id || null,
        activityType,
        {
          action: `${req.method} ${req.originalUrl}`,
          method: req.method,
          path: req.originalUrl,
          statusCode,
          responseTime: `${responseTime}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        req
      ).catch(error => {
        logger.error('Failed to log activity:', error);
      });
    }
  };

  // Override response methods to capture the response body
  res.send = function(body) {
    responseBody = body;
    logResponse(body);
    return originalSend.call(this, body);
  };

  res.json = function(body) {
    responseBody = body;
    logResponse(body);
    return originalJson.call(this, body);
  };

  res.end = function(chunk, encoding) {
    if (chunk) {
      responseBody = chunk.toString();
      try {
        responseBody = JSON.parse(responseBody);
      } catch (e) {
        // Not JSON
      }
    }
    logResponse(responseBody);
    return originalEnd.call(this, chunk, encoding);
  };

  // Handle errors
  res.on('error', (error) => {
    logger.error('Response error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode
    });
  });

  // Ensure response is logged even if no data is sent
  res.on('finish', () => {
    if (!responseSent) {
      logResponse(responseBody);
    }
  });

  try {
    await next();
  } catch (error) {
    logger.error('Request processing error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
    
    // Ensure error responses are properly formatted
    if (!res.headersSent) {
      const statusCode = error.statusCode || 500;
      const message = statusCode >= 500 ? 'Internal Server Error' : error.message;
      
      res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && {
          details: error.details,
          stack: error.stack
        })
      });
    }
  }
};

module.exports = requestLogger;
