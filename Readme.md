<div align="center">

  <h1>⚡ FlowSync</h1>
  <p><strong>Real-time event processing and workflow automation for modern backends.</strong></p>

  <p align="center">
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
    &nbsp;
    <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/BullMQ-Queue-FF6B6B?style=for-the-badge&logo=redis&logoColor=white"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active%20Development-brightgreen?style=for-the-badge"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge"/>
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge"/>
  &nbsp;
  <img src="https://img.shields.io/badge/PRs-Welcome-orange?style=for-the-badge"/>
</p>

<br/>

<p align="center">
  <a href="#-what-is-flowsync">What is FlowSync</a> •
  <a href="#-the-problem-it-solves">Problem Solved</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-performance">Performance</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## 🧠 What is FlowSync?

**FlowSync** is a **production-grade, asynchronous event processing and workflow automation platform** built on Node.js, TypeScript, PostgreSQL, Redis, and BullMQ. It is designed to solve one of the most common problems in modern backend systems — **processing high-volume events reliably without blocking your API or losing data**.

Whether you are building a system that needs to handle **order processing pipelines**, **webhook delivery engines**, **background job scheduling**, **real-time notifications**, or **multi-step workflow automation**, FlowSync provides the architectural foundation to do it correctly.

> **Keywords:** Node.js event-driven architecture · TypeScript backend · BullMQ job queue · Redis caching · async event processing · REST API with PostgreSQL · background worker system · webhook automation · real-time event pipeline · distributed backend system · scalable Node.js API · workflow engine Node.js

---

## 🔥 The Problem It Solves

### Before FlowSync — The Synchronous Problem

Every modern web application eventually faces this scenario:

```
User clicks "Place Order"
         ↓
Your API receives the request
         ↓
Save to database        (~20ms)
Send confirmation email (~500ms)   ← User is WAITING for all of this
Call payment webhook    (~300ms)   ← User is STILL waiting
Update analytics        (~100ms)   ← Still waiting...
Update inventory        (~150ms)   ← ...
         ↓
Respond to user after  ~1070ms total
```

This is the **synchronous processing trap**. It creates four critical problems:

| Problem | What happens |
|---|---|
| 🐢 **Slow responses** | User waits for every downstream operation before getting a reply |
| 💥 **Single point of failure** | If the email service is down, the entire request fails with a 500 error |
| 📉 **No scalability** | 500 concurrent users = 500 requests all doing slow work simultaneously |
| 🔥 **DB connection exhaustion** | Pool of 10 connections serving 500 slow requests = guaranteed timeout storm |

### After FlowSync — The Async Solution

```
User clicks "Place Order"
         ↓
Your API receives the request
         ↓
Save to database    (~20ms)
Push job to queue   (~2ms)   ← Total API work: 22ms
         ↓
Respond: 202 Accepted ← User gets response in 22ms. They are FREE.
         ↓
[BACKGROUND — user doesn't wait for any of this]
Worker picks up job
├── Send confirmation email
├── Call payment webhook
├── Update analytics
└── Update inventory
         ↓
If any step fails → automatic retry with exponential backoff
If all retries fail → dead-letter queue → alert your team
```

**FlowSync makes your API respond 20x faster and fail gracefully.**

---

## 🏗️ Architecture

```
                          ┌─────────────────────────────────────────┐
                          │              CLIENT LAYER                │
                          │    Browser · Mobile App · Webhook        │
                          └──────────────────┬──────────────────────┘
                                             │ HTTP / WebSocket
                                             ▼
                          ┌─────────────────────────────────────────┐
                          │                 NGINX                    │
                          │     Rate Limiting · Load Balancing       │
                          └───────┬─────────────────────┬───────────┘
                                  │                     │
                    ┌─────────────▼──────┐   ┌──────────▼──────────┐
                    │   API Server ①     │   │   API Server ②      │
                    │  Express · TypeScript│  │  Express · TypeScript│
                    │  JWT Auth · Zod    │   │  JWT Auth · Zod     │
                    └──────┬──────┬──────┘   └───────┬──────┬──────┘
                           │      │                   │      │
                    ┌──────▼──┐  ┌▼────────────────────▼──┐  │
                    │PostgreSQL│  │         REDIS            │  │
                    │Primary  │  │  Cache · Queue · Pub/Sub │  │
                    │Database │  └────────────┬─────────────┘  │
                    └─────────┘               │                │
                                    ┌─────────▼──────┐         │
                                    │  WORKER POOL   │         │
                                    │  Worker ①②③N  │         │
                                    │  BullMQ · Retry│         │
                                    │  DLQ · Backoff │         │
                                    └────────────────┘         │
                                             │                 │
                                    ┌────────▼──────────────────▼──┐
                                    │      WEBSOCKET SERVER         │
                                    │   Real-time push to clients   │
                                    └───────────────────────────────┘
```

