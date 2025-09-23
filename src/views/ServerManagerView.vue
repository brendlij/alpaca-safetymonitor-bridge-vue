<template>
  <section class="manager">
    <header class="row">
      <h1>Server Manager</h1>
      <div class="actions">
        <button @click="refreshStatus">Refresh</button>
        <button
          @click="toggleMqtt"
          :class="{ active: mqttConnected }"
          :disabled="!config?.mqtt?.enabled"
        >
          {{ mqttConnected ? 'MQTT Connected' : 'Connect MQTT' }}
        </button>
        <button class="danger" @click="shutdown">Shutdown</button>
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
      <h2>Safety Control</h2>
      <div class="row">
        <input class="reason" v-model="safeReason" placeholder="Reason (optional)" />
        <button @click="setSafe(true)">Set SAFE</button>
        <button class="danger" @click="setSafe(false)">Set UNSAFE</button>
        <button @click="setSafe(true, 'MQTT command')" :disabled="!mqttConnected">
          Set SAFE via MQTT
        </button>
        <button class="danger" @click="setSafe(false, 'MQTT command')" :disabled="!mqttConnected">
          Set UNSAFE via MQTT
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
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'

type Status = {
  httpPort: number
  discoveryPort: number
  connected: boolean
  isSafe: boolean
  lastClient?: string | null
  uptimeSec: number
  clientConnected?: boolean
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
  return mqttStatus.connected ? `Connected (${mqttStatus.messageCount} msgs)` : 'Disconnected'
})

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

async function connectMqtt() {
  try {
    const res = await fetch(`${apiBase()}/admin/mqtt/connect`, { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
    addLog('info', 'MQTT connection requested')
  } catch (error) {
    addLog('error', `Failed to connect MQTT: ${error}`)
  }
}

function disconnectMqtt() {
  fetch(`${apiBase()}/admin/mqtt/disconnect`, { method: 'POST' })
    .then(() => addLog('info', 'MQTT disconnection requested'))
    .catch((error) => addLog('error', `Failed to disconnect MQTT: ${error}`))
}

function toggleMqtt() {
  if (mqttConnected.value) {
    disconnectMqtt()
  } else {
    connectMqtt()
  }
}

function shutdown() {
  fetch(`${apiBase()}/admin/shutdown`, { method: 'POST' })
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

function addLog(level: LogEntry['level'], msg: string) {
  logs.value.push({
    ts: Date.now(),
    level,
    msg,
    meta: undefined,
  })
  if (logs.value.length > 1000) logs.value.shift()
  nextTick(() => scrollLogsToBottom())
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
})

// MQTT status publishing is now handled server-side

onBeforeUnmount(() => {
  es?.close()
  disconnectMqtt()
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
  background: #2a2b2d;
  color: #cbd5e1;
  border: 1px solid #3a3b3e;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}
button:hover {
  background: #34363a;
}
button.danger {
  border-color: #6b1c1c;
  background: #4a1b1b;
}
button.danger:hover {
  background: #5a1f1f;
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
  border-radius: 8px;
  padding: 12px;
}
.card h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.reason {
  flex: 1;
  min-width: 200px;
  background: #0f1011;
  color: #cbd5e1;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 8px 10px;
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
</style>
