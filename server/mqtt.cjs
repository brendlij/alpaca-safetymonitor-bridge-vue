const mqtt = require('mqtt')
const { EventEmitter } = require('events')

class MqttManager extends EventEmitter {
  constructor(logger) {
    super()
    this.logger = logger
    this.client = null
    this.config = null
    this.connected = false
    this.messageCount = 0
  }

  connect(config) {
    if (this.client) {
      this.disconnect()
    }

    this.config = config
    if (!config.enabled) {
      this.logger.info('MQTT disabled in configuration')
      return
    }

    try {
      const brokerUrl = `mqtt://${config.host}:${config.port}`
      this.logger.info('Connecting to MQTT broker', { url: brokerUrl, clientId: config.clientId })

      this.client = mqtt.connect(brokerUrl, {
        username: config.username || undefined,
        password: config.password || undefined,
        clientId: config.clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 60,
        protocolVersion: 4,
      })

      this.client.on('connect', () => {
        this.connected = true
        this.logger.info('MQTT connected successfully', {
          host: config.host,
          port: config.port,
          clientId: config.clientId,
        })
        this.emit('connected')

        // Subscribe to command topic
        this.client.subscribe(`${config.baseTopic}/command/safe`, (err) => {
          if (err) {
            this.logger.error('MQTT subscription failed', { error: err.message })
          } else {
            this.logger.info('MQTT subscribed to command topic', {
              topic: `${config.baseTopic}/command/safe`,
            })
          }
        })
      })

      this.client.on('message', (topic, message) => {
        this.messageCount++
        const msg = message.toString()
        this.logger.info('MQTT message received', { topic, message: msg })
        this.emit('message', topic, msg)
      })

      this.client.on('error', (error) => {
        this.logger.error('MQTT error', { error: error.message })
        this.connected = false
        this.emit('error', error)
      })

      this.client.on('close', () => {
        const wasConnected = this.connected
        this.connected = false
        this.logger.warn('MQTT connection closed', { wasConnected })
        this.emit('disconnected')
      })

      this.client.on('offline', () => {
        const wasConnected = this.connected
        this.connected = false
        this.logger.warn('MQTT client offline', { wasConnected })
        this.emit('offline')
      })

      this.client.on('reconnect', () => {
        this.logger.info('MQTT attempting to reconnect...')
      })
    } catch (error) {
      this.logger.error('Failed to connect to MQTT broker', { error: error.message })
      this.emit('error', error)
    }
  }

  disconnect() {
    if (this.client) {
      this.logger.info('Disconnecting from MQTT broker')
      this.client.end()
      this.client = null
      this.connected = false
      this.emit('disconnected')
    }
  }

  publish(topic, message, options = {}) {
    if (!this.client || !this.connected) {
      this.logger.warn('Cannot publish: MQTT not connected', { topic, message })
      return false
    }

    try {
      this.client.publish(topic, message, options)
      this.logger.debug('MQTT message published', { topic, message })
      return true
    } catch (error) {
      this.logger.error('Failed to publish MQTT message', { topic, message, error: error.message })
      return false
    }
  }

  publishStatus(status) {
    if (!this.config || !this.connected) return

    const baseTopic = this.config.baseTopic

    // Publish full status
    this.publish(`${baseTopic}/status`, JSON.stringify(status), { retain: true })

    // Publish individual values
    this.publish(`${baseTopic}/safe`, String(status.isSafe), { retain: true })
    this.publish(`${baseTopic}/connected`, String(status.connected), { retain: true })
    this.publish(`${baseTopic}/client`, String(status.clientConnected || false), { retain: true })
    this.publish(`${baseTopic}/uptime`, String(status.uptimeSec), { retain: true })
  }

  getStatus() {
    return {
      connected: this.connected,
      messageCount: this.messageCount,
      config: this.config
        ? {
            enabled: this.config.enabled,
            host: this.config.host,
            port: this.config.port,
            baseTopic: this.config.baseTopic,
            clientId: this.config.clientId,
          }
        : null,
    }
  }

  isConnected() {
    return this.connected
  }
}

module.exports = { MqttManager }