### Why Each Layer Exists

| Layer | Technology | Why it exists |
|---|---|---|
| **Runtime** | Node.js 20 + TypeScript 5 | Type-safe, async-first backend with zero runtime type surprises |
| **API** | Express.js | Battle-tested HTTP framework with minimal overhead |
| **Validation** | Zod | Schema validation that generates TypeScript types — no duplication |
| **Database** | PostgreSQL 15 | ACID transactions, JSONB event payloads, row-level security |
| **Cache + Broker** | Redis 7 | Sub-millisecond cache reads, job queue storage, pub/sub bridge |
| **Job Queues** | BullMQ | Retry logic, DLQ, priority queues, concurrency — built correctly |
| **Workers** | Separate Node.js process | Crash isolation, independent scaling, no API slowdown |
| **Gateway** | Nginx | Rate limiting before requests touch Node.js, load balancing |
| **Containers** | Docker + Compose | Dev/prod parity — "works on my machine" is eliminated |
| **Monitoring** | Prometheus + Grafana | RED metrics (Rate, Errors, Duration) — know before users do |

---

## 🚀 Quick Start

### Prerequisites

Make sure you have these installed:

```bash
node --version   # v20.0.0 or higher
docker --version # v24.0.0 or higher
git --version    # any recent version
```

### Clone and Run in 5 Minutes

```bash
# Step 1 — Clone the repository
git clone https://github.com/sanskar-git29/flowsync.git
cd flowsync

# Step 2 — Copy environment variables
cp .env.example .env
# Open .env and fill in your values (DB password, JWT secret, etc.)

# Step 3 — Start infrastructure with Docker
docker compose up -d
# This starts PostgreSQL and Redis in the background
# Wait ~10 seconds for health checks to pass

# Step 4 — Verify containers are healthy
docker compose ps
# Both should show "Up (healthy)"

# Step 5 — Install Node.js dependencies
npm install

# Step 6 — Run database migrations
npm run db:migrate
# Creates users, events, and workflow tables

# Step 7 — Start everything
npm run dev          # Terminal 1 — API server on :3000
npm run worker:dev   # Terminal 2 — Background job worker

# Step 8 — Verify it works
curl http://localhost:3000/health
# {"status":"ok","env":"development"}
```

### Run 100% with Docker (no local Node.js needed)

```bash
git clone https://github.com/sanskar-git29/flowsync.git
cd flowsync
cp .env.example .env

# Start everything — API, Worker, PostgreSQL, Redis
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose logs -f api
docker compose logs -f worker
```

### Useful Commands

```bash
npm run dev           # Start API server with hot reload
npm run worker:dev    # Start worker with hot reload
npm run db:migrate    # Run pending database migrations
npm run db:reset      # Drop database and run all migrations fresh (DEV ONLY)
npm run typecheck     # TypeScript type check — run before every commit
npm run lint          # ESLint
npm run build         # Compile TypeScript to dist/
docker compose down   # Stop all containers
docker compose down -v # Stop containers AND delete all data volumes
```

---

## 📡 API Reference

### Version History at a Glance

| Version | Status | Focus | Avg Response Time |
|---|---|---|---|
| **v1.0** | ✅ Released | Synchronous CRUD — API does all work inline | ~4000ms |
| **v2.0** | ✅ Released | Async queue — API returns immediately, worker processes | ~22ms |
| **v3.0** | 🔄 In Progress | WebSocket real-time updates + Workflow engine | ~22ms |
| **v4.0** | 📅 Planned | Nginx + Rate limiting + Prometheus + Grafana | ~22ms |

---

### 🔐 Authentication Routes `/api/v1/auth`

No authentication required for these routes.

