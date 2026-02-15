# Ferment

Self-hosted batch fermentation logger. Track your wine, beer, mead, and cider from pitch to bottle.

<!-- Screenshot placeholder: replace with actual screenshot once UI exists -->
<!-- ![Ferment Dashboard](docs/screenshot.png) -->

## What It Does

- **Batch tracking** — Create and manage fermentation batches with a full event timeline
- **Phase management** — Define fermentation protocols with automatic completion criteria evaluation
- **Hydrometer integration** — Ingest data from Tilt, iSpindel, and other hydrometers with automatic bucketing
- **Home Assistant integration** — MQTT auto-discovery and outbound webhooks for your smart home

## Quick Start

```bash
docker run -d \
  --name ferment \
  -p 3000:3000 \
  -v ./data:/data \
  ferment:latest
```

Open `http://localhost:3000` and create your first batch.

### Docker Compose

```yaml
version: "3.8"
services:
  ferment:
    image: ferment:latest
    container_name: ferment
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      - FERMENT_API_KEY=your-secret-key
    restart: unless-stopped
```

## Features

### Core Logger
- Batch CRUD with active/completed/archived status
- Timeline with 7 entry types: reading, addition, rack, taste, phase change, note, alert
- Quick Log modal — log a gravity reading in under 10 seconds
- Dashboard with filterable batch cards

### Smart Tracking
- Phase engine with 5 completion criteria types (gravity stable, duration, action count, manual, compound)
- Built-in protocol templates (Kit Wine Red/White, Simple Beer Ale)
- Custom template builder
- Alert detection: stuck fermentation, temperature drift, anomaly

### Device Integration
- HTTP ingest API for any hydrometer
- Built-in Tilt adapter (polls TiltPi automatically)
- iSpindel native HTTP support (point directly at Ferment)
- Fermentation curve charts with dual y-axis (gravity + temperature)
- Configurable reading bucketing (raw storage + timeline entry intervals)

### Home Integration
- Outbound webhooks with HMAC signing and retry logic
- MQTT publishing with Home Assistant auto-discovery
- REST API for HA REST sensor integration
- Batch export: JSON, CSV, Markdown

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20+ |
| Framework | Next.js 14+ (App Router) |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| UI | React + Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Container | Docker (single image) |

## Configuration

All configuration is via environment variables. None are required for basic local use.

| Variable | Default | Description |
|----------|---------|-------------|
| `FERMENT_API_KEY` | _(none)_ | API key for authentication. If unset, API is open. |
| `FERMENT_PORT` | `3000` | Port for web UI and API |
| `DATABASE_PATH` | `/data/ferment.db` | Path to SQLite database file |
| `MQTT_ENABLED` | `false` | Enable MQTT publishing |
| `MQTT_BROKER` | _(none)_ | MQTT broker URL |
| `MQTT_TOPIC_PREFIX` | `ferment` | Prefix for MQTT topics |
| `MQTT_USERNAME` | _(none)_ | MQTT authentication username |
| `MQTT_PASSWORD` | _(none)_ | MQTT authentication password |
| `TILT_ENABLED` | `false` | Enable built-in Tilt adapter |
| `TILTPI_URL` | _(none)_ | TiltPi HTTP endpoint URL |
| `TILT_POLL_INTERVAL` | `300` | Tilt polling interval in seconds |

## API

All endpoints are prefixed with `/api/v1`. Authenticate with `X-API-Key` header if `FERMENT_API_KEY` is set.

| Resource | Endpoints |
|----------|-----------|
| Batches | `GET/POST /batches`, `GET/PATCH/DELETE /batches/:id` |
| Timeline | `GET/POST /batches/:id/timeline` |
| Readings | `GET/POST /batches/:id/readings` |
| Phases | `POST /batches/:id/advance-phase`, `POST /batches/:id/skip-phase`, `GET /batches/:id/phase-status` |
| Templates | `GET/POST /templates`, `GET/PUT/DELETE /templates/:id` |
| Webhooks | `GET/POST /webhooks`, `PATCH/DELETE /webhooks/:id`, `POST /webhooks/:id/test` |
| Settings | `GET/PATCH /settings` |
| Export | `GET /batches/:id/export?format=json\|csv\|markdown` |

## Data & Backup

All data lives in a single SQLite database at `DATABASE_PATH`. Backup = copy the `/data` directory.

## License

MIT
