# Alpaca Safety Monitor Bridge with MQTT Integration

A modern web-based bridge that connects ASCOM Alpaca Safety Monitor devices with MQTT brokers, enabling remote monitoring and control of observatory safety systems.

## Features

- 🌐The server provides several admin endpoints for managing the system:

#### Configuration Management

- `GET /admin/config` - Get current configuration
- `POST /admin/config` - Update configuration
- `POST /admin/config/reload` - Reload configuration from file

#### System Control

- `POST /admin/safety/set` - Set safety state manually
- `GET /admin/logs` - Get recent log events (Server-Sent Events)

## Integration Examples

### ASCOM Client Applications

Any ASCOM-compatible application can connect to this bridge:

```
Alpaca URL: http://localhost:11111/api/v1/safetymonitor/0/
```

### Observatory Automation

Use MQTT to integrate with existing observatory automation systems:

1. **Weather Stations**: Publish unsafe conditions when weather deteriorates
2. **Motion Sensors**: Trigger safety alerts on unexpected movement
3. **UPS Systems**: Signal unsafe state on power issues
4. **Manual Override**: Emergency stop via mobile app or dashboard

## Troubleshooting

### Common Issues

**MQTT Connection Failed**

- Verify MQTT broker is running and accessible
- Check firewall settings for MQTT port (default 1883)
- Validate username/password if authentication is enabled

**ASCOM Discovery Not Working**

- Ensure UDP port 32227 is not blocked by firewall
- Check that no other ASCOM Discovery services are using the same port
- Verify discovery is enabled in ASCOM client applications

**Web Interface Not Loading**

- Check that port 5173 (development) or 11111 (production) is available
- Clear browser cache and cookies
- Check browser console for JavaScript errors

### Debug Mode

Enable debug logging in the configuration:

```yaml
logging:
  level: debug
```

This will provide detailed information about MQTT messages, ASCOM API calls, and system events.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions:

- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting section above

---

**Safety Notice**: This software is intended for amateur astronomy and observatory automation. Always implement redundant safety systems for professional installations or when valuable equipment is at risk.b-based Interface\*\*: Modern Vue.js frontend with real-time monitoring

- 🔌 **ASCOM Alpaca Compatible**: Full support for ASCOM Alpaca Safety Monitor protocol
- 📡 **MQTT Integration**: Publish status and receive commands via MQTT
- ⚙️ **Configurable Settings**: Web-based configuration management
- 📊 **Real-time Logging**: Live log streaming with Server-Sent Events
- 🔍 **Auto-discovery**: ASCOM Discovery protocol support
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites

- Node.js 20.19.0 or later
- MQTT broker (optional, for remote control features)

### Installation

```bash
# Clone the repository
git clone https://github.com/brendlij/alpaca-safetymonitor-bridge-vue.git
cd alpaca-safetymonitor-bridge-vue

# Install dependencies
npm install

# Start development server (includes both frontend and backend)
npm run dev:all
```

The application will be available at:

- **Web Interface**: http://localhost:5173
- **ASCOM Alpaca API**: http://localhost:11111
- **Discovery Service**: UDP port 32227

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run server
```

## Configuration

### Web Interface Configuration

1. Navigate to **Settings** in the web interface menu
2. Configure the following sections:

#### Server Configuration

- **HTTP Port**: Port for ASCOM Alpaca API (default: 11111)
- **Discovery Port**: UDP port for ASCOM Discovery (default: 32227)

#### MQTT Configuration

- **Enable MQTT**: Toggle MQTT functionality
- **Host**: MQTT broker hostname/IP
- **Port**: MQTT broker port (default: 1883)
- **Username/Password**: MQTT authentication (optional)
- **Base Topic**: MQTT topic prefix (default: `alpaca/safetymonitor`)
- **Client ID**: MQTT client identifier

#### Logging Configuration

- **Log Level**: debug, info, warn, error
- **Max Log Entries**: Maximum number of log entries to keep in memory

### Configuration File

Settings are automatically saved to `config.yaml`:

```yaml
server:
  httpPort: 11111
  discoveryPort: 32227
mqtt:
  enabled: true
  host: localhost
  port: 1883
  username: ''
  password: ''
  baseTopic: 'alpaca/safetymonitor'
  clientId: 'alpaca-safety-monitor'
