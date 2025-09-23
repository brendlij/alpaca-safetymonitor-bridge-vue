# Docker Deployment Guide

This guide explains how to deploy the Alpaca Safety Monitor Bridge using Docker with configurable ports.

## Quick Start

### Using Docker Compose (Recommended)

1. **Start the application:**

   ```bash
   docker-compose up -d
   ```

2. **To customize web interface port, edit `docker-compose.yml`:**

   ```yaml
   environment:
     - WEB_PORT=8080 # Change to your desired port
   ```

3. **Access the application:**
   - Web Interface: http://localhost:3000 (or your custom WEB_PORT)
   - Alpaca API: http://localhost:11111 (ASCOM standard)
   - Alpaca Discovery: UDP port 32227 (ASCOM standard)

**Note:** Uses host networking for proper ASCOM discovery functionality.

### Using Docker directly

1. **Build the image:**

   ```bash
   npm run docker:build
   # or
   docker build -t alpaca-safety-monitor .
   ```

2. **Run with default settings:**

   ```bash
   docker run -d \
     --name alpaca-safety-monitor \
     --network host \
     -v alpaca_data:/app/data \
     -v alpaca_server_data:/app/server/data \
     alpaca-safety-monitor
   ```

3. **Run with custom web port:**
   ```bash
   docker run -d \
     --name alpaca-safety-monitor \
     --network host \
     -e WEB_PORT=8080 \
     -v alpaca_data:/app/data \
     -v alpaca_server_data:/app/server/data \
     alpaca-safety-monitor
   ```

**Important:** Uses `--network host` for proper ASCOM Alpaca discovery functionality.

## Environment Variables

| Variable   | Description         | Default      | Example      |
| ---------- | ------------------- | ------------ | ------------ |
| `WEB_PORT` | Web interface port  | `3000`       | `8080`       |
| `NODE_ENV` | Runtime environment | `production` | `production` |

**Note:** Alpaca API port (11111) and Discovery port (32227) follow ASCOM standards and are configured through the Settings page in the web interface.

## Networking Configuration

### Host Networking (Required for ASCOM)

The container uses `network_mode: host` to ensure ASCOM Alpaca discovery broadcasts work correctly:

```yaml
services:
  alpaca-safety-monitor:
    network_mode: host
    environment:
      - WEB_PORT=3000 # Default web interface port
```

### Port Configuration

Since host networking is used, ports are accessed directly on the host:

- **Web Interface:** Port 3000 (configurable via WEB_PORT)
- **Alpaca API:** Port 11111 (ASCOM standard)
- **Alpaca Discovery:** Port 32227/UDP (ASCOM standard)

**Why Host Networking?** ASCOM Alpaca discovery requires UDP broadcast packets, which work best with host networking mode.

## Persistent Data

The application stores configuration data in Docker volumes with proper permissions:

- **Main Config:** `/app/data/config.yaml` - MQTT settings, server config
- **Server Data:** `/app/server/data/` - Server-specific configuration

### Docker Compose (Automatic)

```yaml
volumes:
  - alpaca_data:/app/data # Main configuration
  - alpaca_server_data:/app/server/data # Server data
```

### Manual Docker Run

```bash
docker run --network host \
  -v alpaca_data:/app/data \
  -v alpaca_server_data:/app/server/data \
  alpaca-safety-monitor
```

**Permissions:** The container runs as user `alpaca` (UID 1001) with proper write permissions to configuration directories.

## Health Check

The container includes a health check endpoint at `/health` that returns:

```json
{
  "status": "ok",
  "serverRunning": true,
  "timestamp": "2025-09-23T16:00:00.000Z"
}
```

## Development vs Production

### Development (npm run dev:all)

- Vite dev server on port 5173
- Wrapper server on port 3001
- Hot reloading enabled

### Production (Docker)

- Single server on configurable WEB_PORT
- Built frontend served as static files
- Optimized for performance

## Troubleshooting

### Port Conflicts

If you get port binding errors, check if ports are already in use:

```bash
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

### Configuration Issues

Check container logs:

```bash
docker logs alpaca-safety-monitor
```

### Network Access

Ensure your firewall allows the required ports:

- 3000 (TCP) - for web interface (or your custom port)
- 11111 (TCP) - for Alpaca API (ASCOM standard)
- 32227 (UDP) - for Alpaca discovery (ASCOM standard)
