<template>
  <section class="manager">
    <header class="row">
      <h1>Server Manager</h1>
      <div class="actions">
        <button @click="refreshStatus">Refresh</button>
        <button class="danger" @click="shutdown">Shutdown</button>
      </div>
    </header>

    <div class="stats">
      <div><strong>HTTP Port</strong>: {{ status?.httpPort ?? '—' }}</div>
      <div><strong>Discovery Port</strong>: {{ status?.discoveryPort ?? '—' }}</div>
      <div><strong>Connected</strong>: {{ status?.connected ? 'Yes' : 'No' }}</div>
      <div><strong>Is Safe</strong>: {{ status?.isSafe ? 'Yes' : 'No' }}</div>
      <div>
        <strong>Client Connected</strong>: {{ (status as any)?.clientConnected ? 'Yes' : 'No' }}
      </div>
      <div><strong>Last Client Seen</strong>: {{ (status as any)?.lastClientSeen ?? '—' }}</div>
      <div><strong>Uptime</strong>: {{ status ? formatUptime(status.uptimeSec) : '—' }}</div>
    </div>

    <div class="card">
      <h2>Safety Control</h2>
      <div class="row">
        <input class="reason" v-model="safeReason" placeholder="Reason (optional)" />
        <button @click="setSafe(true)">Set SAFE</button>
        <button class="danger" @click="setSafe(false)">Set UNSAFE</button>
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

type Status = {
  httpPort: number
  discoveryPort: number
  connected: boolean
  isSafe: boolean
  lastClient?: string | null
  uptimeSec: number
}

type LogEntry = {
  ts: number
  level: 'info' | 'debug' | 'warn' | 'error'
  msg: string
  meta?: unknown
}

const status = ref<Status | null>(null)
const logs = ref<LogEntry[]>([])
const logPanelRef = ref<HTMLElement | null>(null)
let es: EventSource | null = null
const safeReason = ref('')

function apiBase() {
  // same origin in dev (vite proxy can be added later if needed)
  return ''
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

function shutdown() {
  fetch(`${apiBase()}/admin/shutdown`, { method: 'POST' })
}

async function setSafe(val: boolean) {
  try {
    const res = await fetch(`${apiBase()}/admin/safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ safe: val, reason: safeReason.value || undefined }),
    })
    if (!res.ok) throw new Error(await res.text())
    await refreshStatus()
  } catch {
    try {
      const q = new URLSearchParams({ safe: String(val), reason: safeReason.value || '' })
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
  await refreshStatus()
  await loadRecentLogs()
  subscribeLogs()
})

onBeforeUnmount(() => {
  es?.close()
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
</style>
