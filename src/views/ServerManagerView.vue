<template>
  <section class="manager">
    <header class="row">
      <h1>Server Manager</h1>
      <div class="actions">
        <button @click="refreshStatus" class="btn-refresh">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"
            />
          </svg>
          Refresh
        </button>
      </div>
    </header>

    <div class="stats">
      <div>
        <strong>HTTP Port</strong>: {{ config?.server?.httpPort ?? status?.httpPort ?? '—' }}
      </div>
      <div>
        <strong>Discovery Port</strong>:
        {{ config?.server?.discoveryPort ?? status?.discoveryPort ?? '—' }}
      </div>
      <div><strong>Connected</strong>: {{ status?.connected ? 'Yes' : 'No' }}</div>
      <div><strong>Is Safe</strong>: {{ status?.isSafe ? 'Yes' : 'No' }}</div>
      <div><strong>Client Connected</strong>: {{ status?.clientConnected ? 'Yes' : 'No' }}</div>
      <div><strong>Last Client Seen</strong>: {{ status?.lastClient ?? '—' }}</div>
      <div><strong>Uptime</strong>: {{ status ? formatUptime(status.uptimeSec) : '—' }}</div>
      <div><strong>MQTT Status</strong>: {{ mqttStatusText }}</div>
    </div>

    <div class="card">
      <h2>Server Control</h2>
      <div class="server-info">
        <div class="info-item">
          <span class="label">Status:</span>
          <span :class="{ 'status-running': status, 'status-stopped': !status }">
            {{ status ? 'Running' : 'Stopped' }}
          </span>
        </div>
        <div class="info-item" v-if="status">
          <span class="label">Process uptime:</span>
          <span>{{ status ? formatUptime(status.uptimeSec) : '—' }}</span>
        </div>
      </div>
      <div class="control-actions">
        <button @click="startServer" :disabled="starting || !!status" class="btn-start">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
          </svg>
          {{ starting ? 'Starting...' : 'Start Services' }}
        </button>
        <div class="button-hint" v-if="!status && !config">
          <small
            >⚠️ Server process is not running. Use the Start Services button above or run:
            <code>npm run dev:all</code></small
          >
        </div>
        <button @click="showRestartConfirm" :disabled="!status || restarting" class="btn-restart">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"
            />
          </svg>
          {{ restarting ? 'Restarting...' : 'Restart Server' }}
        </button>
        <button @click="showShutdownConfirm" :disabled="!status" class="btn-shutdown">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13"
            />
          </svg>
          Shutdown Server
        </button>
      </div>
    </div>

    <div class="card" :class="{ disabled: !status }">
      <h2>Safety Control</h2>
      <div class="row">
        <input
          class="reason"
          v-model="safeReason"
          placeholder="Reason (optional)"
          :disabled="!status"
        />
        <button @click="setSafe(true)" :disabled="!status" class="btn-safe">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"
            />
          </svg>
          Set SAFE
        </button>
        <button @click="setSafe(false)" :disabled="!status" class="btn-unsafe">
          <svg class="icon" viewBox="0 0 24 24">
            <path
              d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M15.59,16L12,12.41L8.41,16L7,14.59L10.59,11L7,7.41L8.41,6L12,9.59L15.59,6L17,7.41L13.41,11L17,14.59L15.59,16Z"
            />
          </svg>
          Set UNSAFE
        </button>
      </div>
    </div>

    <!-- MQTT Topics Display -->
    <div class="card" v-if="config?.mqtt?.enabled">
      <h2>MQTT Topics</h2>
      <div class="mqtt-topics">
        <div class="topic-row">
          <span class="topic">{{ config.mqtt.baseTopic }}/status</span>
          <span class="desc">Server status (JSON)</span>
        </div>
        <div class="topic-row">
          <span class="topic">{{ config.mqtt.baseTopic }}/safe</span>
          <span class="desc">Safety state (true/false)</span>
        </div>
        <div class="topic-row">
          <span class="topic">{{ config.mqtt.baseTopic }}/client</span>
          <span class="desc">Client connection state</span>
        </div>
        <div class="topic-row">
          <span class="topic">{{ config.mqtt.baseTopic }}/command/safe</span>
          <span class="desc">Command topic for safety control</span>
        </div>
      </div>
      <div class="mqtt-status">
        <span :class="{ connected: mqttConnected, disconnected: !mqttConnected }">
          {{ mqttConnected ? '● Connected' : '○ Disconnected' }}
        </span>
        <span>Messages: {{ mqttMessageCount }}</span>
      </div>
    </div>

    <h2>Logs</h2>
    <div class="log-panel" ref="logPanelRef">
      <div
        v-for="entry in logs"
        :key="entry.ts + '-' + entry.level"
        class="log-entry"
        :class="entry.level"
      >
        <span class="ts">{{ formatTs(entry.ts) }}</span>
        <span class="lvl">{{ entry.level.toUpperCase() }}</span>
        <span class="msg">{{ entry.msg }}</span>
      </div>
    </div>

    <!-- Confirm Modals -->
    <ConfirmModal
      :show="showRestartModal"
      title="Restart Server"
      message="Are you sure you want to restart the server? This will temporarily disconnect all clients and interrupt any ongoing operations."
      confirm-text="Restart"
      type="warning"
      @confirm="confirmRestart"
      @cancel="showRestartModal = false"
    />

    <ConfirmModal
      :show="showShutdownModal"
      title="Shutdown Server"
      message="Are you sure you want to shutdown the server? This will stop the application completely and disconnect all clients."
      confirm-text="Shutdown"
      type="danger"
      @confirm="confirmShutdown"
      @cancel="showShutdownModal = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'

