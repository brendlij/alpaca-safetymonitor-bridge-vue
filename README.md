# Alpaca Safety Monitor Bridge with MQTT Integration

A web-based bridge that connects ASCOM Alpaca Safety Monitor devices with MQTT brokers for remote observatory control.

## Installation

```bash
git clone https://github.com/brendlij/alpaca-safetymonitor-bridge-vue.git
cd alpaca-safetymonitor-bridge-vue
npm install
npm run dev:all
```

Web Interface: http://localhost:5173  
ASCOM API: http://localhost:11111

## Admin Endpoints

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
