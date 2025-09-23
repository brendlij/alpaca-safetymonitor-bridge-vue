<template>
  <div class="about-container">
    <header class="header">
      <h1>Alpaca Safety Monitor Bridge</h1>
      <p>MQTT-enabled observatory safety control system</p>
    </header>

    <section class="section">
      <h2>Overview</h2>
      <p>
        A web-based bridge that connects ASCOM Alpaca Safety Monitor devices with MQTT brokers.
        Enables remote monitoring and control of observatory safety systems through a clean
        interface.
      </p>
      <p>
        Built with Vue.js 3 and Node.js, providing real-time status updates and remote control
        capabilities for amateur and professional observatories.
      </p>
    </section>

    <section class="section">
      <h2>Key Features</h2>
      <ul class="feature-list">
        <li>Web-based monitoring interface</li>
        <li>ASCOM Alpaca protocol compatibility</li>
        <li>MQTT integration for remote control</li>
        <li>Real-time log streaming</li>
        <li>Configurable settings management</li>
        <li>Auto-discovery support</li>
      </ul>
    </section>

    <section class="section">
      <h2>Use Cases</h2>
      <ul class="use-case-list">
        <li>
          <strong>Weather Integration:</strong> Automatically set unsafe conditions based on weather
          data
        </li>
        <li><strong>Motion Detection:</strong> Trigger safety alerts on unexpected movement</li>
        <li><strong>Power Monitoring:</strong> Signal unsafe state during power issues</li>
        <li><strong>Remote Control:</strong> Emergency stops via mobile apps or dashboards</li>
        <li><strong>Home Automation:</strong> Integration with Home Assistant, Node-RED</li>
      </ul>
    </section>

    <section class="section">
      <h2>Technical Stack</h2>
      <div class="tech-grid">
        <div class="tech-column">
          <h3>Frontend</h3>
          <ul>
            <li>Vue.js 3</li>
            <li>TypeScript</li>
            <li>Vite</li>
          </ul>
        </div>
        <div class="tech-column">
          <h3>Backend</h3>
          <ul>
            <li>Node.js</li>
            <li>Express.js</li>
            <li>MQTT.js</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section safety-notice">
      <h2>Safety Notice</h2>
      <p>
        This software is designed for amateur astronomy and observatory automation. For professional
        installations, always implement redundant safety systems.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.about-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 40px;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 8px;
  color: var(--color-text);
}

.header p {
  color: var(--color-text-soft);
  font-size: 1.1rem;
  margin: 0;
}

.section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.section:last-child {
  border-bottom: none;
}

.section h2 {
  font-size: 1.5rem;
  margin-bottom: 16px;
  color: var(--color-text);
}

.section h3 {
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: var(--color-text);
}

.section p {
  color: var(--color-text-soft);
  line-height: 1.6;
  margin-bottom: 12px;
}

.feature-list,
.use-case-list {
  list-style: none;
  padding: 0;
}

.feature-list li,
.use-case-list li {
  padding: 8px 0;
  color: var(--color-text-soft);
  border-left: 3px solid var(--color-border-hover);
  padding-left: 12px;
  margin-bottom: 8px;
}

.tech-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.tech-column ul {
  list-style: none;
  padding: 0;
}

.tech-column li {
  padding: 4px 0;
  color: var(--color-text-soft);
}

.safety-notice {
  background: var(--color-background-mute);
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

.safety-notice h2 {
  color: #d97706;
}

.safety-notice p {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .tech-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .header h1 {
    font-size: 1.8rem;
  }
}
</style>
