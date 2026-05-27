FlowSync professional README.md template
Copy this exactly as your README.md — replace placeholders in [ ]
# Everything below goes into README.md at the root of your repo

<div align="center">

# FlowSync

**Production-grade real-time event processing and workflow automation platform**

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=flat&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=flat)

</div>

---

## Overview

FlowSync is a scalable backend platform for ingesting, processing,
and routing events through user-defined workflows in real time.
Built to learn and demonstrate production backend engineering:
distributed queues, async workers, real-time WebSocket delivery,
and horizontal scaling.

> Built as a deep-dive into backend engineering — not a tutorial clone.
> Every architectural decision is intentional and documented.

---

## Architecture

```
Client → Nginx → API Servers (Express/TS) → PostgreSQL
                      ↓                         ↑
                   BullMQ ←→ Redis ←→ Workers ──┘
                                  ↓
                          WebSocket Server → Client (real-time)
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system design.

---

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 + TypeScript 5 | Type-safe server-side JS |
| API | Express.js | REST API framework |
| Database | PostgreSQL 15 | Primary data store |
| Cache / Queue broker | Redis 7 | Caching, pub/sub, job broker |
| Job queues | BullMQ | Async job processing |
| Real-time | WebSockets (ws) | Live event push to clients |
| Gateway | Nginx | Load balancing, rate limiting |
| Containers | Docker + Compose | Dev/prod environment parity |
| Monitoring | Prometheus + Grafana | Metrics and alerting |

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### Local development

```bash
# 1. Clone the repository
git clone https://github.com/sanskar-git29/flowsync.git
cd flowsync

# 2. Copy environment variables
cp .env.example .env

# 3. Start infrastructure (Postgres + Redis)
docker compose up -d postgres redis

# 4. Install dependencies
npm install

# 5. Run database migrations
npm run db:migrate

# 6. Start the API in dev mode
npm run dev
```

API is now running at `http://localhost:3000`
Health check: `GET http://localhost:3000/health`

---

## Project structure

```
flowsync/
├── services/
│   ├── api/          # Express REST API
│   ├── worker/       # BullMQ job workers
│   └── websocket/    # WebSocket server
├── shared/           # DB, Redis, config, logger
├── infra/            # Docker, Nginx, monitoring config
├── docs/             # Architecture docs
└── docker-compose.yml
```

---

## Development workflow

This project follows **GitFlow** branching strategy
and **Conventional Commits** specification.

```
main        → production-ready releases only
develop     → integration branch for completed features
feature/*   → one branch per feature, merged into develop
fix/*       → bug fixes, merged into develop (or main for hotfixes)
```

Commit format: `type(scope): description`
Examples:
- `feat(auth): add JWT refresh token endpoint`
- `fix(queue): handle null payload in processor`
- `chore: add eslint configuration`

---

## Roadmap

- [x] Phase 1 — Core API, auth, PostgreSQL
- [ ] Phase 2 — Redis caching, BullMQ queues, workers
- [ ] Phase 3 — WebSocket real-time, workflow engine
- [ ] Phase 4 — Nginx, monitoring, horizontal scaling

---

## Environment variables

See [.env.example](./.env.example) for all required variables.
**Never commit a real .env file.**

---

## Contributing

This is a learning project. Issues and suggestions welcome.

---

## License

MIT — see [LICENSE](./LICENSE)
