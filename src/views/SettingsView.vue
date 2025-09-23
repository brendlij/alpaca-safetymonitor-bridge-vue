<template>
  <section class="settings">
    <header class="row">
      <h1>Settings</h1>
      <div class="actions">
        <button @click="loadConfig">Reload</button>
        <button
          @click="saveConfig"
          :disabled="saving"
          :class="{ 'has-changes': hasUnsavedChanges }"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </header>

    <div class="settings-grid">
      <!-- Server Configuration -->
      <div class="card">
        <h2>Server Configuration</h2>
        <div class="form-group">
          <label>HTTP Port</label>
          <input
            v-model.number="config.server.httpPort"
            type="number"
            min="1024"
            max="65535"
            placeholder="11111"
          />
        </div>
        <div class="form-group">
          <label>Discovery Port</label>
          <input
            v-model.number="config.server.discoveryPort"
            type="number"
            min="1024"
            max="65535"
            placeholder="32227"
          />
        </div>
        <div class="info">
          <small>⚠️ Server restart required for port changes to take effect</small>
        </div>
      </div>

      <!-- MQTT Configuration -->
      <div class="card">
        <div class="card-header">
          <h2>MQTT Configuration</h2>
          <div class="mqtt-status-display" v-if="config.mqtt.enabled">
            <span
              class="mqtt-status"
              :class="{ connected: mqttConnected, disconnected: !mqttConnected }"
            >
              {{ mqttConnected ? '● Connected' : '○ Disconnected' }}
            </span>
          </div>
        </div>
        <div class="form-group">
          <label class="custom-checkbox" :class="{ disabled: !serverConnected }">
            <input v-model="config.mqtt.enabled" type="checkbox" :disabled="!serverConnected" />
            <span class="checkbox-slider"></span>
            <span class="checkbox-text">Enable MQTT</span>
          </label>
        </div>
        <div class="info" v-if="config.mqtt.enabled">
          <small>✓ Auto-connect is always enabled when MQTT is enabled</small>
        </div>
        <div class="form-group" :class="{ disabled: !config.mqtt.enabled }">
          <label>MQTT Broker Host</label>
          <input
            v-model="config.mqtt.host"
            :disabled="!config.mqtt.enabled"
            placeholder="localhost"
          />
        </div>
        <div class="form-group" :class="{ disabled: !config.mqtt.enabled }">
          <label>MQTT Port</label>
          <input
            v-model.number="config.mqtt.port"
            type="number"
            min="1"
            max="65535"
            :disabled="!config.mqtt.enabled"
            placeholder="1883"
          />
        </div>
        <div class="form-group" :class="{ disabled: !config.mqtt.enabled }">
          <label>Username (optional)</label>
          <input
            v-model="config.mqtt.username"
            :disabled="!config.mqtt.enabled"
            placeholder="Leave empty if not required"
          />
        </div>
        <div class="form-group" :class="{ disabled: !config.mqtt.enabled }">
          <label>Password (optional)</label>
          <input
            v-model="config.mqtt.password"
            type="password"
            :disabled="!config.mqtt.enabled"
            placeholder="Leave empty if not required"
          />
        </div>
        <div class="form-group" :class="{ disabled: !config.mqtt.enabled }">
          <label>Base Topic</label>
          <input
            v-model="config.mqtt.baseTopic"
            :disabled="!config.mqtt.enabled"
            placeholder="alpaca/safetymonitor"
          />
        </div>
        <div class="form-group" :class="{ disabled: !config.mqtt.enabled }">
          <label>Client ID</label>
          <input
            v-model="config.mqtt.clientId"
            :disabled="!config.mqtt.enabled"
            placeholder="alpaca-safety-monitor"
          />
        </div>
      </div>

      <!-- Logging Configuration -->
      <div class="card">
        <h2>Logging Configuration</h2>
        <div class="form-group">
          <label>Log Level</label>
          <select v-model="config.logging.level">
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div class="form-group">
          <label>Max Log Entries</label>
          <input
            v-model.number="config.logging.maxLogEntries"
            type="number"
            min="100"
            max="10000"
            step="100"
            placeholder="1000"
          />
        </div>
      </div>
    </div>

    <!-- Current Configuration Display -->
    <div class="card">
      <h2>Current Configuration</h2>
      <pre class="config-preview">{{ configPreview }}</pre>
    </div>

    <!-- Status Messages -->
    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

interface Config {
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
    level: 'debug' | 'info' | 'warn' | 'error'
    maxLogEntries: number
  }
}

const config = ref<Config>({
  server: {
    httpPort: 11111,
    discoveryPort: 32227,
  },
  mqtt: {
    enabled: false,
    autoConnect: true,
    host: 'localhost',
    port: 1883,
    username: '',
    password: '',
    baseTopic: 'alpaca/safetymonitor',
    clientId: 'alpaca-safety-monitor',
  },
  logging: {
    level: 'info',
    maxLogEntries: 1000,
  },
})

const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')

// Server and MQTT status tracking
const serverConnected = ref(false)
const mqttConnected = ref(false)
let statusInterval: number | null = null

const configPreview = computed(() => {
  const configCopy = JSON.parse(JSON.stringify(config.value))
  // Hide password in preview
  if (configCopy.mqtt.password) {
    configCopy.mqtt.password = '••••••••'
  }
  return JSON.stringify(configCopy, null, 2)
})

function apiBase() {
  return ''
}

