# ALICE Presence SaaS

Real-time presence engine — user session management, Vivaldi coordinate proximity, privacy levels, and ZKP-based identity via REST API.

**License: AGPL-3.0**

---

## Architecture

```
                    ┌─────────────────┐
                    │   Browser / UI  │
                    │  Next.js :3000  │
                    └────────┬────────┘
                             │ HTTP
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │     :8080       │
                    └────────┬────────┘
                             │ HTTP
                    ┌────────▼────────┐
                    │  Presence       │
                    │  Engine         │
                    │  Rust/Axum      │
                    │    :8081        │
                    └─────────────────┘
```

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js dashboard |
| API Gateway | 8080 | Reverse proxy / auth |
| Presence Engine | 8081 | Rust/Axum core engine |

---

## API Endpoints

### POST /api/v1/presence/join

Join a space with Vivaldi coordinate assignment and ZKP token.

**Request:**
```json
{
  "user_id": "user_123",
  "space_id": "lobby",
  "display_name": "Alice"
}
```

**Response:**
```json
{
  "session_id": "550e8400-...",
  "space_id": "lobby",
  "user_id": "user_123",
  "vivaldi_coordinates": [0.45, -0.32],
  "zkp_token": "a1b2c3d4e5f6...",
  "joined_at": "2026-02-23T12:30:00Z",
  "online_count": 5
}
```

---

### POST /api/v1/presence/leave

Leave a space and end session.

**Request:**
```json
{
  "session_id": "550e8400-..."
}
```

---

### POST /api/v1/presence/update

Update session status and privacy level.

**Request:**
```json
{
  "session_id": "550e8400-...",
  "status": "away",
  "privacy_level": 2
}
```

**Privacy levels:**

| Level | Behavior |
|-------|----------|
| 0 | Public — full visibility |
| 1 | Friends — Vivaldi coords shared |
| 2 | Minimal — status generalized to "active", no coords |
| 3 | ZKP-only — anonymous display name, ZKP proof attached |

---

### GET /api/v1/presence/space/{space_id}

List users in a space (respecting privacy levels).

**Response:**
```json
{
  "space_id": "lobby",
  "online_count": 3,
  "users": [
    {
      "user_id": "user_123",
      "display_name": "Alice",
      "status": "online",
      "vivaldi_coordinates": [0.45, -0.32],
      "last_seen": "2026-02-23T12:30:00Z"
    }
  ]
}
```

Invisible users are hidden. Privacy level >= 3 shows "anonymous".

---

### POST /api/v1/presence/ping

Find nearby users within a Vivaldi distance radius.

**Request:**
```json
{
  "session_id": "550e8400-...",
  "space_id": "lobby",
  "radius": 50.0
}
```

**Response:**
```json
{
  "nearby": [
    {
      "user_id": "user_456",
      "distance": 23.5,
      "status": "online",
      "vivaldi_distance": 0.235
    }
  ],
  "count": 1,
  "radius": 50.0
}
```

---

### GET /api/v1/presence/stats

Server-wide presence statistics.

---

### GET /health

Health check endpoint.

---

## Quick Start

### Presence Engine (Rust)

```bash
cd services/core-engine
cargo build --release
PRESENCE_ADDR=0.0.0.0:8081 ./target/release/presence-engine
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PRESENCE_ADDR` | `0.0.0.0:8081` | Engine bind address |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | API base URL for frontend |

---

## License

AGPL-3.0 — See [LICENSE](LICENSE) for details.