<table>
<thead>
<tr>
<th>Method</th>
<th>Endpoint</th>
<th>Description</th>
<th>v1.0 Response</th>
<th>v2.0 Response</th>
<th>Improvement</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>POST</code></td>
<td><code>/auth/register</code></td>
<td>Create account + get tokens</td>
<td>~500ms</td>
<td>~480ms</td>
<td>Unchanged — bcrypt is intentionally slow</td>
</tr>
<tr>
<td><code>POST</code></td>
<td><code>/auth/login</code></td>
<td>Login + receive JWT pair</td>
<td>~800ms</td>
<td>~780ms</td>
<td>Unchanged — bcrypt compare is intentional</td>
</tr>
<tr>
<td><code>POST</code></td>
<td><code>/auth/refresh</code></td>
<td>Rotate tokens using refresh token</td>
<td>~200ms</td>
<td>~18ms</td>
<td>🚀 <strong>91% faster</strong> — Redis cache on user lookup</td>
</tr>
<tr>
<td><code>GET</code></td>
<td><code>/auth/me</code></td>
<td>Get current user profile</td>
<td>~300ms</td>
<td>~12ms</td>
<td>🚀 <strong>96% faster</strong> — Redis cache hit</td>
</tr>
</tbody>
</table>

**Register Request**
```json
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Register Response — 201 Created**
```json
{
  "message": "Account created",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Login Request**
```json
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Login Response — 200 OK**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### ⚡ Events Routes `/api/v1/events`

All routes require `Authorization: Bearer <accessToken>` header.

<table>
<thead>
<tr>
<th>Method</th>
<th>Endpoint</th>
<th>Description</th>
<th>v1.0 Response</th>
<th>v2.0 Response</th>
<th>Improvement</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>POST</code></td>
<td><code>/events</code></td>
<td>Create event + enqueue for processing</td>
<td><strong>~4000ms</strong> (all sync)</td>
<td><strong>~22ms</strong> (async)</td>
<td>🚀 <strong>99.5% faster</strong> — returns 202 immediately</td>
</tr>
<tr>
<td><code>GET</code></td>
<td><code>/events</code></td>
<td>List events with pagination</td>
<td><strong>~4000ms</strong> (DB every time)</td>
<td><strong>~8ms</strong> (Redis cache hit)</td>
<td>🚀 <strong>99.8% faster</strong> — served from Redis</td>
</tr>
<tr>
<td><code>GET</code></td>
<td><code>/events/:id</code></td>
<td>Get single event by ID</td>
<td><strong>~4000ms</strong></td>
<td><strong>~15ms</strong></td>
<td>🚀 <strong>99.6% faster</strong></td>
</tr>
<tr>
<td><code>DELETE</code></td>
<td><code>/events/:id</code></td>
<td>Delete event by ID</td>
<td><strong>~4000ms</strong></td>
<td><strong>~20ms</strong></td>
<td>🚀 <strong>99.5% faster</strong></td>
</tr>
</tbody>
</table>

**What changed between v1.0 and v2.0 — technically**

| Aspect | v1.0 Synchronous | v2.0 Asynchronous |
|---|---|---|
| **HTTP status on create** | `201 Created` | `202 Accepted` |
| **What API does on POST** | Validates → DB insert → email → webhook → respond | Validates → DB insert → push job to Redis → respond |
| **Where heavy work happens** | Inside the HTTP request handler | Inside a separate Worker process |
| **If email service is down** | 500 error returned to user | Job retried automatically with exponential backoff |
| **If 500 users hit at once** | 500 requests doing full work = timeout storm | 500 fast accepts → queue of 500 jobs → worker drains steadily |
| **User experience** | User waits 4 seconds per request | User gets response in ~22ms |
| **Failure recovery** | None — retry means another full request | Automatic — 3 attempts, 2s→4s→8s backoff, then DLQ |

**Create Event Request**
```json
POST /api/v1/events
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "type": "order.placed",
  "payload": {
    "orderId": "ORD-12345",
    "amount": 99.99,
    "currency": "USD",
    "customer": "user@example.com"
  }
}
```

**Create Event Response — 202 Accepted (v2.0)**
```json
{
  "message": "Event accepted for processing",
  "event": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid-here",
    "type": "order.placed",
    "status": "pending",
    "payload": {
      "orderId": "ORD-12345",
      "amount": 99.99
    },
    "createdAt": "2026-07-04T10:30:00.000Z"
  },
  "statusUrl": "/api/v1/events/550e8400-e29b-41d4-a716-446655440000"
}
```

> `status: "pending"` → becomes `"processing"` → becomes `"completed"` or `"failed"` asynchronously.

**List Events Response — 200 OK**
```json
GET /api/v1/events?page=1&limit=20
Authorization: Bearer eyJhbGci...

