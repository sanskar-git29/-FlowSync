<div align="center">

<br>

# FlowSync

### Production-grade event processing and workflow automation for modern backends

*Built to learn, design, and demonstrate how a real backend scales from zero to production*

<br />

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue-FF6B6B?style=for-the-badge)](https://bullmq.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)]()

<br />

[What is FlowSync](#what-is-flowsync) •
[Why I Built This](#why-i-built-this) •
[Architecture](#architecture) •
[Quick Start](#quick-start) •
[API Reference](#api-reference) •
[Tech Stack](#tech-stack--decisions) •
[Contributing](#contributing)

</div>

---

## What is FlowSync

FlowSync is a **production-grade backend platform** for ingesting high-volume events and executing multi-step automated workflows asynchronously. It is the kind of system that powers order processing pipelines, webhook delivery engines, notification systems, and background job schedulers at real companies.

This is not a tutorial clone. Every architectural decision — why the API returns 202 instead of 201, why there are three separate Redis connections, why BullMQ gets a plain config object instead of an ioredis instance — is intentional and documented.

---

## Why I Built This

Most backend tutorials teach you CRUD. They show you how to connect a database and return JSON. What they do not teach you is what happens when your API needs to handle 500 concurrent requests, when a downstream service fails halfway through processing, when you need a user's browser to update in real time without polling, or when you need one event to trigger a chain of automated steps.

I built FlowSync to answer those questions by actually building the system:

- **How do you make an API respond in 22ms when the work takes 4 seconds?** You decouple ingestion from processing with an async job queue.
- **How do you prevent a single failed service from taking down your entire request?** You push work to a queue, retry with exponential backoff, and move permanently failed jobs to a dead-letter queue.


Every phase of this project is a layer added on top of the previous one. The goal was to build something that could genuinely handle production traffic — not just pass a tutorial.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│              Browser UI  ·  Mobile  ·  Webhook Callers           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                            NGINX                                  │
│           Rate Limiting  ·  Load Balancing  ·  SSL               │
└──────────────┬────────────────────────────────────┬─────────────┘
               │ HTTP :3000                          │ WS :4000
               ▼                                     ▼
┌──────────────────────────┐           ┌─────────────────────────┐
│       API SERVER          │           │    WEBSOCKET SERVER      │
│  Express · TypeScript     │           │  ws · Auth · Heartbeat   │
│       JWT Auth · Zod      │           │  Real-time push          │
│  Rate limiting · Metrics  │           └────────────┬────────────┘
└──────────┬───────────────┘                        │
           │ enqueue job                             │ broadcast
           ▼                                         │
┌──────────────────────────┐           ┌─────────────▼────────────┐
│          REDIS             │◄─────────│       PUBLISHER           │
│  Cache  ·  Job Queue       │  pub/sub │  Worker publishes event   │
│  Pub/Sub ·  BullMQ store   │─────────►│  updates to Redis         │
└──────────┬───────────────┘           └──────────────────────────┘
           │ job available
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        WORKER PROCESS                            │
│   Event Processor  ·  Workflow Engine  ·  Step Executors         │
│   Webhook · Delay · Condition · Email  ·  DLQ handler            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ read / write
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL 15                              │
│  users · events · workflows · workflow_steps                     │
│  workflow_runs · workflow_step_runs                               │
└─────────────────────────────────────────────────────────────────┘
```

### How a request flows through the system

```
1.  User calls  POST /api/v1/events
                │
2.  Nginx receives request → rate limit check → forward to API
                │
3.  API validates with Zod → inserts row to PostgreSQL → pushes job to Redis
                │
4.  API responds 202 Accepted in ~22ms  ◄── user is already free
                │
5.  Worker (separate process) picks up job from Redis
                │
6.  Worker: updates status → 'processing' → runs business logic
                │
7.  Worker: updates status → 'completed' → busts Redis cache
                │
8.  Worker: publishes to Redis channel  events:user:{userId}
                │
9.  WebSocket server receives pub/sub message
                │
10. WebSocket server finds user's open connection → pushes update
                │
11. Browser receives  { type: 'event.completed', event: {...} }
                │
12. If any active workflows match this event type → trigger them
                │
13. Workflow engine enqueues each step as a BullMQ job
                │
14. Steps execute in order: webhook → delay → condition → email
```

---

## Quick Start

### Prerequisites

```bash
node --version   # v20.0.0 or higher
docker --version # v24.0.0 or higher
git --version    # any recent version
```

### Clone and run in 5 minutes

```bash
# 1. Clone the repository
git clone https://github.com/sanskar-git29/-FlowSync.git
cd -FlowSync

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Open .env and fill in the values — see Environment Variables section below

# 4. Start PostgreSQL and Redis
docker compose up -d

# 5. Run database migrations
npm run db:migrate

# 6. Start all three services in separate terminals
npm run dev          # Terminal 1 — API on :3000
npm run worker:dev   # Terminal 2 — Background worker
npm run ws:dev       # Terminal 3 — WebSocket server on :4000

# 7. Open the UI
# http://localhost:3000
```

### Verify everything is running

```bash
curl http://localhost:3000/health
# {"status":"ok","env":"development"}

curl http://localhost:3000/metrics | head -5
# # HELP process_cpu_user_seconds_total ...
```

---

## Project Structure

```
flowsync/
│
├── src/
│   ├── config/
│   │   └── env.ts                       # Typed env validation — crashes if vars missing
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.types.ts            # TypeScript interfaces
│   │   │   ├── auth.service.ts          # bcrypt hashing, JWT generation
│   │   │   ├── auth.controller.ts       # Thin HTTP handlers only
│   │   │   └── auth.routes.ts           # Routes with Zod validation
│   │   │
│   │   ├── events/
│   │   │   ├── events.types.ts
│   │   │   ├── events.service.ts        # DB queries + queue enqueue + cache
│   │   │   ├── events.controller.ts
│   │   │   └── events.routes.ts
│   │   │
│   │   └── workflows/
│   │       ├── workflows.types.ts       # Step config discriminated unions
│   │       ├── workflows.service.ts     # CRUD + engine trigger functions
│   │       ├── workflows.controller.ts
│   │       └── workflows.routes.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts           # JWT verification → req.user
│   │   ├── validate.middleware.ts       # Zod schema validation (reusable)
│   │   ├── rate.middleware.ts           # Per-route rate limiters
│   │   └── error.middleware.ts          # Global error handler
│   │
│   ├── shared/
│   │   ├── db/
│   │   │   ├── pool.ts                  # PostgreSQL connection pool
│   │   │   ├── migrate.ts               # Migration runner (no ORM)
│   │   │   └── migrations/
│   │   │       ├── 001_create_users.sql
│   │   │       ├── 002_create_events.sql
│   │   │       └── 003_create_workflows.sql
│   │   │
│   │   ├── redis/
│   │   │   ├── client.ts                # Two ioredis connections (cache + subscriber)
│   │   │   ├── cache.ts                 # getCache / setCache / deleteByPattern
│   │   │   └── publisher.ts             # publishEventUpdate → Redis pub/sub
│   │   │
│   │   ├── queues/
│   │   │   ├── bullmq-connection.ts     # Plain ConnectionOptions (NOT ioredis instance)
│   │   │   ├── queue.types.ts           # EventJobPayload, WorkflowJobPayload
│   │   │   ├── event.queue.ts           # Producer — enqueueEvent()
│   │   │   └── workflow.queue.ts        # Producer — enqueueWorkflowStep()
│   │   │
│   │   ├── logger.ts                    # Winston — dev=coloured, prod=JSON
│   │   └── metrics.ts                   # Prometheus counters, histograms, gauges
│   │
│   ├── workers/
│   │   ├── worker.ts                    # Entry point — two Workers in one process
│   │   └── processors/
│   │       ├── event.processor.ts       # Processes events + triggers workflows
│   │       ├── dlq.handler.ts           # Handles permanently failed jobs
│   │       ├── workflow.processor.ts    # Workflow engine — executes one step at a time
│   │       └── steps/
│   │           ├── webhook.step.ts      # Outgoing HTTP request with timeout
│   │           ├── delay.step.ts        # Returns delay ms for BullMQ
│   │           ├── condition.step.ts    # Dot-notation field evaluator
│   │           └── email.step.ts        # Resend email API
│   │
│   ├── websocket/
│   │   ├── subscriptions.ts             # Map<userId, Set<WebSocket>>
│   │   └── subscriber.ts                # Redis PSUBSCRIBE → broadcastToUser
│   │
│   ├── types/
│   │   └── express.d.ts                 # Augments Request with req.user
│   │
│   ├── app.ts                           # Express app — middleware + routes
│   ├── server.ts                        # HTTP server + metrics server startup
│   └── ws-server.ts                     # WebSocket server — separate process
│
├── public/
│   └── index.html                       # Complete UI — vanilla JS, no framework
│
├── infra/
│   ├── nginx/nginx.conf                 # Rate limiting + upstream config
│   ├── prometheus/prometheus.yml        # Scrape config
│   ├── grafana/dashboards/
│   │   └── flowsync.json                # Pre-built Grafana dashboard
│   └── docker/
│       ├── Dockerfile                   # Multi-stage build
│       └── .dockerignore
│
├── src/__tests__/
│   ├── setup.ts                         # Connect DB + Redis before all tests
│   ├── auth.service.test.ts             # 7 unit tests for auth
│   └── events.routes.test.ts            # 9 integration tests for events API
│
├── docker-compose.yml                   # Dev — PostgreSQL + Redis
├── docker-compose.prod.yml              # Prod — everything containerised
├── docker-compose.monitoring.yml        # Monitoring — Prometheus + Grafana
├── .env.example                         # All required variables with descriptions
├── vitest.config.ts                     # Test config with coverage thresholds
├── eslint.config.js                     # ESLint v9 flat config
├── tsconfig.json                        # Strict TypeScript, NodeNext modules
└── .github/workflows/ci.yml             # CI — typecheck, lint, test on every push
```

---

## API Reference

### Performance — v1 vs v2

| Endpoint | v1 Synchronous | v2 Async | Improvement |
|---|---|---|---|
| `POST /events` | ~4,000ms | ~22ms | **99.5% faster** |
| `GET /events` (cache miss) | ~4,000ms | ~15ms | **99.6% faster** |
| `GET /events` (cache hit) | ~4,000ms | ~2ms | **99.95% faster** |
| `GET /events/:id` | ~4,000ms | ~15ms | **99.6% faster** |
| Max throughput | ~8 req/s | ~450+ req/s | **56× more** |

### Authentication — `/api/v1/auth`

Rate limited: **10 requests per 15 minutes per IP**

| Method | Endpoint | Auth | Status | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | `201` | Create account, returns JWT pair |
| `POST` | `/auth/login` | No | `200` | Login, returns JWT pair |
| `POST` | `/auth/refresh` | No | `200` | Rotate tokens using refresh token |
| `GET` | `/auth/me` | Bearer | `200` | Get current user profile |

**Register / Login request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Events — `/api/v1/events`

Rate limited: **200 requests per minute per IP**. All routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Status | Description |
|---|---|---|---|
| `POST` | `/events` | `202` | Accept event for async processing |
| `GET` | `/events` | `200` | List events — paginated, Redis cached |
| `GET` | `/events/:id` | `200` | Get single event by ID |
| `DELETE` | `/events/:id` | `204` | Delete event, busts cache |

**Create event:**
```json
POST /api/v1/events
{
  "type": "order.placed",
  "payload": {
    "orderId": "ORD-123",
    "amount": 99.99
  }
}
```

**Response — 202 Accepted:**
```json
{
  "message": "Event accepted for processing",
  "event": {
    "id": "uuid",
    "type": "order.placed",
    "status": "pending",
    "createdAt": "2026-07-05T10:00:00.000Z"
  },
  "statusUrl": "/api/v1/events/uuid"
}
```

**Event status lifecycle:**
```
pending → processing → completed
                    ↘ failed (after all retries exhausted → DLQ)
```

**List events query parameters:**

| Parameter | Default | Max | Description |
|---|---|---|---|
| `page` | `1` | — | Page number |
| `limit` | `20` | `100` | Items per page |

### Workflows — `/api/v1/workflows`

All routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Status | Description |
|---|---|---|---|
| `POST` | `/workflows` | `201` | Create a workflow definition |
| `GET` | `/workflows` | `200` | List all user's workflows |
| `GET` | `/workflows/:id` | `200` | Get workflow with all steps |
| `DELETE` | `/workflows/:id` | `204` | Delete workflow |
| `POST` | `/workflows/:id/steps` | `201` | Add a step to a workflow |
| `GET` | `/workflows/:id/runs` | `200` | Get all execution history for a workflow |

**Create workflow:**
```json
POST /api/v1/workflows
{
  "name": "Order Notification",
  "triggerEventType": "order.placed"
}
```

**Add a step:**
```json
POST /api/v1/workflows/:id/steps
{
  "position": 1,
  "type": "webhook",
  "config": {
    "url": "https://your-app.com/webhook",
    "method": "POST",
    "headers": {}
  }
}
```

**Step types and their config:**

| Type | Config fields | What it does |
|---|---|---|
| `webhook` | `url`, `method`, `headers` | Makes an outgoing HTTP request |
| `delay` | `milliseconds` | Waits before the next step (BullMQ delayed job) |
| `condition` | `field`, `operator`, `value` | Evaluates a condition against the event context |
| `email` | `to`, `subject`, `body` | Sends an email via Resend |

**Condition operators:** `eq` `neq` `gt` `gte` `lt` `lte` `contains`

**Template placeholders in email step:**
```
subject: "New order for {{event.payload.amount}}"
body:    "Order {{event.payload.orderId}} has been placed"
```

---

## Docker Compose

Three compose files. Each serves a different purpose.

### `docker-compose.yml` — Local development

```bash
docker compose up -d
```

Starts **PostgreSQL** and **Redis** only. Your API, worker, and WebSocket server run locally with `npm run dev` so you get hot reload and can see logs directly.

| Service | Port | Purpose |
|---|---|---|
| `postgres` | `5432` | Primary database |
| `redis` | `6379` | Cache + job queue + pub/sub |

### `docker-compose.prod.yml` — Full production

```bash
docker compose -f docker-compose.prod.yml up -d
```

Runs everything containerised including Nginx. PostgreSQL and Redis have **no exposed ports** — they are only reachable from inside the Docker network. Only Nginx exposes port 80.

| Service | Exposed | Purpose |
|---|---|---|
| `nginx` | `:80` | Gateway — rate limiting + routing |
| `api` | Internal only | Express API (2 replicas) |
| `worker` | Internal only | BullMQ worker (2 replicas) |
| `ws` | Internal only | WebSocket server |
| `postgres` | Internal only | Database — never public |
| `redis` | Internal only | Cache + queue — never public |
| `prometheus` | Internal only | Metrics collection |
| `grafana` | `:3001` | Dashboards |

### `docker-compose.monitoring.yml` — Monitoring only

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Starts Prometheus and Grafana alongside your local dev setup.

| Service | Port | Purpose |
|---|---|---|
| `prometheus` | `:9091` | Scrapes `/metrics` every 15 seconds |
| `grafana` | `:3001` | Dashboard UI — login: admin/admin |

---






### Full stack overview

| Layer | Technology | Why this choice |
|---|---|---|
| Language | TypeScript 5 strict | Catches bugs at compile time, not production |
| Runtime | Node.js 20 | Async I/O is ideal for event-driven systems |
| API framework | Express.js | Minimal overhead, mature ecosystem, no magic |
| Validation | Zod | Schema generates TypeScript types — single source of truth |
| Database | PostgreSQL 15 | ACID, JSONB payloads, row-level security |
| Cache + broker | Redis 7 | Sub-ms reads, pub/sub, BullMQ storage |
| Job queue | BullMQ | Retry, DLQ, delay, TypeScript-first |
| Workers | Separate Node.js process | Crash isolation, independent scaling |
| Real-time | WebSockets (ws) | Persistent connection, server-push |
| Gateway | Nginx | Rate limiting before Node.js, load balancing |
| Security | Helmet.js | 11 HTTP security headers in one line |
| Compression | compression | 60-80% smaller JSON responses |
| Logging | Winston | JSON in production, coloured in dev |
| Metrics | prom-client | Standard Prometheus format |
| Dashboards | Grafana | Connects to Prometheus, live graphs |
| Containers | Docker + Compose | Dev/prod parity, one command startup |
| Testing | Vitest + Supertest | Fast, ESM-compatible, real HTTP tests |
| CI | GitHub Actions | Typecheck + lint + test on every push |

---

## Environment Variables

Copy `.env.example` to `.env`. Never commit a real `.env` file.

```env
# App
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db-name
DB_USER=your-dbusername
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=min_32_chars_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=different_min_32_chars_string
JWT_REFRESH_EXPIRES_IN=7d

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3

# WebSocket
WS_PORT=4000

# Metrics
METRICS_PORT=9090

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

---

## Database Schema

```sql
users (
  id            UUID PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ
)

events (
  id         UUID PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  type       VARCHAR(100),           -- 'order.placed'
  payload    JSONB,
  status     VARCHAR(50),            -- pending|processing|completed|failed
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

workflows (
  id                 UUID PRIMARY KEY,
  user_id            UUID REFERENCES users(id),
  name               VARCHAR(255),
  trigger_event_type VARCHAR(100),   -- fires when event.type matches this
  is_active          BOOLEAN DEFAULT true
)

workflow_steps (
  id          UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  position    INTEGER,               -- execution order
  type        VARCHAR(50),           -- webhook|delay|condition|email
  config      JSONB                  -- step-specific config
)

workflow_runs (
  id           UUID PRIMARY KEY,
  workflow_id  UUID REFERENCES workflows(id),
  event_id     UUID REFERENCES events(id),
  status       VARCHAR(50),          -- pending|running|completed|failed
  current_step INTEGER,
  context      JSONB                 -- data passed between steps
)

workflow_step_runs (
  id              UUID PRIMARY KEY,
  workflow_run_id UUID REFERENCES workflow_runs(id),
  step_id         UUID REFERENCES workflow_steps(id),
  position        INTEGER,
  status          VARCHAR(50),
  input           JSONB,
  output          JSONB,
  error           TEXT
)
```

---

## Monitoring

```bash
# Start Prometheus and Grafana
docker compose -f docker-compose.monitoring.yml up -d

# Prometheus UI — check targets are UP
http://localhost:9091

# Grafana dashboards — login: admin / admin
http://localhost:3001
```

**Add Prometheus data source in Grafana:**
Connections → Data Sources → Prometheus → URL: `http://prometheus:9090` → Save & Test

**Import dashboard:**
Dashboards → Import → Upload `infra/grafana/dashboards/flowsync.json`

**Key PromQL queries:**

```promql
# Request rate
sum(rate(http_requests_total[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# p95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Worker jobs per second
rate(worker_jobs_processed_total[5m])

# Dead letter queue — alert when > 0
worker_dlq_jobs
```

---

## Security

| Vulnerability | How FlowSync prevents it |
|---|---|
| **SQL injection** | Parameterized queries (`$1, $2`) on every DB call |
| **IDOR** | Every query scoped by `userId` from JWT — users cannot access other users' data |
| **Timing attack on login** | `bcrypt.compare` runs even for non-existent emails — response time never leaks email existence |
| **Brute force** | Auth routes: 10 req/15min. API: 100 req/min. Worker queue: 200 req/min |
| **JWT secret exposure** | Separate secrets for access (15m) and refresh (7d) tokens |
| **Duplicate job processing** | `jobId = eventId` as idempotency key — same event cannot enqueue twice |
| **XSS / Clickjacking** | Helmet.js adds 11 security headers on every response |
| **Response sniffing** | `X-Content-Type-Options: nosniff` via Helmet |

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:ci
```

Tests use a real test database. Make sure your `.env` is pointing to a test database before running.

```bash
# Current test coverage
# auth.service.test.ts  — 7 tests (register, login, timing attack prevention)
# events.routes.test.ts — 9 tests (CRUD, pagination, IDOR prevention)
```

---

## Available Scripts

```bash
npm run dev           # Start API with hot reload
npm run worker:dev    # Start worker with hot reload
npm run ws:dev        # Start WebSocket server with hot reload
npm run build         # Compile TypeScript to dist/
npm run typecheck     # Type check without emitting
npm run lint          # ESLint
npm run test          # Vitest
npm run test:ci       # Vitest with coverage
npm run db:migrate    # Run pending migrations
npm run db:reset      # Drop and recreate all tables (DEV ONLY)
```

---

## Contributing

FlowSync is open to contributions of all kinds. Whether you are fixing a bug, adding a test, improving documentation, or proposing a new feature — all are welcome.

### Getting started

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/sanskar-git29/-FlowSync.git
cd -FlowSync

# Create a branch — never from main

git checkout -b feature/your-feature-name

# Make your changes
npm run typecheck   # must pass
npm run lint        # must pass
npm test            # must pass

# Commit using Conventional Commits
git commit -m "feat(events): add filter by status query parameter"

# Push and open a PR targeting the develop branch
git push origin feature/your-feature-name
```

### Commit format

```
type(scope): short description

Types:   feat | fix | docs | refactor | test | perf | chore
Scopes:  auth | events | workflows | queue | worker | ws | db | cache | infra | docs

Examples:
feat(workflows): add parallel step execution
fix(cache):      prevent stale data on concurrent writes
test(events):    add integration test for pagination
docs(readme):    add workflow engine explanation
perf(db):        add composite index on events(user_id, status)
```

### Branch strategy

```
main      ← production only — never push directly
feature/* ← your work — branch from develop
fix/*     ← bug fixes — branch from develop
```

### PR checklist

Before opening a pull request:

- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm test` passes with 0 failures
- [ ] `.env.example` updated if you added new environment variables
- [ ] New functions have inline comments explaining the why, not the what

### Good first contributions

- Add more test coverage for the workflow engine
- Add a DELETE endpoint for workflow steps
- Add pagination to `GET /workflows/:id/runs`
- Add a `status` filter to `GET /events?status=completed`
- Replace the placeholder email template with HTML email support
- Add webhook signature verification (`X-FlowSync-Signature` header)
- Write a k6 load test script

---

## License

MIT — see [LICENSE](./LICENSE) for details.

Free to use, fork, learn from, and build on. Attribution appreciated but not required.

---

<div align="center">

Built by [Sanskar Kumar](https://github.com/sanskar-git29) while learning how to scale backend systems from zero to production.

If this helped you learn something — consider starring the repo ⭐

</div>