logging:
  level: info
  maxLogEntries: 1000
```

## MQTT Integration

### Published Topics (Status)

The system publishes status information to the following topics:

| Topic                   | Description            | Format                                                                           |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `{baseTopic}/status`    | Complete status (JSON) | `{"connected": true, "isSafe": true, "clientConnected": true, "uptimeSec": 123}` |
| `{baseTopic}/safe`      | Safety state           | `true` / `false`                                                                 |
| `{baseTopic}/connected` | Server connection      | `true` / `false`                                                                 |
| `{baseTopic}/client`    | Client connection      | `true` / `false`                                                                 |
| `{baseTopic}/uptime`    | Server uptime          | `"123"` (seconds)                                                                |

### Command Topic (Control)

Send commands to: `{baseTopic}/command/safe`

#### Supported Command Formats

**JSON Object (Recommended):**

```json
{ "safe": false, "reason": "Weather alert received" }
```

**Simple Boolean:**

```
false
```

**JSON Boolean:**

```json
false
```

### MQTT Examples

#### Using mosquitto_pub

```bash
# Set UNSAFE with reason
mosquitto_pub -h localhost -t "alpaca/safetymonitor/command/safe" \
  -m '{"safe": false, "reason": "Motion detected"}'

# Set SAFE (simple format)
mosquitto_pub -h localhost -t "alpaca/safetymonitor/command/safe" -m "true"
```

#### Using Node-RED

```json
{
  "topic": "alpaca/safetymonitor/command/safe",
  "payload": { "safe": true, "reason": "All sensors OK" }
}
```

#### Using Home Assistant

```yaml
mqtt:
  - button:
      name: 'Observatory Safe'
      command_topic: 'alpaca/safetymonitor/command/safe'
      payload_press: '{"safe": true, "reason": "Manual override"}'
```

#### Using Python

```python
import paho.mqtt.client as mqtt
import json

client = mqtt.Client()
client.connect("localhost", 1883, 60)

payload = {"safe": False, "reason": "Cloud sensor triggered"}
client.publish("alpaca/safetymonitor/command/safe", json.dumps(payload))
```

## ASCOM Alpaca API

The system implements the full ASCOM Alpaca Safety Monitor specification:

### Device Information

- `GET /api/v1/safetymonitor/0/name`
- `GET /api/v1/safetymonitor/0/description`
- `GET /api/v1/safetymonitor/0/connected`

### Safety Monitor Specific

- `GET /api/v1/safetymonitor/0/issafe` - Get safety state
- `PUT /api/v1/safetymonitor/0/connected` - Connect/disconnect device

### Discovery

- **UDP Discovery**: Responds to ASCOM Discovery protocol on port 32227
- **Device Type**: SafetyMonitor
- **Alpaca Port**: 11111 (configurable)

## Web Interface

### Home Page

- Real-time safety status display
- Connection status indicators
- Quick access to all features

### Server Manager

- **Live Status**: Real-time server statistics
- **Safety Controls**: Manual safety state control
- **MQTT Status**: Connection status and message counters
- **Live Logs**: Real-time log streaming with filtering
- **MQTT Topics**: Display of all MQTT topics and their purposes

### Settings

- **Configuration Management**: Web-based configuration editor
- **Real-time Preview**: See configuration changes before saving
- **Validation**: Built-in configuration validation

## Development

### Project Structure

```
├── src/                    # Vue.js frontend
│   ├── components/         # Vue components
│   ├── views/             # Page views
│   └── router/            # Vue Router configuration
├── server/                # Node.js backend
│   ├── index.cjs          # Main server
│   ├── config.cjs         # Configuration management
│   ├── mqtt.cjs           # MQTT client manager
│   ├── alpaca.cjs         # ASCOM Alpaca API
│   ├── state.cjs          # Device state management
│   └── discovery.cjs      # ASCOM Discovery service
└── config.yaml           # Configuration file
```

### Scripts

```bash
npm run dev          # Frontend development server
npm run server       # Backend server only
npm run dev:all      # Both frontend and backend
npm run build        # Production build
npm run lint         # Code linting
npm run format       # Code formatting
```

### API Development

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
