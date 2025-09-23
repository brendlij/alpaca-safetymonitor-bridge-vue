# Alpaca Safety Monitor Bridge with MQTT Integration

A modern web-based bridge that creates an ASCOM Alpaca Safety Monitor server with MQTT integration for remote observatory control. Features a Vue.js frontend for configuration and monitoring.

## 🚀 Quick Start

### Development Mode

```bash
git clone https://github.com/brendlij/alpaca-safetymonitor-bridge-vue.git
cd alpaca-safetymonitor-bridge-vue
npm install
npm run dev:all
```

- **Web Interface:** http://localhost:5173 (Vite dev server)
- **Admin Interface:** http://localhost:3001 (Wrapper server)
- **ASCOM API:** http://localhost:11111 (Alpaca standard)

### Production Mode

#### Option 1: Direct Node.js

```bash
npm run build
npm run start
# or use platform-specific scripts:
# Windows: start-production.bat
# Linux/Mac: ./start-production.sh
```

#### Option 2: Docker (Recommended)

```bash
docker-compose up -d
```

- **Web Interface:** http://localhost:3000
- **ASCOM API:** http://localhost:11111 (Alpaca standard)
- **Discovery:** UDP port 32227 (ASCOM standard)

## 🎛️ Features

- **Modern Web Interface** - Vue.3 + TypeScript frontend with real-time monitoring
- **ASCOM Alpaca Compliant** - Full SafetyMonitor v1 API implementation
- **MQTT Integration** - Publish status and receive remote commands
- **Real-time Logs** - Live server and wrapper logs with filtering
- **Smart Configuration** - YAML-based config with web UI management
- **Docker Ready** - Production deployment with proper ASCOM networking

## 📋 Configuration

Access the web interface to configure:

1. **Server Settings** - Alpaca API and Discovery ports (ASCOM standards: 11111/32227)
2. **MQTT Settings** - Broker connection, topics, credentials
3. **Safety Monitor** - Initial state, manual override capabilities

Configuration is stored in `config.yaml` and persists across restarts.

## 🔌 API Endpoints

### ASCOM Alpaca (Standard)

- `GET /api/v1/safetymonitor/0/issafe` - Get safety state
- `GET /api/v1/safetymonitor/0/connected` - Get connection status
- All standard ASCOM Alpaca SafetyMonitor endpoints

### Admin Interface

- `GET /admin/config` - Get current configuration
- `POST /admin/config` - Update configuration
- `POST /admin/safety/set` - Set safety state manually
- `GET /admin/logs` - Get recent log events (Server-Sent Events)

## MQTT Topics

### Published (Status)

| Topic                            | Description       | Format                                                                           |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `alpaca/safetymonitor/status`    | Complete status   | `{"connected": true, "isSafe": true, "clientConnected": true, "uptimeSec": 123}` |
| `alpaca/safetymonitor/safe`      | Safety state      | `true` / `false`                                                                 |
| `alpaca/safetymonitor/connected` | Server connection | `true` / `false`                                                                 |

### Command (Control)

Send commands to: `alpaca/safetymonitor/command/safe`

## Setting Safety State via MQTT

**Topic:** `alpaca/safetymonitor/command/safe`

**Payload Options:**

JSON with reason (recommended):

```json
{ "safe": false, "reason": "Weather alert" }
```

Simple boolean:

```json
true
```

## 🐳 Docker Deployment

### Quick Start

```bash
docker-compose up -d
```

### Complete docker-compose.yml

```yaml
version: '3.8'

services:
  alpaca-safety-monitor:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: alpaca-safety-monitor-bridge
    restart: unless-stopped

    # Environment variables
    environment:
      - WEB_PORT=3000 # Web interface port
      - NODE_ENV=production

    # Use host networking for ASCOM Alpaca discovery to work properly
    network_mode: host

    # Volume for persistent configuration
    volumes:
      - alpaca_data:/app/data # Main data directory (config.yaml location)
      - alpaca_server_data:/app/server/data # Server specific data

    # Health check
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "const http = require('http'); http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  alpaca_data:
    driver: local
  alpaca_server_data:
    driver: local
```

### Custom Web Port

Edit the `WEB_PORT` environment variable:

```yaml
environment:
  - WEB_PORT=8080 # Custom web interface port
```

### Manual Docker

```bash
# Build
docker build -t alpaca-safety-monitor .

# Run with default ports
docker run --network host alpaca-safety-monitor

# Run with custom web port
docker run --network host -e WEB_PORT=8080 alpaca-safety-monitor
```

**Note:** Docker uses `--network host` to ensure ASCOM Alpaca discovery broadcasts work correctly.

### Pre-built Images (GitHub Container Registry)

```bash
# Use pre-built image instead of building locally
docker run --network host ghcr.io/brendlij/alpaca-safetymonitor-bridge-vue:latest

# Or with docker-compose, edit docker-compose.yml:
# image: ghcr.io/brendlij/alpaca-safetymonitor-bridge-vue:latest
# (comment out the 'build' section)
```

**Available Tags:**

- `latest` - Latest stable release from main branch
- `v*.*.*` - Specific version tags
- `main` - Latest commit from main branch
- `develop` - Latest commit from develop branch

## 🔧 Environment Variables

| Variable   | Description         | Default       | Usage                              |
| ---------- | ------------------- | ------------- | ---------------------------------- |
| `WEB_PORT` | Web interface port  | `3000`        | Production only                    |
| `NODE_ENV` | Runtime environment | `development` | Set to `production` for deployment |

**ASCOM Ports:** API (11111) and Discovery (32227) follow ASCOM standards and are configured via the web interface.

## 📁 Project Structure

```
├── src/                 # Vue.js frontend source
├── server/              # Node.js ASCOM server
├── public/              # Static assets
├── dist/                # Built frontend (production)
├── wrapper-server.cjs   # Production server wrapper
├── docker-compose.yml   # Docker deployment
├── start-production.*   # Platform-specific start scripts
├── .github/workflows/   # GitHub Actions CI/CD
└── DOCKER.md           # Detailed Docker documentation
```

## 🔄 CI/CD

GitHub Actions automatically:

- **Build & Test** - Runs on every push/PR to validate code
- **Docker Images** - Builds and pushes multi-platform images to GitHub Container Registry
- **Tags** - Creates versioned releases for tags (e.g., `v1.0.0`)

### Available Scripts

```bash
npm run lint:check     # Check code style (CI)
npm run lint           # Fix code style issues
npm run build          # Build frontend for production
npm run docker:build   # Build Docker image locally
npm run docker:run     # Run Docker image locally
```