type Status = {
  httpPort: number
  discoveryPort: number
  connected: boolean
  isSafe: boolean
  lastClient?: string | null
  uptimeSec: number
  clientConnected?: boolean
  serverStartTime?: number
  mqtt?: {
    connected: boolean
    messageCount: number
    config?: {
      enabled: boolean
      host: string
      port: number
      baseTopic: string
      clientId: string
    }
  }
}

type LogEntry = {
  ts: number
  level: 'info' | 'debug' | 'warn' | 'error'
  msg: string
  meta?: unknown
}

// MQTT client is now server-side

type Config = {
  server: {
    httpPort: number
    discoveryPort: number
  }
  mqtt: {
    enabled: boolean
    autoConnect: boolean
    host: string
    port: number
    username: string
    password: string
    baseTopic: string
    clientId: string
  }
  logging: {
    level: string
    maxLogEntries: number
  }
}

const status = ref<Status | null>(null)
const logs = ref<LogEntry[]>([])
const logPanelRef = ref<HTMLElement | null>(null)
const config = ref<Config | null>(null)
let es: EventSource | null = null
const safeReason = ref('')
const restarting = ref(false)
const starting = ref(false)

// Modal states
const showRestartModal = ref(false)
const showShutdownModal = ref(false)

// MQTT state (now computed from server status)
const mqttConnected = computed(() => {
  return status.value?.mqtt?.connected || false
})
const mqttMessageCount = computed(() => {
  return status.value?.mqtt?.messageCount || 0
})

const mqttStatusText = computed(() => {
  if (!config.value?.mqtt?.enabled) return 'Disabled'
  const mqttStatus = status.value?.mqtt
  if (!mqttStatus) return 'Unknown'

  const autoConnectText = config.value?.mqtt?.autoConnect ? ' (Auto-connect)' : ''
  return mqttStatus.connected
    ? `Connected (${mqttStatus.messageCount} msgs)${autoConnectText}`
    : `Disconnected${autoConnectText}`
})

const startServer = async () => {
  starting.value = true
  try {
    const response = await fetch('/wrapper/start', {
      method: 'POST',
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        // Wait a bit and then refresh status to see if server started
        setTimeout(() => {
          refreshStatus()
        }, 2000)
      } else {
        console.error('Failed to start server:', result.error)
        alert(`Failed to start server: ${result.error}`)
      }
    } else {
      console.error('Failed to start server')
      alert('Failed to start server. Please check the logs.')
    }
  } catch (error) {
    console.error('Error starting server:', error)
    alert('Cannot connect to wrapper server. Please make sure you started with: npm run dev:all')
  } finally {
    starting.value = false
  }
}

function apiBase() {
  // same origin in dev (vite proxy can be added later if needed)
  return ''
}

async function loadConfig() {
  try {
    const res = await fetch(`${apiBase()}/admin/config`)
    if (!res.ok) throw new Error(String(res.status))
    config.value = await res.json()
  } catch {}
}

async function refreshStatus() {
  try {
    const res = await fetch(`${apiBase()}/admin/status`)
    if (!res.ok) throw new Error(String(res.status))
    status.value = await res.json()
  } catch {}
}

async function loadRecentLogs() {
  const res = await fetch(`${apiBase()}/admin/logs?n=200`)
  logs.value = await res.json()
  await nextTick()
  scrollLogsToBottom()
}

