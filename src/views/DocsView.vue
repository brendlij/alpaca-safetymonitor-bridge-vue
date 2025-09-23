<template>
  <div class="docs-container">
    <header class="header">
      <h1>Documentation</h1>
      <p>Complete guide for the Alpaca Safety Monitor Bridge</p>
    </header>

    <nav class="docs-nav">
      <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#setup">Setup & Installation</a></li>
        <li><a href="#configuration">Configuration</a></li>
        <li><a href="#mqtt">MQTT Integration</a></li>
        <li><a href="#api">API Reference</a></li>
        <li><a href="#troubleshooting">Troubleshooting</a></li>
        <li><a href="#technical">Technical Details</a></li>
      </ul>
    </nav>

    <section id="overview" class="section">
      <h2>Overview</h2>
      <p>
        The Alpaca Safety Monitor Bridge is a web-based application that connects ASCOM Alpaca
        Safety Monitor devices with MQTT brokers. It provides remote monitoring and control
        capabilities for observatory safety systems through a clean, modern interface.
      </p>
      <p>
        Built with Vue.js 3 and Node.js, the application offers real-time status updates, live log
        streaming, and comprehensive configuration management for amateur and professional
        observatories.
      </p>

      <h3>Key Features</h3>
      <ul class="feature-list">
        <li>Real-time web-based monitoring interface</li>
        <li>Full ASCOM Alpaca protocol compatibility</li>
        <li>MQTT integration for home automation systems</li>
        <li>Live log streaming with filtering</li>
        <li>Comprehensive settings management</li>
        <li>Auto-discovery support for devices</li>
        <li>Remote safety control capabilities</li>
      </ul>
    </section>

    <section id="setup" class="section">
      <h2>Setup & Installation</h2>

      <h3>Prerequisites</h3>
      <ul>
        <li>Node.js 18+ installed</li>
        <li>ASCOM Alpaca Safety Monitor device or simulator</li>
        <li>MQTT broker (optional, for automation)</li>
      </ul>

      <h3>Installation Steps</h3>
      <ol>
        <li>Clone or download the application</li>
        <li>Run <code>npm install</code> to install dependencies</li>
        <li>Configure your settings in the Settings page</li>
        <li>Start the application with <code>npm run dev:all</code></li>
        <li>Access the web interface at http://localhost:5173</li>
      </ol>

      <h3>First Run</h3>
      <p>
        On first startup, the application will attempt to discover ASCOM Alpaca devices on your
        network. Navigate to the Settings page to configure your specific device connection and MQTT
        broker settings.
      </p>
    </section>

    <section id="configuration" class="section">
      <h2>Configuration</h2>

      <h3>Server Settings</h3>
      <ul>
        <li><strong>HTTP Port:</strong> Port for the web interface (default: 3000)</li>
        <li><strong>Discovery Port:</strong> Port for ASCOM device discovery (default: 32227)</li>
      </ul>

      <h3>Logging Settings</h3>
      <ul>
        <li><strong>Log Level:</strong> Controls verbosity (error, warn, info, debug)</li>
        <li><strong>Max Log Entries:</strong> Maximum number of log entries to keep in memory</li>
      </ul>

      <h3>Safety Monitor Device</h3>
      <p>Configure the connection to your ASCOM Alpaca Safety Monitor device:</p>
      <ul>
        <li><strong>Device IP:</strong> IP address of the device</li>
        <li><strong>Device Port:</strong> Port number (typically 11111)</li>
        <li><strong>Device Number:</strong> Device instance number</li>
      </ul>
    </section>

    <section id="mqtt" class="section">
      <h2>MQTT Integration</h2>

      <h3>Configuration</h3>
      <p>Configure MQTT settings in the Settings page:</p>
      <ul>
        <li><strong>Broker Host:</strong> MQTT broker IP address</li>
        <li><strong>Broker Port:</strong> MQTT broker port (typically 1883)</li>
        <li><strong>Username/Password:</strong> Authentication credentials</li>
        <li><strong>Base Topic:</strong> Root topic for all messages</li>
        <li><strong>Client ID:</strong> Unique identifier for this client</li>
      </ul>

      <h3>Published Topics</h3>
      <table class="mqtt-table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Description</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>{baseTopic}/status</code></td>
            <td>Complete server status</td>
            <td>JSON object with all status information</td>
          </tr>
          <tr>
            <td><code>{baseTopic}/safe</code></td>
            <td>Safety state</td>
            <td><code>true</code> or <code>false</code></td>
          </tr>
          <tr>
            <td><code>{baseTopic}/client</code></td>
            <td>Client connection state</td>
            <td><code>connected</code> or <code>disconnected</code></td>
          </tr>
        </tbody>
      </table>

      <h3>Command Topics</h3>
      <table class="mqtt-table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Description</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>{baseTopic}/command/safe</code></td>
            <td>Set safety state</td>
            <td><code>true</code>, <code>false</code>, or JSON with reason</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="api" class="section">
      <h2>API Reference</h2>

      <h3>REST Endpoints</h3>
      <table class="api-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GET</td>
            <td><code>/admin/status</code></td>
            <td>Get current server status</td>
          </tr>
          <tr>
            <td>GET</td>
            <td><code>/admin/config</code></td>
            <td>Get current configuration</td>
          </tr>
          <tr>
            <td>GET</td>
            <td><code>/admin/logs</code></td>
            <td>Get recent log entries</td>
          </tr>
          <tr>
            <td>POST</td>
            <td><code>/admin/safe</code></td>
            <td>Set safety state</td>
          </tr>
          <tr>
            <td>GET</td>
            <td><code>/admin/logs/stream</code></td>
            <td>Server-sent events for live logs</td>
          </tr>
        </tbody>
      </table>

      <h3>Wrapper API</h3>
      <table class="api-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>POST</td>
            <td><code>/wrapper/start</code></td>
            <td>Start the server</td>
          </tr>
          <tr>
            <td>POST</td>
            <td><code>/wrapper/stop</code></td>
            <td>Stop the server</td>
          </tr>
          <tr>
            <td>POST</td>
            <td><code>/wrapper/restart</code></td>
            <td>Restart the server</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="troubleshooting" class="section">
      <h2>Troubleshooting</h2>

      <h3>Common Issues</h3>

      <div class="troubleshoot-item">
        <h4>Server won't start</h4>
        <ul>
          <li>Check that the HTTP port is not already in use</li>
          <li>Verify Node.js is properly installed</li>
          <li>Check the logs for specific error messages</li>
        </ul>
      </div>

      <div class="troubleshoot-item">
        <h4>Device not found</h4>
        <ul>
          <li>Ensure the device is on the same network</li>
          <li>Check firewall settings</li>
          <li>Verify the device IP and port in settings</li>
          <li>Try manual device configuration instead of auto-discovery</li>
        </ul>
      </div>

      <div class="troubleshoot-item">
        <h4>MQTT not connecting</h4>
        <ul>
          <li>Verify broker IP address and port</li>
          <li>Check username/password credentials</li>
          <li>Ensure the broker is running and accessible</li>
          <li>Check network connectivity to the broker</li>
        </ul>
      </div>

      <h3>Log Analysis</h3>
      <p>
        Use the log viewer in the Server Manager to diagnose issues. Set the log level to "debug"
        for detailed troubleshooting information. Look for error messages and connection timeouts.
      </p>
    </section>

    <section id="technical" class="section">
      <h2>Technical Details</h2>

      <h3>Architecture</h3>
      <p>
        The application consists of a Node.js backend server that communicates with ASCOM Alpaca
        devices and MQTT brokers, and a Vue.js frontend that provides the web interface.
      </p>

      <h3>Technology Stack</h3>
      <div class="tech-grid">
        <div class="tech-column">
          <h4>Frontend</h4>
          <ul>
            <li>Vue.js 3 with Composition API</li>
            <li>TypeScript for type safety</li>
            <li>Vite for fast development and building</li>
            <li>Modern CSS with scoped styling</li>
          </ul>
        </div>
        <div class="tech-column">
          <h4>Backend</h4>
          <ul>
            <li>Node.js runtime</li>
            <li>Express.js web framework</li>
            <li>MQTT.js for broker communication</li>
            <li>Server-sent events for real-time updates</li>
          </ul>
        </div>
      </div>

      <h3>Protocols</h3>
      <ul>
        <li><strong>ASCOM Alpaca:</strong> REST-based API for astronomy device control</li>
        <li><strong>MQTT:</strong> Lightweight messaging protocol for IoT integration</li>
        <li><strong>WebSocket/SSE:</strong> Real-time communication with the web interface</li>
      </ul>

      <h3>Safety Considerations</h3>
      <div class="safety-notice">
        <h4>Important Safety Notice</h4>
        <p>
          This software is designed for amateur astronomy and observatory automation. For
          professional installations or critical applications, always implement redundant safety
          systems and thorough testing.
        </p>
        <p>
          The safety monitor bridge should be part of a larger safety system, not the sole safety
          mechanism.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.docs-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  line-height: 1.6;
}

