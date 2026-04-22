const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const formatTimestamp = () => new Date().toISOString();

const logger = {
  info: (message, ...args) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[${formatTimestamp()}] [${LogLevel.INFO}] ${message}`, ...args);
    } else {
      console.log(`[${formatTimestamp()}] \x1b[32m${LogLevel.INFO}\x1b[0m ${message}`, ...args);
    }
  },

  warn: (message, ...args) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[${formatTimestamp()}] [${LogLevel.WARN}] ${message}`, ...args);
    } else {
      console.log(`[${formatTimestamp()}] \x1b[33m${LogLevel.WARN}\x1b[0m ${message}`, ...args);
    }
  },

  error: (message, ...args) => {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[${formatTimestamp()}] [${LogLevel.ERROR}] ${message}`, ...args);
    } else {
      console.error(`[${formatTimestamp()}] \x1b[31m${LogLevel.ERROR}\x1b[0m ${message}`, ...args);
    }
  }
};

module.exports = logger;
