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

    <h2 style="margin-bottom: 28px">Logs</h2>
    <div class="log-tabs log-tabs-enhanced">
      <div class="tab-switcher">
        <button
          class="tab-button btn-log"
          :class="{ active: activeLogTab === 'simple' }"
          @click="activeLogTab = 'simple'"
        >
          Simple Logs
        </button>
        <button
          class="tab-button btn-log"
          :class="{ active: activeLogTab === 'detailed' }"
          @click="activeLogTab = 'detailed'"
        >
          Detailed Logs
        </button>
      </div>
      <div class="log-controls">
        <button @click="toggleExpandLogs" class="btn-log" :aria-pressed="logsExpanded">
          {{ logsExpanded ? 'Collapse' : 'Expand' }}
        </button>
      </div>
    </div>

    <!-- Simple Log View -->
    <div
      v-if="activeLogTab === 'simple'"
      class="log-panel simple-logs"
      ref="simpleLogPanelRef"
      :class="{ expanded: logsExpanded }"
      tabindex="0"
      @keydown.ctrl.a.prevent="selectAllLogs('simple')"
      @focus="logPanelFocused = 'simple'"
    >
      <div
        v-for="entry in logs"
        :key="entry.ts + '-simple'"
        class="log-entry simple"
        :class="entry.level"
      >
        <span class="ts">{{ formatTs(entry.ts) }}</span>
        <span class="lvl">{{ entry.level.toUpperCase() }}</span>
        <span class="msg">{{ formatSimpleMessage(entry) }}</span>
      </div>
    </div>

    <!-- Detailed Log View -->
    <div
      v-if="activeLogTab === 'detailed'"
      class="log-panel detailed-logs"
      ref="detailedLogPanelRef"
      :class="{ expanded: logsExpanded }"
      tabindex="0"
      @keydown.ctrl.a.prevent="selectAllLogs('detailed')"
      @focus="logPanelFocused = 'detailed'"
    >
      <div
        v-for="entry in logs"
        :key="entry.ts + '-detailed'"
        class="log-entry detailed"
        :class="entry.level"
      >
        <div class="log-header">
          <span class="ts">{{ formatTs(entry.ts) }}</span>
          <span class="lvl">{{ entry.level.toUpperCase() }}</span>
          <span
            class="log-type"
            v-if="
              typeof entry.meta === 'object' &&
              entry.meta &&
              'type' in entry.meta &&
              typeof entry.meta.type === 'string'
            "
            >{{ entry.meta.type.toUpperCase() }}</span
          >
        </div>
        <div class="log-content">
          <div class="msg">{{ entry.msg }}</div>
          <div v-if="entry.meta && hasDetailedMeta(entry.meta)" class="meta">
            <pre>{{ formatMeta(entry.meta) }}</pre>
          </div>
        </div>
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
const config = ref<Config | null>(null)
let es: EventSource | null = null
let wrapperEs: EventSource | null = null
const safeReason = ref('')
const restarting = ref(false)
const starting = ref(false)

// Log view state
const activeLogTab = ref<'simple' | 'detailed'>('simple')
const simpleLogPanelRef = ref<HTMLElement | null>(null)
const detailedLogPanelRef = ref<HTMLElement | null>(null)
const logsExpanded = ref(false)
const logPanelFocused = ref<'simple' | 'detailed' | null>(null)
function toggleExpandLogs() {
  logsExpanded.value = !logsExpanded.value
  nextTick(scrollLogsToBottom)
}

