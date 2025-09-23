<template>
  <section class="settings">
    <header class="row">
      <h1>Settings</h1>
      <div class="actions">
        <button @click="loadConfig">Reload</button>
        <button @click="saveConfig" :disabled="saving">
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
        <h2>MQTT Configuration</h2>
        <div class="form-group">
          <label class="checkbox-label">
            <input v-model="config.mqtt.enabled" type="checkbox" />
            Enable MQTT
          </label>
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
import { ref, computed, onMounted } from 'vue'

interface Config {
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

    showMessage('Configuration saved successfully', 'success')
  } catch (error) {
    showMessage(`Failed to save configuration: ${error}`, 'error')
  } finally {
    saving.value = false
  }
}

function showMessage(text: string, type: 'success' | 'error' | 'info') {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 5000)
}

onMounted(() => {
  loadConfig()
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
</style>
