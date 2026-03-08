# RTM Class MCP Server

NestJS + Fastify MCP server that stores AI generation output into PostgreSQL.

This server exposes 3 MCP tools:

- `insert_mcq`
- `insert_essay`
- `insert_summary`

## Overview

The tools **do not create jobs**. They insert AI output for an **existing** `AIJob` row, then mark that job as succeeded.

Main write tables:

- `AIJob`
- `AIOutput`

`AIOutput` has a unique `jobId`, so each job can only have one output row.

## Stack

- Node.js + NestJS 11
- Fastify (`@nestjs/platform-fastify`)
- `@rekog/mcp-nest` + `@modelcontextprotocol/sdk`
- PostgreSQL + TypeORM
- Redis (optional distributed lock for idempotency)
- Zod
- Winston (`nest-winston`)
- Jest

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

Important DB dependencies:

- Migration `AddAiJobAiOutputForeignKeys` adds foreign keys to existing `"Material"` and `"User"` tables.
- Run this service against a database/schema where those tables already exist.

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Copy environment file.

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` for your PostgreSQL instance.

4. Create DB and enable UUID extension.

```sql
CREATE DATABASE rtm;
\c rtm
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

5. Run migrations.

```bash
npm run migration:run
```

6. Start dev server.

```bash
npm run start:dev
```

Server listens on `http://localhost:3030` when `PORT=3030`.

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime mode: `development`, `test`, `production`. |
| `PORT` | No | `3000` | HTTP server port. |
| `DB_HOST` | Yes | - | PostgreSQL host. |
| `DB_PORT` | No | `5432` | PostgreSQL port. |
| `DB_USER` | Yes | - | PostgreSQL username. |
| `DB_PASS` | No | `""` | PostgreSQL password. |
| `DB_NAME` | Yes | - | PostgreSQL database name. |
| `DB_SYNC` | No | `false` | Parsed from env, but current TypeORM config hardcodes `synchronize: false`. |
| `REDIS_ENABLED` | No | `false` | Enable Redis connection and distributed insert locks. |
| `REDIS_HOST` | No | `127.0.0.1` | Redis host. |
| `REDIS_PORT` | No | `6379` | Redis port. |
| `REDIS_USER` | No | `""` | Redis ACL username. |
| `REDIS_PASS` | No | `""` | Redis password. |
| `REDIS_DB` | No | `0` | Redis database index. |
| `REDIS_KEY_PREFIX` | No | `rtm:mcp:` | Prefix for all Redis keys. |
| `REDIS_LOCK_TTL_MS` | No | `15000` | Lock TTL (ms) for insert tool execution. |
| `PY_AI_BASE_URL` | No | - | Present in `.env.example` but not used in app code. |

Example:

```env
NODE_ENV=development
PORT=3030
PY_AI_BASE_URL=http://localhost:8000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=rtm
DB_SYNC=false

REDIS_ENABLED=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USER=
REDIS_PASS=
REDIS_DB=0
REDIS_KEY_PREFIX=rtm:mcp:
REDIS_LOCK_TTL_MS=15000
```

When `REDIS_ENABLED=true`, each tool uses a distributed lock per `job_id + material_id` to reduce duplicate concurrent writes across instances.

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

## Migration Commands

```bash
# generate migration file from current entity changes
npm run migration:generate

# apply migrations
npm run migration:run

# rollback last migration
npm run migration:revert
```

## MCP Transports and Endpoints

This app config enables Streamable HTTP explicitly, and also keeps default transports from `@rekog/mcp-nest`.

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

- require an existing `AIJob` with `id = job_id`
- require `requested_by_id` and `material_id` to match that `AIJob`
- create one `AIOutput` row (if missing)
- set `AIJob.status = succeeded`, `completedAt = now()`, `lastError = null`
- are idempotent for duplicate inserts on the same `job_id` (return existing output with a `note`)

### `insert_mcq`

Stores `mcq_quiz` into `AIOutput.content`.

Return shape:

```json
{
  "jobId": "<AIJob.id>",
  "aiOutputId": "<AIOutput.id>",
  "questionsInserted": 2
}
```

### `insert_essay`

Stores `essay_quiz` into `AIOutput.content`.

Return shape:

```json
{
  "jobId": "<AIJob.id>",
  "aiOutputId": "<AIOutput.id>",
  "questionsInserted": 2
}
```

### `insert_summary`

Stores `summary` (plus optional `sources`, `warnings`) into `AIOutput.content`.

Return shape:

```json
{
  "jobId": "<AIJob.id>",
  "aiOutputId": "<AIOutput.id>",
  "keyPoints": 3
}
```

## Payload Contract

Current tool arguments are direct (not nested under `result`).

Common fields:

- `job_id: string` (must map to existing `AIJob.id`)
- `requested_by_id: string` (must match `AIJob.requestedById`)
- `material_id: string` (must match `AIJob.materialId`)
- `status?: "accepted" | "processing" | "succeeded" | "failed_processing" | "failed_delivery"` (accepted by schema, currently not used by tool logic)
- `parameters?: Record<string, unknown>` (accepted by schema, currently not used by tool logic)

Tool-specific fields:

- `insert_mcq`: `mcq_quiz.questions[]` with:
  - `question: string`
  - `options: string[4]`
  - `correct_answer: string`
  - `explanation: string`
- `insert_essay`: `essay_quiz.questions[]` with:
  - `question: string`
  - `expected_points: string | number`
- `insert_summary`: `summary` with:
  - `title: string`
  - `overview: string`
  - `key_points: string[]`
  - optional `sources[]` (`chunk_id?`, `source_id?`, `excerpt`)
  - optional `warnings[]` (`string`)

## Minimal Tool Payload Examples

### `insert_mcq` arguments

```json
{
  "job_id": "a3e02cfd-e03a-4b6e-84e5-f456f57a367c",
  "requested_by_id": "9be87f4f-0e09-42c8-960d-ab59797ad3f3",
  "material_id": "e21fc77a-5f1f-4f38-9c56-5fd055a9cb3e",
  "mcq_quiz": {
    "questions": [
      {
        "question": "What is MCP?",
        "options": ["Protocol", "Database", "Compiler", "Framework"],
        "correct_answer": "Protocol",
        "explanation": "MCP stands for Model Context Protocol."
      }
    ]
  }
}
```

### `insert_essay` arguments

```json
{
  "job_id": "a3e02cfd-e03a-4b6e-84e5-f456f57a367c",
  "requested_by_id": "9be87f4f-0e09-42c8-960d-ab59797ad3f3",
  "material_id": "e21fc77a-5f1f-4f38-9c56-5fd055a9cb3e",
  "essay_quiz": {
    "questions": [
      {
        "question": "Explain the benefits of MCP.",
        "expected_points": "5"
      }
    ]
  }
}
```

### `insert_summary` arguments

```json
{
  "job_id": "a3e02cfd-e03a-4b6e-84e5-f456f57a367c",
  "requested_by_id": "9be87f4f-0e09-42c8-960d-ab59797ad3f3",
  "material_id": "e21fc77a-5f1f-4f38-9c56-5fd055a9cb3e",
  "summary": {
    "title": "MCP Summary",
    "overview": "MCP standardizes context exchange between AI clients and servers.",
    "key_points": [
      "Standard protocol",
      "Tool/resource abstraction",
      "Supports multiple transports"
    ]
  },
  "sources": [],
  "warnings": []
}
```

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

Current tests include:

- Tool unit tests for:
  - `insert-mcq.tool.ts`
  - `insert-essay.tool.ts`
  - `insert-summary.tool.ts`