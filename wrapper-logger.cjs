// Wrapper logger that integrates with the wrapper's own log system
function ts() {
  return new Date().toISOString()
}

// This will be set by wrapper-server.cjs
let emitLogFunction = null

function setLogEmitter(emitFn) {
  emitLogFunction = emitFn
}

const wrapperLogger = {
  info(msg, meta) {
    const logEntry = {
      ts: Date.now(),
      level: 'info',
      msg: `[WRAPPER] ${msg}`,
      meta: meta ?? '',
    }
    console.log(`[INFO ] ${ts()} ${logEntry.msg}`, logEntry.meta)
    if (emitLogFunction) {
      emitLogFunction(logEntry)
    }
  },
  debug(msg, meta) {
    const logEntry = {
      ts: Date.now(),
      level: 'debug',
      msg: `[WRAPPER] ${msg}`,
      meta: meta ?? '',
    }
    console.log(`[DEBUG] ${ts()} ${logEntry.msg}`, logEntry.meta)
    if (emitLogFunction) {
      emitLogFunction(logEntry)
    }
  },
  warn(msg, meta) {
    const logEntry = {
      ts: Date.now(),
      level: 'warn',
      msg: `[WRAPPER] ${msg}`,
      meta: meta ?? '',
    }
    console.warn(`[WARN ] ${ts()} ${logEntry.msg}`, logEntry.meta)
    if (emitLogFunction) {
      emitLogFunction(logEntry)
    }
  },
  error(msg, meta) {
    const logEntry = {
      ts: Date.now(),
      level: 'error',
      msg: `[WRAPPER] ${msg}`,
      meta: meta ?? '',
    }
    console.error(`[ERROR] ${ts()} ${logEntry.msg}`, logEntry.meta)
    if (emitLogFunction) {
      emitLogFunction(logEntry)
    }
  },
}

module.exports = { wrapperLogger, setLogEmitter }
