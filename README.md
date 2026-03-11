# RTM Class MCP Server

NestJS + Fastify MCP server that stores AI generation output into PostgreSQL.

This server exposes 3 MCP tools:

- `insert_mcq`
- `insert_essay`
- `insert_summary`

## Overview

The tools will insert AI output for an `AIJob` and then set that job to `succeeded`.

Main write tables:

- `AIJob`
- `AIOutput`

`AIOutput.jobId` is unique, so each job can only have one output row.

## Stack

- Node.js + NestJS 11
- Fastify (`@nestjs/platform-fastify`)
- `@rekog/mcp-nest` + `@modelcontextprotocol/sdk`
- PostgreSQL + Prisma Client
- Redis (optional distributed lock for idempotency)
- Zod
- Winston (`nest-winston`)
- Jest

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Generate Prisma client.

```bash
npm run prisma:generate
```

3. Copy environment file.

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Update `.env` for your PostgreSQL instance.

5. Start dev server.

```bash
npm run start:dev
```

Server listens on `http://localhost:3030` when `PORT=3030`.

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime mode: `development`, `test`, `production`. |
| `PORT` | No | `3000` | HTTP server port. |
| `DATABASE_URL` | No | - | Direct Prisma connection string. If empty, app builds URL from `DB_*`. |
| `DB_HOST` | Yes | - | PostgreSQL host (fallback when `DATABASE_URL` is not set). |
| `DB_PORT` | No | `5432` | PostgreSQL port (fallback when `DATABASE_URL` is not set). |
| `DB_USER` | Yes | - | PostgreSQL username (fallback when `DATABASE_URL` is not set). |
| `DB_PASS` | No | `""` | PostgreSQL password (fallback when `DATABASE_URL` is not set). |
| `DB_NAME` | Yes | - | PostgreSQL database name (fallback when `DATABASE_URL` is not set). |
| `REDIS_ENABLED` | No | `false` | Enable Redis connection and distributed insert locks. |
| `REDIS_HOST` | No | `127.0.0.1` | Redis host. |
| `REDIS_PORT` | No | `6379` | Redis port. |
| `REDIS_USER` | No | `""` | Redis ACL username. |
| `REDIS_PASS` | No | `""` | Redis password. |
| `REDIS_DB` | No | `0` | Redis database index. |
| `REDIS_KEY_PREFIX` | No | `rtm:mcp:` | Prefix for all Redis keys. |
| `REDIS_LOCK_TTL_MS` | No | `15000` | Lock TTL (ms) for insert tool execution. |
| `PY_AI_BASE_URL` | No | - | Present in `.env.example` but not used in app code. |

## Run Commands

```bash
# build
npm run build

# start
npm run start

# start in watch mode
npm run start:dev

# start production build
npm run start:prod
```

## Prisma Commands

```bash
# generate prisma client
npm run prisma:generate

# open prisma studio
npm run prisma:studio
```

## MCP Transports and Endpoints

### Streamable HTTP

- `POST /mcp`
- `GET /mcp`
- `DELETE /mcp`

Current module config:

- `statelessMode: false`
- custom session IDs (`randomUUID()`)
- `enableJsonResponse: false`

### Legacy SSE

- `GET /sse`
- `POST /messages`

### STDIO

STDIO transport is also active (default transport from `@rekog/mcp-nest`) when running the Nest process.

### Basic app route

- `GET /` -> `Hello World!`

## Tool Behavior

All three tools share these rules:

- require `requested_by_id` and `material_id`
- resolve `AIJob` by `id` first, then `externalJobId`
- auto-create job when no row exists
- create one `AIOutput` row (if missing)
- set `AIJob.status = succeeded`, `completedAt = now()`, `lastError = null`
- are idempotent for duplicate inserts on the same `job_id`

### `insert_mcq`

Stores `mcq_quiz` into `AIOutput.content`.

### `insert_essay`

Stores `essay_quiz` into `AIOutput.content`.

### `insert_summary`

Stores `summary` (plus optional `sources`, `warnings`) into `AIOutput.content`.

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```
