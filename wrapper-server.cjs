// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express')
const { spawn } = require('child_process')
const path = require('path')
const cors = require('cors')
const { EventEmitter } = require('events')
const { wrapperLogger, setLogEmitter } = require('./wrapper-logger.cjs')

const app = express()
app.use(cors())
app.use(express.json())

const bus = new EventEmitter()
const logBuffer = []
const MAX_LOGS = 500

let serverProcess = null
let isStarting = false
let isShuttingDown = false

// Environment-based port configuration
const WEB_PORT = Number(process.env.WEB_PORT || 3001)
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Set up log emitter for wrapper logger
const emitLog = (entry) => {
  logBuffer.push(entry)
  if (logBuffer.length > MAX_LOGS) logBuffer.shift()
  bus.emit('log', entry)
}

setLogEmitter(emitLog)

function logWithTimestamp(message) {
  wrapperLogger.info(message)
}

function startServerProcess() {
  return new Promise((resolve, reject) => {
    if (serverProcess || isStarting) {
      logWithTimestamp('Server is already running or starting')
      resolve(false)
      return
    }

    isStarting = true
    logWithTimestamp('Starting server process...')

    // Change to server directory for the process
    const serverDir = path.join(__dirname, 'server')

    serverProcess = spawn('node', ['index.cjs'], {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    })

    let startupComplete = false

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(`[SERVER] ${output.trim()}`)

      // Check if server has started successfully
      if (output.includes('HTTP server listening') && !startupComplete) {
        startupComplete = true
        isStarting = false
        logWithTimestamp('Server process started successfully')
        resolve(true)
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error(`[SERVER ERROR] ${data.toString().trim()}`)
    })

    serverProcess.on('close', (code) => {
      if (code === 0) {
        wrapperLogger.info(`Server process exited cleanly (code ${code})`)
      } else {
        wrapperLogger.warn(`Server process exited with code ${code}`)
      }
      serverProcess = null
      isStarting = false
      isShuttingDown = false
    })

    serverProcess.on('error', (err) => {
      wrapperLogger.error(`Failed to start server process: ${err.message}`)
      serverProcess = null
      isStarting = false
      reject(err)
    })

    // Timeout if server doesn't start within 10 seconds
    setTimeout(() => {
      if (isStarting && !startupComplete) {
        logWithTimestamp('Server startup timeout')
        if (serverProcess) {
          serverProcess.kill()
          serverProcess = null
        }
        isStarting = false
        reject(new Error('Server startup timeout'))
      }
    }, 10000)
  })
}

function stopServerProcess() {
  return new Promise((resolve) => {
    if (!serverProcess || isShuttingDown) {
      logWithTimestamp('Server is not running or already shutting down')
      resolve(false)
      return
    }

    isShuttingDown = true
    logWithTimestamp('Stopping server process...')

    const timeout = setTimeout(() => {
      if (serverProcess) {
        logWithTimestamp('Force killing server process (timeout)')
        serverProcess.kill('SIGKILL')
      }
    }, 5000)

    serverProcess.on('close', () => {
      clearTimeout(timeout)
      serverProcess = null
      isShuttingDown = false
      logWithTimestamp('Server process stopped')
      resolve(true)
    })

    // Try graceful shutdown first
    serverProcess.kill('SIGTERM')
  })
}

// Wrapper log endpoints
app.get('/wrapper/logs', (req, res) => {
  const n = Math.max(0, Math.min(1000, Number(req.query.n || 200)))
  res.json(logBuffer.slice(-n))
})

app.get('/wrapper/logs/stream', (req, res) => {
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

// Wrapper API endpoints
app.get('/wrapper/status', (req, res) => {
  res.json({
    serverRunning: !!serverProcess,
    isStarting,
    isShuttingDown,
    wrapperUptime: process.uptime(),
  })
})

app.post('/wrapper/start', async (req, res) => {
  try {
    const result = await startServerProcess()
    res.json({
      success: true,
      started: result,
      message: result ? 'Server started successfully' : 'Server was already running',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.post('/wrapper/stop', async (req, res) => {
  try {
    const result = await stopServerProcess()
    res.json({
      success: true,
      stopped: result,
      message: result ? 'Server stopped successfully' : 'Server was not running',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

app.post('/wrapper/restart', async (req, res) => {
  try {
    wrapperLogger.info('Server restart requested by user')
    wrapperLogger.info('Beginning server restart sequence...')

    const stopResult = await stopServerProcess()
    if (stopResult) {
      wrapperLogger.info('Server successfully stopped for restart')
    } else {
      wrapperLogger.warn('Server was not running, proceeding with start')
    }

    // Wait a moment before starting
    wrapperLogger.debug('Waiting 1 second before starting server...')
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const startResult = await startServerProcess()
    if (startResult) {
      wrapperLogger.info('Server restart completed successfully')
    } else {
      wrapperLogger.warn('Server restart completed but server was already running')
    }

    res.json({
      success: true,
      message: 'Server restarted successfully',
    })
  } catch (error) {
    wrapperLogger.error(`Server restart failed: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Add proxy middleware for main server endpoints (before production static serving)
if (IS_PRODUCTION) {
  const { createProxyMiddleware } = require('http-proxy-middleware')

  // Proxy API requests to the main server, but exclude /api/server routes
  app.use(
    '/admin',
    createProxyMiddleware({
      target: 'http://127.0.0.1:11111',
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
    }),
  )

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:11111',
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
    }),
  )

  app.use(
    '/management',
    createProxyMiddleware({
      target: 'http://127.0.0.1:11111',
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
    }),
  )

  const distPath = path.join(__dirname, 'dist')

  // Serve static files from dist directory
  app.use(express.static(distPath))

  // Health check endpoint for Docker
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      serverRunning: !!serverProcess,
      timestamp: new Date().toISOString(),
    })
  })

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (
      req.path.startsWith('/wrapper/') ||
      req.path.startsWith('/admin/') ||
      req.path.startsWith('/api/')
    ) {
      return res.status(404).json({ error: 'API endpoint not found' })
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })

  wrapperLogger.info(`Production mode: Serving frontend from ${distPath}`)
}

// Start the wrapper server
app.listen(WEB_PORT, () => {
  wrapperLogger.info(`Wrapper server listening on port ${WEB_PORT}`)

  if (IS_PRODUCTION) {
    wrapperLogger.info('Running in production mode - serving built frontend')
  } else {
    wrapperLogger.info('Running in development mode - frontend should be served by Vite')
  }

  // Auto-start the main server on wrapper startup
  wrapperLogger.info('Auto-starting main server...')
  startServerProcess().catch((err) => {
    wrapperLogger.error(`Failed to auto-start server: ${err.message}`)
  })
})

// Graceful shutdown of wrapper
process.on('SIGINT', async () => {
  wrapperLogger.info('Wrapper received SIGINT, shutting down...')
  if (serverProcess) {
    await stopServerProcess()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  wrapperLogger.info('Wrapper received SIGTERM, shutting down...')
  if (serverProcess) {
    await stopServerProcess()
  }
  process.exit(0)
})