function subscribeLogs() {
  es = new EventSource(`${apiBase()}/admin/logs/stream`)
  es.addEventListener('log', async (ev) => {
    try {
      const entry = JSON.parse((ev as MessageEvent).data) as LogEntry
      logs.value.push(entry)
      if (logs.value.length > 1000) logs.value.shift()
      if (
        entry.msg === 'Client connection changed' ||
        entry.msg === 'Safety state changed' ||
        entry.msg === 'Safety set via admin'
      ) {
        refreshStatus()
      }
      await nextTick()
      scrollLogsToBottom()
    } catch {}
  })
  es.addEventListener('error', () => {
    es?.close()
    setTimeout(subscribeLogs, 1500)
  })
}

// Live status updates
let statusInterval: number | null = null

function startStatusPolling() {
  // Poll status every 2 seconds for live updates
  statusInterval = setInterval(refreshStatus, 2000)
}

function stopStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval)
    statusInterval = null
  }
}

// Modal handlers
function showRestartConfirm() {
  showRestartModal.value = true
}

function showShutdownConfirm() {
  showShutdownModal.value = true
}

function confirmShutdown() {
  showShutdownModal.value = false
  shutdown()
}

function confirmRestart() {
  showRestartModal.value = false
  restartServer()
}

async function shutdown() {
  try {
    // Stop polling and close event source before shutdown
    stopStatusPolling()
    if (es) {
      es.close()
      es = null
    }

    const response = await fetch('/wrapper/stop', { method: 'POST' })

    if (response.ok) {
      // Clear status immediately since server will be down
      status.value = null
      logs.value = []
    } else {
      console.error('Failed to stop server via wrapper')
      // Still clear status as server might be down
      status.value = null
      logs.value = []
    }
  } catch (error) {
    console.error('Error during shutdown:', error)
    // Still clear status as server is likely down
    status.value = null
    logs.value = []
  }
}

async function restartServer() {
  if (restarting.value) return

  // Confirm restart action
  if (
    !confirm(
      'Are you sure you want to restart the server? This will temporarily disconnect all clients.',
    )
  ) {
    return
  }

  restarting.value = true

  try {
    // Stop current polling and close event source
    stopStatusPolling()
    if (es) {
      es.close()
      es = null
    }

    // Send restart request to wrapper
    const response = await fetch('/wrapper/restart', { method: 'POST' })

    if (!response.ok) {
      throw new Error(`Failed to restart server: ${response.status}`)
    }

    // Wait for server to shut down and restart
    let attempts = 0
    const maxAttempts = 30 // 30 seconds timeout
    const initialStartTime = status.value?.serverStartTime || Date.now()

    const checkServerRestart = async () => {
      try {
        const newStatus = await fetch(`${apiBase()}/admin/status`)
        if (newStatus.ok) {
          const statusData = await newStatus.json()

          // Check if server has actually restarted by comparing start times or uptime
          const hasRestarted =
            statusData.uptimeSec < 10 || // New server with low uptime
            statusData.serverStartTime > initialStartTime // New start time

          if (hasRestarted) {
            // Server has restarted successfully
            status.value = statusData
            await loadConfig()
            restarting.value = false

            // Restart log streaming and status polling
            subscribeLogs()
            startStatusPolling()
            return
          }
        }

        // Server not ready yet, try again
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkServerRestart, 1000)
        } else {
          // Timeout - assume restart failed
          restarting.value = false
          console.error('Server restart timeout - server may not have restarted properly')

          // Try to reconnect anyway
          try {
            await refreshStatus()
            await loadConfig()
            subscribeLogs()
            startStatusPolling()
          } catch {
            // Final fallback
          }
        }
      } catch (error) {
        // Connection failed, server likely still restarting
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkServerRestart, 1000)
        } else {
          restarting.value = false
          console.error('Failed to detect server restart:', error)
        }
      }
    }

    // Start checking for restart after a brief delay
    setTimeout(checkServerRestart, 1000)
  } catch (error) {
    restarting.value = false
    console.error('Failed to initiate server restart:', error)

    // Try to restore connections
    subscribeLogs()
    startStatusPolling()
  }
}

