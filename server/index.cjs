const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { EventEmitter } = require('events')
const { logger } = require('./logger.cjs')
const { createAlpacaRouter } = require('./alpaca.cjs')
const { createState } = require('./state.cjs')
const { startDiscovery } = require('./discovery.cjs')
const { loadConfig, saveConfig, getConfig } = require('./config.cjs')
const { MqttManager } = require('./mqtt.cjs')

// Load configuration
const config = loadConfig()
const HTTP_PORT = Number(process.env.PORT || config.server.httpPort)
const DISCOVERY_PORT = Number(process.env.DISCOVERY_PORT || config.server.discoveryPort)

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

  // Initialize MQTT manager
  const mqttManager = new MqttManager(logger)

  // MQTT event handlers
  mqttManager.on('connected', () => {
    emitLog('info', 'MQTT connected')
  })

  mqttManager.on('disconnected', () => {
    emitLog('warn', 'MQTT disconnected')
  })

  mqttManager.on('error', (error) => {
    emitLog('error', `MQTT error: ${error.message}`)
  })

  mqttManager.on('message', (topic, message) => {
    emitLog('info', `MQTT message received: ${topic} = ${message}`)

    // Handle safety commands
    if (topic.endsWith('/command/safe')) {
      // First try simple boolean strings
      if (message === 'true' || message === 'false') {
        emitLog('info', `Processing simple MQTT safety command: ${message}`)
        state.setSafe(message === 'true', 'MQTT command')
        return
      }

      // Then try JSON parsing
      try {
        const data = JSON.parse(message)

        // Check if it's a simple boolean value
        if (typeof data === 'boolean') {
          emitLog('info', `Processing JSON boolean MQTT safety command: ${data}`)
          state.setSafe(data, 'MQTT command')
          return
        }

        // Check if it's an object with safe property
        if (typeof data === 'object' && typeof data.safe === 'boolean') {
          emitLog(
            'info',
            `Processing MQTT safety command: safe=${data.safe}, reason="${data.reason || 'MQTT command'}"`,
          )
          state.setSafe(data.safe, data.reason || 'MQTT command')
          return
        }

        emitLog(
          'warn',
          `Invalid MQTT command format. Expected boolean, "true"/"false", or {safe: boolean, reason?: string}. Got: ${message}`,
        )
      } catch (parseError) {
        emitLog(
          'error',
          `Failed to parse MQTT command: ${parseError.message}. Message: "${message}"`,
        )
      }
    }
  })
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
      // Publish status to MQTT
      if (mqttManager.isConnected()) {
        mqttManager.publishStatus({
          connected: state.getConnected(),
          isSafe: state.getIsSafe(),
          clientConnected: connected,
          uptimeSec: Math.floor(process.uptime()),
        })
      }
    })
    state.on('safeChanged', (isSafe, reason, at) => {
      logger.info('Safety state changed', { isSafe, reason, at })
      // Publish status to MQTT
      if (mqttManager.isConnected()) {
        mqttManager.publishStatus({
          connected: state.getConnected(),
          isSafe: isSafe,
          clientConnected: state.getClientConnected ? state.getClientConnected() : false,
          uptimeSec: Math.floor(process.uptime()),
        })
      }
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
      lastClient: state.getLastClientSeen(),
      uptimeSec: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      clientConnected: state.getClientConnected ? state.getClientConnected() : false,
      mqtt: mqttManager.getStatus(),
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

  // Admin: get configuration
  app.get('/admin/config', (req, res) => {
    res.json(getConfig())
  })

  // Admin: save configuration
  app.post('/admin/config', (req, res) => {
    try {
      const success = saveConfig(req.body)
      if (success) {
        logger.info('Configuration updated via admin')

        // Reconnect MQTT with new config
        const newConfig = getConfig()
        mqttManager.connect(newConfig.mqtt)

        res.json({ ok: true, message: 'Configuration saved successfully' })
      } else {
        res.status(500).json({ ok: false, error: 'Failed to save configuration' })
      }
    } catch (error) {
      logger.error('Configuration save error', { error: error.message })
      res.status(400).json({ ok: false, error: error.message })
    }
  })

  // Admin: MQTT control
  app.post('/admin/mqtt/connect', (req, res) => {
    try {
      const currentConfig = getConfig()
      mqttManager.connect(currentConfig.mqtt)
      res.json({ ok: true, message: 'MQTT connection initiated' })
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message })
    }
  })

  app.post('/admin/mqtt/disconnect', (req, res) => {
    try {
      mqttManager.disconnect()
      res.json({ ok: true, message: 'MQTT disconnected' })
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message })
    }
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

  // Start MQTT connection if enabled
  if (config.mqtt.enabled) {
    setTimeout(() => {
      mqttManager.connect(config.mqtt)
    }, 1000) // Small delay to ensure server is fully started
  }

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
