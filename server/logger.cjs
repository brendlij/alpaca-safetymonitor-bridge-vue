// Logger with level filtering
function ts() {
  return new Date().toISOString()
}

// Log levels in order of priority (higher number = higher priority)
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

let currentLogLevel = 'info' // default level

const logger = {
  setLevel(level) {
    if (LOG_LEVELS.hasOwnProperty(level)) {
      currentLogLevel = level
    }
  },

  getLevel() {
    return currentLogLevel
  },

  shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
  },

  info(msg, meta) {
    if (this.shouldLog('info')) {
      console.log(`[INFO ] ${ts()} ${msg}`, meta ?? '')
    }
  },
  debug(msg, meta) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${ts()} ${msg}`, meta ?? '')
    }
  },
  warn(msg, meta) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN ] ${ts()} ${msg}`, meta ?? '')
    }
  },
  error(msg, meta) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${ts()} ${msg}`, meta ?? '')
    }
  },

  // Enhanced logging methods with better metadata support
  logMqtt(level, action, data = {}) {
    const meta = {
      type: 'mqtt',
      action,
      ...data,
    }
    this[level](`MQTT ${action}`, meta)
  },

  logSafety(level, action, safe, reason, data = {}) {
    const meta = {
      type: 'safety',
      action,
      safe,
      reason,
      ...data,
    }
    this[level](
      `Safety ${action}: ${safe ? 'SAFE' : 'UNSAFE'}${reason ? ` (${reason})` : ''}`,
      meta,
    )
  },

  logClient(level, action, clientId, data = {}) {
    const meta = {
      type: 'client',
      action,
      clientId,
      ...data,
    }
    this[level](`Client ${action}: ${clientId}`, meta)
  },

  logServer(level, action, data = {}) {
    const meta = {
      type: 'server',
      action,
      ...data,
    }
    this[level](`Server ${action}`, meta)
  },
}

module.exports = { logger }
