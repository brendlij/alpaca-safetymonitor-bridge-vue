// Minimal logger
function ts() {
  return new Date().toISOString()
}

const logger = {
  info(msg, meta) {
    console.log(`[INFO ] ${ts()} ${msg}`, meta ?? '')
  },
  debug(msg, meta) {
    console.log(`[DEBUG] ${ts()} ${msg}`, meta ?? '')
  },
  warn(msg, meta) {
    console.warn(`[WARN ] ${ts()} ${msg}`, meta ?? '')
  },
  error(msg, meta) {
    console.error(`[ERROR] ${ts()} ${msg}`, meta ?? '')
  },
}

module.exports = { logger }