async function setSafe(val: boolean, customReason?: string) {
  const reason = customReason || safeReason.value || undefined

  try {
    const res = await fetch(`${apiBase()}/admin/safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ safe: val, reason }),
    })
    if (!res.ok) throw new Error(await res.text())
    await refreshStatus()
  } catch {
    try {
      const q = new URLSearchParams({ safe: String(val), reason: reason || '' })
      await fetch(`${apiBase()}/admin/safe?${q.toString()}`, { method: 'POST' })
      await refreshStatus()
    } catch {}
  }
}

function formatTs(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString()
}

function formatUptime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${h}h ${m}m ${s}s`
}

function scrollLogsToBottom() {
  const el = logPanelRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

onMounted(async () => {
  await loadConfig()
  await refreshStatus()
  await loadRecentLogs()
  subscribeLogs()
  startStatusPolling()
})

onBeforeUnmount(() => {
  es?.close()
  stopStatusPolling()
})
</script>

<style scoped>
.manager {
  padding: 16px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #2a2b2d;
  color: #cbd5e1;
  border: 1px solid #3a3b3e;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

button:hover:not(:disabled) {
  background: #34363a;
  border-color: #4b5563;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* Specific button styles */
.btn-refresh {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

.btn-refresh:hover:not(:disabled) {
  background: #334155;
  border-color: #475569;
}

.btn-start {
  background: #10b981;
  border-color: #059669;
  color: white;
  font-weight: 600;
}

.btn-start:hover:not(:disabled) {
  background: #059669;
  border-color: #047857;
}

.btn-start:disabled {
  background: #064e3b;
  border-color: #065f46;
  color: #6ee7b7;
}

.btn-restart {
  background: #f59e0b;
  border-color: #d97706;
  color: #1f2937;
  font-weight: 600;
}

.btn-restart:hover:not(:disabled) {
  background: #d97706;
  border-color: #b45309;
}

.btn-restart:disabled {
  background: #451a03;
  border-color: #78350f;
  color: #a16207;
}

.btn-shutdown {
  background: #ef4444;
  border-color: #dc2626;
  color: white;
  font-weight: 600;
}

.btn-shutdown:hover:not(:disabled) {
  background: #dc2626;
  border-color: #b91c1c;
}

.btn-shutdown:disabled {
  background: #7f1d1d;
  border-color: #991b1b;
  color: #fca5a5;
}

.btn-safe {
  background: #10b981;
  border-color: #059669;
  color: white;
  font-weight: 600;
}

.btn-safe:hover:not(:disabled) {
  background: #059669;
  border-color: #047857;
}

.btn-unsafe {
  background: #ef4444;
  border-color: #dc2626;
  color: white;
  font-weight: 600;
}

.btn-unsafe:hover:not(:disabled) {
  background: #dc2626;
  border-color: #b91c1c;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin: 12px 0 16px;
}

.card {
  margin: 12px 0 16px;
  background: #121314;
  border: 1px solid #2a2b2d;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.card.disabled {
  opacity: 0.6;
  background: #0f1011;
  border-color: #1f2937;
}

.card.disabled * {
  color: #6b7280 !important;
}

.card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
}
.server-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #94a3b8;
}

.status-running {
  color: #10b981;
  font-weight: 500;
}

.status-stopped {
  color: #ef4444;
  font-weight: 500;
}

.control-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reason {
  flex: 1;
  min-width: 200px;
  background: #0f1011;
  color: #cbd5e1;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.reason:focus {
  outline: none;
  border-color: #3b82f6;
  background: #1a1b1e;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.reason:disabled {
  background: #0a0a0b;
  border-color: #1f2937;
  color: #6b7280;
  cursor: not-allowed;
}
.stats > div {
  background: #121314;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 10px 12px;
}

.log-panel {
  height: 300px;
  overflow: auto;
  background: #0f1011;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 8px;
}
.log-entry {
  display: grid;
  grid-template-columns: 90px 70px 1fr;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 6px;
}
.log-entry:hover {
  background: #181a1c;
}
.log-entry .ts {
  color: #94a3b8;
}
.log-entry .lvl {
  color: #a78bfa;
}
.log-entry.info .lvl {
  color: #60a5fa;
}
.log-entry.warn .lvl {
  color: #f59e0b;
}
.log-entry.error .lvl {
  color: #f87171;
}

button.active {
  background: #065f46;
  border-color: #10b981;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mqtt-topics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topic-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #0f1011;
  border-radius: 4px;
}

.topic {
  font-family: monospace;
  color: #a78bfa;
}

.desc {
  color: #94a3b8;
  font-size: 14px;
}

.mqtt-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 14px;
}

.connected {
  color: #10b981;
}

.disconnected {
  color: #ef4444;
}

.button-hint {
  margin: 8px 0;
}

.button-hint small {
  color: #94a3b8;
  font-size: 12px;
}

.button-hint code {
  background: #1a1b23;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #a78bfa;
}
</style>
