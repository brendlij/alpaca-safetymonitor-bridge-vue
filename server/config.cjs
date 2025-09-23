const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const CONFIG_FILE = path.join(process.cwd(), 'config.yaml')

// Default configuration
const DEFAULT_CONFIG = {
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
}

let currentConfig = null

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8')
      const loadedConfig = yaml.load(content)
      currentConfig = mergeConfig(DEFAULT_CONFIG, loadedConfig)
    } else {
      currentConfig = { ...DEFAULT_CONFIG }
      saveConfig(currentConfig)
    }
  } catch (error) {
    console.error('Error loading config:', error)
    currentConfig = { ...DEFAULT_CONFIG }
  }
  return currentConfig
}

function saveConfig(config) {
  try {
    currentConfig = mergeConfig(DEFAULT_CONFIG, config)

    // Always ensure autoConnect is true when MQTT is enabled
    if (currentConfig.mqtt.enabled) {
      currentConfig.mqtt.autoConnect = true
    }

    const yamlContent = yaml.dump(currentConfig, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    })
    fs.writeFileSync(CONFIG_FILE, yamlContent, 'utf8')
    return true
  } catch (error) {
    console.error('Error saving config:', error)
    return false
  }
}

function getConfig() {
  if (!currentConfig) {
    return loadConfig()
  }
  return currentConfig
}

function mergeConfig(defaults, overrides) {
  const result = {}

  for (const key in defaults) {
    if (
      typeof defaults[key] === 'object' &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = mergeConfig(defaults[key], overrides[key] || {})
    } else {
      result[key] = overrides && overrides.hasOwnProperty(key) ? overrides[key] : defaults[key]
    }
  }

  // Add any additional keys from overrides that aren't in defaults
  for (const key in overrides) {
    if (!defaults.hasOwnProperty(key)) {
      result[key] = overrides[key]
    }
  }

  return result
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  DEFAULT_CONFIG,
}
