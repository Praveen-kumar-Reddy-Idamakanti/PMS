const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  // Custom log levels
  levels: {
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[36m',
    http: '\x1b[35m',
    debug: '\x1b[37m',
    success: '\x1b[32m',
    verbose: '\x1b[34m'
  }
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const stringify = (obj) => {
  if (typeof obj === 'string') return obj;
  if (obj instanceof Error) return obj.stack || obj.message;
  if (obj === undefined || obj === null) return '';
  try {
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        // Mask sensitive data
        if (['password', 'token', 'authorization', 'cookie'].includes(key.toLowerCase())) {
          return '***';
        }
        // Handle large objects
        if (key === 'data' && value && value.length > 1000) {
          return `[Data (${value.length} bytes)]`;
        }
      }
      return value;
    }, 2);
  } catch (e) {
    return '[Circular or non-serializable data]';
  }
};

const formatMessage = (level, message, ...args) => {
  const timestamp = getTimestamp();
  const levelColor = colors.levels[level] || '';
  const levelLabel = level.toUpperCase().padEnd(7);
  
  const formattedArgs = args.map(arg => 
    typeof arg === 'object' ? stringify(arg) : arg
  ).join(' ');
  
  const formattedMessage = typeof message === 'string' ? message : stringify(message);
  
  return `${colors.dim}[${timestamp}] ${levelColor}${levelLabel}${colors.reset} ${formattedMessage} ${formattedArgs}`;
};

const logger = {
  // Basic logging
  log: (message, ...args) => {
    console.log(formatMessage('info', message, ...args));
  },
  
  // Info level
  info: (message, ...args) => {
    console.info(formatMessage('info', message, ...args));
  },
  
  // Success level
  success: (message, ...args) => {
    console.log(formatMessage('success', message, ...args));
  },
  
  // Warning level
  warn: (message, ...args) => {
    console.warn(formatMessage('warn', message, ...args));
  },
  
  // Error level
  error: (message, ...args) => {
    console.error(formatMessage('error', message, ...args));
  },
  
  // Debug level (only in development)
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, ...args));
    }
  },
  
  // HTTP request/response logging
  http: (message, ...args) => {
    console.log(formatMessage('http', message, ...args));
  },
  
  // For morgan HTTP request logging
  stream: {
    write: (message) => {
      const statusCode = message.match(/\s(\d{3})\s/)?.[1];
      const method = message.match(/^\S+/)?.[0];
      const url = message.match(/\s(\/[^\s?]+)/)?.[1] || '/';
      const responseTime = message.match(/(\d+)ms/)?.[1] || '0';
      
      if (statusCode >= 500) {
        logger.error(`${method} ${url} ${statusCode} - ${responseTime}ms`);
      } else if (statusCode >= 400) {
        logger.warn(`${method} ${url} ${statusCode} - ${responseTime}ms`);
      } else {
        logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`);
      }
    }
  },
  
  // Request logging helper
  request: (req) => {
    const { method, originalUrl, ip, headers, query, params, body } = req;
    logger.http('Incoming Request', {
      method,
      url: originalUrl,
      ip,
      headers: {
        'user-agent': headers['user-agent'],
        'content-type': headers['content-type'],
        authorization: headers.authorization ? '***' : undefined
      },
      query,
      params,
      body: body && Object.keys(body).length ? body : undefined
    });
  },
  
  // Response logging helper
  response: (req, res, responseBody) => {
    const { method, originalUrl } = req;
    const { statusCode } = res;
    
    const logData = {
      method,
      url: originalUrl,
      status: statusCode,
      response: responseBody
    };
    
    if (statusCode >= 400) {
      logger.error('API Response', logData);
    } else {
      logger.http('API Response', logData);
    }
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = logger;