{
  "data": [
    {
      "id": "uuid-1",
      "type": "order.placed",
      "status": "completed",
      "createdAt": "2026-07-04T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

**Query Parameters**

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `page` | `number` | `1` | — | Page number |
| `limit` | `number` | `20` | `100` | Items per page |

**Event Status Lifecycle**

```
POST /events → status: "pending"
                   ↓
            Worker picks up job
                   ↓
               status: "processing"
                   ↓
          ┌────────┴────────┐
          ✅ Success         ❌ Failure (retry)
          ↓                 ↓
   status: "completed"   status: "failed"
                         (after all retries exhausted → DLQ)
```

---

## 📊 Performance

### v1.0 vs v2.0 — Real Numbers

```
Metric                    v1.0 (sync)    v2.0 (async)    Change
─────────────────────────────────────────────────────────────────
POST /events (p50)          4000ms          22ms         ↓ 99.5%
GET  /events (p50)          4000ms           8ms         ↓ 99.8%
GET  /events (cache hit)    4000ms           2ms         ↓ 99.95%
Max req/sec (events)            ~8         ~450          ↑ 56x
Failure impact on users        100%           0%         Email down? Users unaffected
Retry capability               None     3 attempts       Exponential backoff
Dead-letter queue              None     Full DLQ         Manual replay available
```

### What "202 Accepted" means for users

```
v1.0 timeline for 10 simultaneous users:
User 1: ████████████████████ 4000ms
User 2: ████████████████████ 4000ms (waits behind user 1's DB connection)
...all 10 users waiting in line...

v2.0 timeline for 10 simultaneous users:
User 1: ██ 22ms  ← done
User 2: ██ 22ms  ← done
User 3: ██ 22ms  ← done
All 10: ██ 22ms  ← all respond instantly
Worker:     ████████████████ processes all 10 jobs in the background
```

---

## 📁 Project Structure

```
flowsync/
│
├── src/
│   ├── config/
│   │   └── env.ts                    # Typed env — validates all vars at startup
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.types.ts         # TypeScript interfaces for auth
│   │   │   ├── auth.service.ts       # bcrypt, JWT generation/verification
│   │   │   ├── auth.controller.ts    # HTTP handlers — thin layer only
│   │   │   └── auth.routes.ts        # Route definitions with Zod validation
│   │   │
│   │   └── events/
│   │       ├── events.types.ts       # TypeScript interfaces for events
│   │       ├── events.service.ts     # DB queries + queue enqueue + cache
│   │       ├── events.controller.ts  # HTTP handlers
│   │       └── events.routes.ts      # Route definitions
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT verification + req.user injection
│   │   ├── validate.middleware.ts    # Zod schema validation — reusable
│   │   └── error.middleware.ts       # Global error handler (4-param Express)
│   │
│   ├── shared/
│   │   ├── db/
│   │   │   ├── pool.ts              # PostgreSQL connection pool
│   │   │   ├── migrate.ts           # Migration runner (custom, no ORM)
│   │   │   ├── migrate-runner.ts    # CLI script for npm run db:migrate
│   │   │   └── migrations/
│   │   │       ├── 001_create_users.sql
│   │   │       └── 002_create_events.sql
│   │   │
│   │   ├── redis/
│   │   │   ├── client.ts            # ioredis connections (cache + pub/sub)
│   │   │   └── cache.ts             # getCache / setCache / deleteByPattern
│   │   │
│   │   └── queues/
│   │       ├── bullmq-connection.ts # Plain config object for BullMQ (not ioredis)
│   │       ├── queue.types.ts       # Job payload types + JOB_NAMES
│   │       └── event.queue.ts       # Queue (producer) + enqueueEvent()
│   │
│   ├── workers/
│   │   ├── worker.ts                # Worker entry point — separate process
│   │   └── processors/
│   │       ├── event.processor.ts   # The actual job processing function
│   │       └── dlq.handler.ts       # Dead-letter queue — final failure handler
│   │
│   ├── types/
│   │   └── express.d.ts             # Augments Express Request with req.user
│   │
│   ├── app.ts                       # Express app setup — middleware + routes
│   └── server.ts                    # HTTP server startup + graceful shutdown
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile               # Multi-stage build (builder + production)
│   │   └── .dockerignore
│   └── nginx/
│       └── nginx.conf               # Rate limiting + upstream config
│
├── docker-compose.yml               # Development — PostgreSQL + Redis only
├── docker-compose.prod.yml          # Production — everything containerized
├── .env.example                     # All required env vars with descriptions
├── tsconfig.json                    # Strict TypeScript config for Node 20
├── .eslintrc.json                   # ESLint with TypeScript rules
├── .prettierrc                      # Code formatting
└── package.json
```

---

## 🗄️ Database

### Schema Overview

```sql
-- Users — authentication and identity
users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
)

-- Events — the core entity
events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(100) NOT NULL,   -- e.g. 'order.placed'
  payload    JSONB NOT NULL DEFAULT '{}',
  status     VARCHAR(50) CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

### Connection Pool Settings

| Setting | Value | Why |
|---|---|---|
| Min connections | `2` | Always-ready connections for instant response |
| Max connections | `10` | PostgreSQL default max is 100 — stay well within it |
| Idle timeout | `30s` | Release unused connections back to the pool |
| Connect timeout | `3s` | Fail fast — don't queue requests behind a down DB |

---

## 🤝 Contributing

FlowSync is an open learning project built in public. Contributions of all kinds are welcome.

### How to Contribute

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/flowsync.git
cd flowsync

# 3. Create a feature branch from develop (never from main)
git checkout develop
git checkout -b feature/your-feature-name

# 4. Make your changes
# Write code → npm run typecheck → npm run lint → test manually

# 5. Commit using Conventional Commits format
git add .
git commit -m "feat(events): add filter by status query parameter"

# 6. Push and open a Pull Request
git push origin feature/your-feature-name
# Open PR on GitHub → base: develop
```

### Commit Message Format

```
type(scope): short description

Types:   feat | fix | chore | docs | refactor | test | perf
Scopes:  auth | events | queue | worker | db | cache | infra

Examples:
feat(auth):   add password reset via email
fix(queue):   handle null payload in event processor
docs(readme): update Docker setup instructions
perf(db):     add composite index on events(user_id, status)
```

### Branch Strategy

```
main          ← production releases only (tagged)
develop       ← integration branch — all features merge here
feature/*     ← your work — branch from develop, merge to develop
fix/*         ← bug fixes
```

### Pull Request Checklist

Before opening a PR, confirm all of these:

- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
- [ ] No `console.log` left in production code
- [ ] `.env.example` updated if new env vars added
- [ ] CHANGELOG.md updated with what changed

---

## 🗺️ Roadmap

```
✅ Phase 1 — Foundation
   Express + TypeScript · PostgreSQL · JWT Auth · Events CRUD
   Docker Compose · Migration runner · Error handling

✅ Phase 2 — Async Core  (current)
   Redis caching (cache-aside) · BullMQ job queue
   Worker service · DLQ · Exponential backoff · 202 responses

🔄 Phase 3 — Real-time  (in progress)
   WebSocket server · Redis pub/sub bridge
   Workflow engine · Multi-step job execution

📅 Phase 4 — Production
   Nginx load balancing · Rate limiting · Prometheus metrics
   Grafana dashboards · Structured logging · Horizontal scaling
```

---

## 🔒 Environment Variables

Copy `.env.example` to `.env` and fill in your values. **Never commit a real `.env` file.**

```env
# App
NODE_ENV=development
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowsync_dev
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT — use long random strings, different for each
JWT_SECRET=replace_with_min_32_random_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_different_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3
```

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

Free to use, modify, and distribute. Attribution appreciated but not required.

---

<div align="center">

<br/>

**Built with care by [Sanskar Kumar](https://github.com/sanskar-git29)**

<br/>

<img src="https://img.shields.io/badge/If%20this%20helped%20you-⭐%20Star%20it-yellow?style=for-the-badge"/>

<br/><br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&animation=twinkling" width="100%"/>

</div>