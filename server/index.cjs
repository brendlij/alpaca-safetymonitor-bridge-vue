const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { EventEmitter } = require('events')
const { logger } = require('./logger.cjs')
const { createAlpacaRouter } = require('./alpaca.cjs')
const { createState } = require('./state.cjs')
const { startDiscovery } = require('./discovery.cjs')

const HTTP_PORT = Number(process.env.PORT || 11111)
const DISCOVERY_PORT = Number(process.env.DISCOVERY_PORT || 32227)

function main() {
  const app = express()
  const state = createState()
  const bus = new EventEmitter()
  const logBuffer = []
  const MAX_LOGS = 500

  // wrap logger to capture logs
  const emitLog = (level, msg, meta) => {
    const entry = { ts: Date.now(), level, msg, meta }
    logBuffer.push(entry)
    if (logBuffer.length > MAX_LOGS) logBuffer.shift()
    bus.emit('log', entry)
  }
  // monkey-patch shared logger so ALL modules flow into SSE
  const original = { ...logger }
  ;['info', 'debug', 'warn', 'error'].forEach((lvl) => {
    logger[lvl] = (msg, meta) => {
      try {
        original[lvl]?.(msg, meta)
      } catch {}
      emitLog(lvl, msg, meta)
    }
  })

  app.use(cors())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  app.use('/', createAlpacaRouter(state))

  // Observe important state events for logs
  try {
    state.on('clientConnectionChanged', (connected, source, at) => {
      logger.info('Client connection changed', { connected, source, at })
    })
    state.on('safeChanged', (isSafe, reason, at) => {
      logger.info('Safety state changed', { isSafe, reason, at })
    })
    state.on('healthChanged', (health) => {
      logger.warn('Health changed', { health })
    })
  } catch {}

  // Admin: status
  app.get('/admin/status', (req, res) => {
    res.json({
      httpPort: HTTP_PORT,
      discoveryPort: DISCOVERY_PORT,
      connected: state.getConnected(),
      isSafe: state.getIsSafe(),
      clientConnected: state.getClientConnected(),
      lastClientSeen: state.getLastClientSeen(),
      // legacy alias to not break older UI
      lastClient: state.getLastClientSeen(),
      uptimeSec: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
    })
  })

  // Admin: logs (recent)
  app.get('/admin/logs', (req, res) => {
    const n = Math.max(0, Math.min(1000, Number(req.query.n || 200)))
    res.json(logBuffer.slice(-n))
  })

  // Admin: logs stream (SSE)
  app.get('/admin/logs/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.write(`event: hello\n`)
    res.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`)

    const onLog = (entry) => {
      res.write(`event: log\n`)
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    }
    bus.on('log', onLog)
    req.on('close', () => bus.off('log', onLog))
  })

  // Admin: set safety state
  app.post('/admin/safe', (req, res) => {
    const body = req.body || {}
    let safe = body.safe
    const reason = typeof body.reason === 'string' ? body.reason : 'admin'
    // accept string/number booleans
    if (typeof safe === 'string') safe = safe.trim().toLowerCase()
    const truthy = safe === true || safe === 1 || safe === '1' || safe === 'true'
    const falsy = safe === false || safe === 0 || safe === '0' || safe === 'false'
    if (!truthy && !falsy) return res.status(400).json({ ok: false, error: 'safe must be boolean' })
    state.setSafe(!!truthy, reason)
    logger.info('Safety set via admin', { isSafe: state.getIsSafe(), reason })
    res.json({ ok: true, isSafe: state.getIsSafe() })
  })

  // Admin: shutdown
  app.post('/admin/shutdown', (req, res) => {
    res.json({ ok: true })
    setTimeout(() => {
      logger.info('Shutdown requested via /admin/shutdown')
      server.close(() => process.exit(0))
    }, 50)
  })

  const server = app.listen(HTTP_PORT, () => {
    logger.info('HTTP server listening', { port: HTTP_PORT })
  })

  const udp = startDiscovery({ httpPort: HTTP_PORT, discoveryPort: DISCOVERY_PORT })
  logger.info('Discovery started', { discoveryPort: DISCOVERY_PORT })

  const shutdown = () => {
    logger.info('Shutting down...')
    server.close(() => process.exit(0))
    try {
      udp?.close?.()
    } catch {}
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

if (require.main === module) {
  main()
}

module.exports = { main }