.header {
  margin-bottom: 40px;
  text-align: center;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 8px;
  color: #f8fafc;
}

.header p {
  color: #94a3b8;
  font-size: 1.2rem;
  margin: 0;
}

.docs-nav {
  background: #1a1b1e;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 40px;
}

.docs-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.docs-nav a {
  color: #60a5fa;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 4px;
  display: block;
  transition: background 0.2s;
}

.docs-nav a:hover {
  background: #2a2b2d;
}

.section {
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid #2a2b2d;
}

.section:last-child {
  border-bottom: none;
}

.section h2 {
  font-size: 2rem;
  margin-bottom: 20px;
  color: #f8fafc;
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
}

.section h3 {
  font-size: 1.4rem;
  margin: 24px 0 12px 0;
  color: #e2e8f0;
}

.section h4 {
  font-size: 1.2rem;
  margin: 20px 0 8px 0;
  color: #cbd5e1;
}

.section p {
  color: #94a3b8;
  margin-bottom: 16px;
}

.feature-list,
.section ul:not(.docs-nav ul) {
  list-style: none;
  padding: 0;
}

.feature-list li,
.section ul:not(.docs-nav ul) li {
  padding: 8px 0;
  color: #94a3b8;
  border-left: 3px solid #374151;
  padding-left: 16px;
  margin-bottom: 8px;
}

