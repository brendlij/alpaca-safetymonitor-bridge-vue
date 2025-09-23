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
        <div class="info" v-if="serverConfigChanged">
          <small>⚠️ Server restart required for port changes to take effect</small>
          <button @click="serverConfigChanged = false" class="btn-dismiss" title="Dismiss">
            ×
          </button>
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
      <div class="config-preview-container">
        <pre class="config-preview yaml-syntax" v-html="highlightedYaml"></pre>
      </div>
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
  return formatAsYaml(configCopy)
})

const highlightedYaml = computed(() => {
  const yamlText = configPreview.value
  return highlightYaml(yamlText)
})

function highlightYaml(yaml: string): string {
  console.log('Original YAML:', yaml)

  const highlighted = yaml
    // Highlight keys (before colon)
    .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm, '$1<span class="yaml-key">$2</span>:')
    // Highlight string values (quoted)
    .replace(/:\s*"([^"]*)"/g, ': <span class="yaml-string">"$1"</span>')
    // Highlight boolean values
    .replace(/:\s*(true|false)(?=\s*$)/gm, ': <span class="yaml-boolean">$1</span>')
    // Highlight numbers (including decimals)
    .replace(/:\s*(\d+\.?\d*)(?=\s*$)/gm, ': <span class="yaml-number">$1</span>')
    // Highlight null values
    .replace(/:\s*(null)(?=\s*$)/gm, ': <span class="yaml-null">$1</span>')
    // Highlight comments (if any)
    .replace(/(#.*$)/gm, '<span class="yaml-comment">$1</span>')

  console.log('Highlighted YAML:', highlighted)
  return highlighted
}

function formatAsYaml(obj: Record<string, unknown>, indent = 0): string {
  const spaces = '  '.repeat(indent)
  let yaml = ''

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`
      yaml += formatAsYaml(value as Record<string, unknown>, indent + 1)
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`
      value.forEach((item) => {
        if (typeof item === 'object') {
          yaml += `${spaces}  -\n`
          yaml += formatAsYaml(item as Record<string, unknown>, indent + 2)
        } else {
          yaml += `${spaces}  - ${item}\n`
        }
      })
    } else if (typeof value === 'string') {
      yaml += `${spaces}${key}: "${value}"\n`
    } else if (typeof value === 'boolean') {
      yaml += `${spaces}${key}: ${value}\n`
    } else {
      yaml += `${spaces}${key}: ${value}\n`
    }
  }

  return yaml
}

function apiBase() {
  return ''
}

async function loadConfig() {
  try {
    const res = await fetch(`${apiBase()}/admin/config`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const loadedConfig = await res.json()

    // Temporarily disable watchers during initial load
    const wasInitialLoadComplete = initialLoadComplete.value
    initialLoadComplete.value = false

    config.value = { ...config.value, ...loadedConfig }

    // Store original server configuration for comparison
    originalServerConfig.value = {
      httpPort: config.value.server.httpPort,
      discoveryPort: config.value.server.discoveryPort,
    }

    configLoaded.value = true
    hasUnsavedChanges.value = false
    // Clear the server restart warning when configuration is reloaded
    serverConfigChanged.value = false

    // Re-enable watchers after a short delay to ensure all reactive updates are complete
    setTimeout(() => {
      initialLoadComplete.value = true
    }, 100)

    // Only show success message if this is not the initial page load
    if (wasInitialLoadComplete) {
      showMessage('Configuration loaded successfully', 'success')
    }
  } catch (error) {
    showMessage(`Failed to load configuration: ${error}`, 'error')
  }
}
async function saveConfig() {
  saving.value = true

  // Check if server configuration changed
  const serverChanged =
    originalServerConfig.value &&
    (originalServerConfig.value.httpPort !== config.value.server.httpPort ||
      originalServerConfig.value.discoveryPort !== config.value.server.discoveryPort)

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

    // If server config changed, set the flag to show restart warning
    if (serverChanged) {
      serverConfigChanged.value = true
    }

    // Update original server config after successful save
    originalServerConfig.value = {
      httpPort: config.value.server.httpPort,
      discoveryPort: config.value.server.discoveryPort,
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
const initialLoadComplete = ref(false)
const hasUnsavedChanges = ref(false)
const serverConfigChanged = ref(false)
const originalServerConfig = ref<{ httpPort: number; discoveryPort: number } | null>(null)

// Auto-save watcher for MQTT enabled setting
watch(
  () => config.value.mqtt.enabled,
  async (newValue, oldValue) => {
    // Only auto-save if this is a real user change (not initial load)
    if (initialLoadComplete.value && oldValue !== undefined && newValue !== oldValue) {
      // Always set autoConnect to true when MQTT is enabled
      config.value.mqtt.autoConnect = newValue
      await saveConfig()
      showMessage('✓ MQTT setting saved', 'success', 2000)
      hasUnsavedChanges.value = false
    } else if (configLoaded.value && initialLoadComplete.value) {
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
    if (configLoaded.value && initialLoadComplete.value) {
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
  border-radius: 0;
  padding: 8px 12px;
  cursor: pointer;
  font-family: 'SUSE Mono', monospace;
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
  border-radius: 0;
  padding: 8px 10px;
  font-size: 14px;
  font-family: 'SUSE Mono', monospace;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.info small {
  color: #fbbf24;
  flex: 1;
}

.btn-dismiss {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  border-radius: 0;
  transition: color 0.2s ease;
}

.btn-dismiss:hover {
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
  /* Default text color - will be overridden by YAML syntax highlighting */
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

/* YAML Syntax Highlighting - Ultra high specificity */
.settings .config-preview pre .yaml-key,
.settings .config-preview .yaml-key,
pre.config-preview .yaml-key,
.yaml-syntax .yaml-key {
  color: #60a5fa !important; /* Light blue for keys */
  font-weight: 600 !important;
}

.settings .config-preview pre .yaml-string,
.settings .config-preview .yaml-string,
pre.config-preview .yaml-string,
.yaml-syntax .yaml-string {
  color: #34d399 !important; /* Green for strings */
}

.settings .config-preview pre .yaml-number,
.settings .config-preview .yaml-number,
pre.config-preview .yaml-number,
.yaml-syntax .yaml-number {
  color: #f59e0b !important; /* Amber for numbers */
}

.settings .config-preview pre .yaml-boolean,
.settings .config-preview .yaml-boolean,
pre.config-preview .yaml-boolean,
.yaml-syntax .yaml-boolean {
  color: #a78bfa !important; /* Purple for booleans */
  font-weight: 500 !important;
}

.settings .config-preview pre .yaml-null,
.settings .config-preview .yaml-null,
pre.config-preview .yaml-null,
.yaml-syntax .yaml-null {
  color: #9ca3af !important; /* Gray for null values */
  font-style: italic !important;
}

.settings .config-preview pre .yaml-comment,
.settings .config-preview .yaml-comment,
pre.config-preview .yaml-comment,
.yaml-syntax .yaml-comment {
  color: #6b7280 !important; /* Muted gray for comments */
  font-style: italic !important;
}

/* Pre element styling for YAML display */
.config-preview pre {
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 16px;
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