async function loadConfig() {
  try {
    const res = await fetch(`${apiBase()}/admin/config`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const loadedConfig = await res.json()
    config.value = { ...config.value, ...loadedConfig }
    configLoaded.value = true
    hasUnsavedChanges.value = false
    showMessage('Configuration loaded successfully', 'success')
  } catch (error) {
    showMessage(`Failed to load configuration: ${error}`, 'error')
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const res = await fetch(`${apiBase()}/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || `HTTP ${res.status}`)
    }

    hasUnsavedChanges.value = false
    showMessage('Configuration saved successfully', 'success')
  } catch (error) {
    showMessage(`Failed to save configuration: ${error}`, 'error')
  } finally {
    saving.value = false
  }
}

function showMessage(text: string, type: 'success' | 'error' | 'info', duration = 5000) {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, duration)
}

// Server and MQTT connection status management
async function checkMqttStatus() {
  try {
    const res = await fetch(`${apiBase()}/admin/status`)
    if (res.ok) {
      const status = await res.json()
      serverConnected.value = true
      mqttConnected.value = status?.mqtt?.connected || false
    } else {
      serverConnected.value = false
      mqttConnected.value = false
    }
  } catch {
    // Server not responding
    serverConnected.value = false
    mqttConnected.value = false
  }
}

// MQTT connection is now fully automatic - no manual controls needed

function startStatusPolling() {
  statusInterval = setInterval(checkMqttStatus, 3000)
}

function stopStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval)
    statusInterval = null
  }
}

// Track if config has been loaded to prevent auto-save on initial load
const configLoaded = ref(false)
const hasUnsavedChanges = ref(false)

// Auto-save watcher for MQTT enabled setting
watch(
  () => config.value.mqtt.enabled,
  async (newValue, oldValue) => {
    if (configLoaded.value && oldValue !== undefined && newValue !== oldValue) {
      // Always set autoConnect to true when MQTT is enabled
      config.value.mqtt.autoConnect = newValue
      await saveConfig()
      showMessage('✓ MQTT setting saved', 'success', 2000)
      hasUnsavedChanges.value = false
    } else if (configLoaded.value) {
      hasUnsavedChanges.value = true
    }
  },
)

// Watch for changes in other fields to track unsaved changes
watch(
  () => [
    config.value.server.httpPort,
    config.value.server.discoveryPort,
    config.value.mqtt.host,
    config.value.mqtt.port,
    config.value.mqtt.username,
    config.value.mqtt.password,
    config.value.mqtt.baseTopic,
    config.value.mqtt.clientId,
    config.value.logging.level,
    config.value.logging.maxLogEntries,
  ],
  () => {
    if (configLoaded.value) {
      hasUnsavedChanges.value = true
    }
  },
  { deep: true },
)

// Warning when leaving page with unsaved changes
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    return event.returnValue
  }
}

onMounted(async () => {
  await loadConfig()
  await checkMqttStatus()
  startStatusPolling()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  stopStatusPolling()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.settings {
  padding: 16px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
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

button:hover:not(:disabled) {
  background: #34363a;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.has-changes {
  background: #059669;
  border-color: #10b981;
  color: white;
}

button.has-changes:hover:not(:disabled) {
  background: #047857;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.card {
  background: #121314;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 16px;
}

.card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #cbd5e1;
}

.card-header + * {
  margin-top: 0;
}

.card-header h2 {
  margin-bottom: 0;
}

.form-group {
  margin-bottom: 12px;
}

.form-group.disabled {
  opacity: 0.5;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #cbd5e1;
}

/* Legacy checkbox styles - kept for compatibility */
.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  margin: 0;
}

input,
select {
  width: 100%;
  background: #0f1011;
  color: #cbd5e1;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
}

input:focus,
select:focus {
  outline: none;
  border-color: #3b82f6;
}

input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info {
  margin-top: 8px;
  padding: 8px;
  background: #1f2937;
  border-radius: 6px;
}

.info small {
  color: #fbbf24;
}

.config-preview {
  background: #0f1011;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
  max-height: 300px;
  font-size: 12px;
  color: #94a3b8;
}

.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.message.success {
  background: #065f46;
  border: 1px solid #10b981;
  color: #10b981;
}

.message.error {
  background: #7f1d1d;
  border: 1px solid #ef4444;
  color: #ef4444;
}

.message.info {
  background: #1e3a8a;
  border: 1px solid #3b82f6;
  color: #3b82f6;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-header h2 {
  margin: 0;
}

.mqtt-status-display {
  display: flex;
  align-items: center;
}

.mqtt-status {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.mqtt-status.connected {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.mqtt-status.disconnected {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* MQTT button styles removed - connection is now fully automatic */

/* Custom Animated Checkboxes */
.custom-checkbox {
  display: flex !important;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  position: relative;
}

.custom-checkbox input[type='checkbox'] {
  display: none;
}

.checkbox-slider {
  position: relative;
  width: 44px;
  height: 24px;
  background: #374151;
  border-radius: 12px;
  transition: all 0.3s ease;
  border: 2px solid #4b5563;
}

.checkbox-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #9ca3af;
  border-radius: 50%;
  transition: all 0.3s ease;
  transform: translateX(0);
}

.custom-checkbox input[type='checkbox']:checked + .checkbox-slider {
  background: #059669;
  border-color: #10b981;
}

.custom-checkbox input[type='checkbox']:checked + .checkbox-slider::before {
  background: #ffffff;
  transform: translateX(18px);
}

.custom-checkbox input[type='checkbox']:disabled + .checkbox-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.custom-checkbox input[type='checkbox']:disabled + .checkbox-slider::before {
  opacity: 0.7;
}

.checkbox-text {
  color: #cbd5e1;
  font-weight: 500;
}

.form-group.disabled .checkbox-text {
  opacity: 0.5;
}

/* Hover effects */
.custom-checkbox:hover input[type='checkbox']:not(:disabled) + .checkbox-slider {
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.custom-checkbox:hover input[type='checkbox']:checked:not(:disabled) + .checkbox-slider {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
</style>
