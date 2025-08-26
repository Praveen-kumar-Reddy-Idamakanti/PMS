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
  bgWhite: '\x1b[47m'
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const logger = {
  log: (message, ...args) => {
    console.log(`${colors.cyan}[${getTimestamp()}]${colors.reset}`, message, ...args);
  },
  
  info: (message, ...args) => {
    console.info(`${colors.cyan}[${getTimestamp()}] ${colors.green}[INFO]${colors.reset}`, message, ...args);
  },
  
  success: (message, ...args) => {
    console.log(`${colors.cyan}[${getTimestamp()}] ${colors.green}${colors.bright}[SUCCESS]${colors.reset}`, message, ...args);
  },
  
  warn: (message, ...args) => {
    console.warn(`${colors.cyan}[${getTimestamp()}] ${colors.yellow}[WARN]${colors.reset}`, message, ...args);
  },
  
  error: (message, ...args) => {
    console.error(`${colors.cyan}[${getTimestamp()}] ${colors.red}${colors.bright}[ERROR]${colors.reset}`, message, ...args);
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(`${colors.cyan}[${getTimestamp()}] ${colors.blue}[DEBUG]${colors.reset}`, message, ...args);
    }
  },
  
  http: (message, ...args) => {
    console.log(`${colors.cyan}[${getTimestamp()}] ${colors.magenta}[HTTP]${colors.reset}`, message, ...args);
  },
  
  // For morgan HTTP request logging
  stream: {
    write: (message) => {
      logger.http(message.trim());
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