function selectAllLogs(tab: 'simple' | 'detailed') {
  const refEl = tab === 'simple' ? simpleLogPanelRef.value : detailedLogPanelRef.value
  if (!refEl) return
  // Select all text in the log panel
  const range = document.createRange()
  range.selectNodeContents(refEl)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

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
  try {
    const res = await fetch(`${apiBase()}/admin/logs?n=200`)
    if (res.ok) {
      logs.value = await res.json()
    }
  } catch {}

  // Also load wrapper logs
  try {
    const wrapperRes = await fetch('http://localhost:3001/wrapper/logs?n=200')
    if (wrapperRes.ok) {
      const wrapperLogs = await wrapperRes.json()
      // Merge wrapper logs with server logs and sort by timestamp
      logs.value = [...logs.value, ...wrapperLogs].sort((a, b) => a.ts - b.ts)
    }
  } catch {}

  await nextTick()
  scrollLogsToBottom()
}

function subscribeLogs() {
  subscribeServerLogs()
  subscribeWrapperLogs()
}

function subscribeServerLogs() {
  // Don't create if already exists
  if (es) return

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
    es = null
    setTimeout(() => {
      subscribeServerLogs()
    }, 1500)
  })
}

function subscribeWrapperLogs() {
  // Don't create if already exists
  if (wrapperEs) return

  wrapperEs = new EventSource('http://localhost:3001/wrapper/logs/stream')
  wrapperEs.addEventListener('log', async (ev) => {
    try {
      const entry = JSON.parse((ev as MessageEvent).data) as LogEntry
      logs.value.push(entry)
      if (logs.value.length > 1000) logs.value.shift()
      await nextTick()
      scrollLogsToBottom()
    } catch {}
  })
  wrapperEs.addEventListener('error', () => {
    wrapperEs?.close()
    wrapperEs = null
    setTimeout(() => {
      subscribeWrapperLogs()
    }, 1500)
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
    // Stop polling and close server event source before shutdown
    stopStatusPolling()
    if (es) {
      es.close()
      es = null
    }
    // Keep wrapper EventSource connected to see shutdown logs

    const response = await fetch('/wrapper/stop', { method: 'POST' })

    if (response.ok) {
      // Clear status immediately since server will be down
      status.value = null
      // Don't clear logs - wrapper logs should persist
    } else {
      console.error('Failed to stop server via wrapper')
      // Still clear status as server might be down
      status.value = null
      // Don't clear logs - wrapper logs should persist
    }
  } catch (error) {
    console.error('Error during shutdown:', error)
    // Still clear status as server is likely down
    status.value = null
    // Don't clear logs - wrapper logs should persist
  }
}

async function restartServer() {
  if (restarting.value) return

  restarting.value = true

  try {
    // Stop current polling and close main server event source
    stopStatusPolling()
    if (es) {
      es.close()
      es = null
    }
    // Keep wrapper EventSource connected during restart to see restart logs

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

            // Restart server log streaming and status polling
            subscribeServerLogs()
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
    subscribeServerLogs()
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

// Format simple message for readability
function formatSimpleMessage(entry: LogEntry): string {
  // For MQTT messages, make them more readable
  if (entry.msg.includes('MQTT message received')) {
    const match = entry.msg.match(/MQTT message received: (.+) = (.+)/)
    if (match) {
      return `MQTT: ${match[1]} → ${match[2]}`
    }
  }

  // For safety commands, make them cleaner
  if (entry.msg.includes('Processing') && entry.msg.includes('safety command')) {
    const match = entry.msg.match(/Processing.*safety command: (.+)/)
    if (match) {
      return `Safety command: ${match[1]}`
    }
  }

  // Remove redundant prefixes for cleaner display
  return entry.msg
    .replace(/^MQTT /, '')
    .replace(/^Server /, '')
    .replace(/^Client /, '')
    .replace(/^Safety /, '')
}

// Check if metadata has detailed information worth showing
function hasDetailedMeta(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return false

  // Skip simple string meta
  if (typeof meta === 'string') return false

  // Check if it has structured data
  const keys = Object.keys(meta as Record<string, unknown>)
  return keys.length > 0 && keys.some((key) => key !== 'type')
}

// Format metadata for detailed view
function formatMeta(meta: unknown): string {
  if (!meta) return ''

  // Clone and remove type field for cleaner display
  const cleanMeta = { ...(meta as Record<string, unknown>) }
  delete cleanMeta.type

  // If empty after removing type, don't show anything
  if (Object.keys(cleanMeta).length === 0) return ''

  return JSON.stringify(cleanMeta, null, 2)
}

function scrollLogsToBottom() {
  const el = activeLogTab.value === 'simple' ? simpleLogPanelRef.value : detailedLogPanelRef.value
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
  wrapperEs?.close()
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

/* Log Tabs */
.log-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid #2a2b2d;
  padding-bottom: 8px;
  margin-top: 24px;
}

.log-tabs-enhanced {
  flex-wrap: wrap;
  gap: 18px;
}
.tab-switcher {
  display: flex;
  gap: 0;
  background: transparent;
  border-radius: 8px;
  overflow: hidden;
  border: none;
}
.btn-log {
  background: #4a5568;
  border: none;
  color: #cbd5e1;
  border-radius: 0;
  font-weight: 500;
  padding: 8px 20px;
  transition:
    background 0.2s,
    color 0.2s;
  box-shadow: none;
}
.btn-log.active,
.tab-button.active {
  background: #6b7280;
  color: #fff;
  border-bottom: none;
  z-index: 1;
}
.btn-log:not(.active):hover {
  background: #5a6570;
  color: #fff;
}
.log-hint {
  font-size: 12px;
  color: #64748b;
  margin-left: 8px;
}

.tab-button {
  background: #4a5568;
  border: none;
  color: #cbd5e1;
  padding: 8px 16px;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: none;
  outline: none;
  transition:
    background 0.3s ease,
    color 0.3s ease;
}

.tab-button:hover {
  background: #5a6570;
  border: none;
}

.tab-button.active {
  background: #6b7280;
  color: white;
  border: none;
  box-shadow: none;
  outline: none;
}

.log-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-clear-logs {
  background: #374151;
  border: 1px solid #4b5563;
  color: #d1d5db;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-logs:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.log-count {
  font-size: 12px;
  color: #9ca3af;
}

/* Log Panels */
.log-panel {
  height: 300px;
  overflow: auto;
  background: #0f1011;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 8px;
  outline: none;
  transition: height 0.2s;
}
.log-panel.expanded {
  height: 70vh;
  min-height: 400px;
  max-height: 80vh;
}

/* Simple Log Entry */
.log-entry.simple {
  display: grid;
  grid-template-columns: 90px 70px 1fr;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 6px;
}

.log-entry.simple:hover {
  background: #181a1c;
}

/* Detailed Log Entry */
.log-entry.detailed {
  padding: 8px;
  margin-bottom: 6px;
  border: 1px solid #2a2b2d;
  border-radius: 6px;
  background: #12141a;
}

.log-entry.detailed:hover {
  border-color: #3a3b3d;
}

.log-entry.detailed .log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.log-entry.detailed .log-type {
  background: #374151;
  color: #9ca3af;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.log-entry.detailed .log-content {
  padding-left: 4px;
}

.log-entry.detailed .msg {
  margin-bottom: 6px;
  color: #e5e7eb;
}

.log-entry.detailed .meta {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 4px;
  padding: 8px;
  margin-top: 6px;
}

.log-entry.detailed .meta pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  color: #7dd3fc;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Common log entry styles for both views */
.log-entry .ts {
  color: #94a3b8;
  font-size: 12px;
}

.log-entry .lvl {
  color: #a78bfa;
  font-weight: 600;
  font-size: 12px;
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

/* Level-specific colors for detailed view type badges */
.log-entry.info.detailed .log-type {
  background: #1e3a8a;
  color: #93c5fd;
}

.log-entry.warn.detailed .log-type {
  background: #92400e;
  color: #fbbf24;
}

.log-entry.error.detailed .log-type {
  background: #991b1b;
  color: #fca5a5;
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
