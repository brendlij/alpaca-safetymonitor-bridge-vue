const express = require('express')
const { spawn } = require('child_process')
const path = require('path')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

let serverProcess = null
let isStarting = false
let isShuttingDown = false

const WRAPPER_PORT = 3001
const SERVER_SCRIPT = path.join(__dirname, 'server', 'index.cjs')

function logWithTimestamp(message) {
  console.log(`[${new Date().toISOString()}] [WRAPPER] ${message}`)
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
      logWithTimestamp(`Server process exited with code ${code}`)
      serverProcess = null
      isStarting = false
      isShuttingDown = false
    })

    serverProcess.on('error', (err) => {
      logWithTimestamp(`Failed to start server process: ${err.message}`)
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
    logWithTimestamp('Restart requested')
    await stopServerProcess()
    // Wait a moment before starting
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const result = await startServerProcess()
    res.json({
      success: true,
      message: 'Server restarted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Start the wrapper server
app.listen(WRAPPER_PORT, () => {
  logWithTimestamp(`Wrapper server listening on port ${WRAPPER_PORT}`)

  // Auto-start the main server on wrapper startup
  logWithTimestamp('Auto-starting main server...')
  startServerProcess().catch((err) => {
    logWithTimestamp(`Failed to auto-start server: ${err.message}`)
  })
})

// Graceful shutdown of wrapper
process.on('SIGINT', async () => {
  logWithTimestamp('Wrapper shutting down...')
  if (serverProcess) {
    await stopServerProcess()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logWithTimestamp('Wrapper shutting down...')
  if (serverProcess) {
    await stopServerProcess()
  }
  process.exit(0)
})