.section ol {
  color: #94a3b8;
  padding-left: 20px;
}

.section ol li {
  margin-bottom: 8px;
}

code {
  background: #0f1011;
  color: #a78bfa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.mqtt-table,
.api-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: #1a1b1e;
  border-radius: 8px;
  overflow: hidden;
}

.mqtt-table th,
.api-table th,
.mqtt-table td,
.api-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #2a2b2d;
}

.mqtt-table th,
.api-table th {
  background: #2a2b2d;
  color: #f8fafc;
  font-weight: 600;
}

.mqtt-table td,
.api-table td {
  color: #94a3b8;
}

.mqtt-table td code,
.api-table td code {
  background: #0f1011;
  color: #60a5fa;
}

.tech-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin: 20px 0;
}

.tech-column ul {
  list-style: none;
  padding: 0;
}

.tech-column li {
  padding: 6px 0;
  color: #94a3b8;
}

.troubleshoot-item {
  background: #1a1b1e;
  border: 1px solid #2a2b2d;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
}

.troubleshoot-item h4 {
  color: #f59e0b;
  margin-top: 0;
}

.safety-notice {
  background: #1a1b1e;
  border: 1px solid #dc2626;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #ef4444;
}

.safety-notice h4 {
  color: #ef4444;
  margin-top: 0;
}

.safety-notice p {
  color: #f8fafc;
}

@media (max-width: 768px) {
  .docs-container {
    padding: 16px;
  }

  .tech-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .header h1 {
    font-size: 2rem;
  }

  .docs-nav ul {
    grid-template-columns: 1fr;
  }

  .mqtt-table,
  .api-table {
    font-size: 0.9rem;
  }

  .mqtt-table th,
  .api-table th,
  .mqtt-table td,
  .api-table td {
    padding: 8px 12px;
  }
}
</style>
