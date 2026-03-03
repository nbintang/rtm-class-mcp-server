# RTM Class MCP Server

NestJS + Fastify MCP server for persisting generated learning content to PostgreSQL.

This server exposes 3 MCP tools:

- `insert_mcq`
- `insert_essay`
- `insert_summary`

## Overview

Incoming generation payloads are validated with Zod schemas, then inserted transactionally into PostgreSQL using TypeORM entities.

Main write tables:

- `generation_jobs`
- `generation_sources`
- `generation_warnings`
- `mcq_quizzes`
- `mcq_questions`
- `essay_quizzes`
- `essay_questions`
- `summaries`

## Stack

- Node.js + NestJS 11
- Fastify (`@nestjs/platform-fastify`)
- `@rekog/mcp-nest` + `@modelcontextprotocol/sdk`
- PostgreSQL + TypeORM
- Redis (optional distributed lock for insert idempotency)
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

2. Copy environment file.

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` for your PostgreSQL instance.

4. Create database and enable UUID extension.

```sql
CREATE DATABASE rtm;
\c rtm
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

5. Run migrations.

```bash
npm run migration:run
```

6. Start development server.

```bash
npm run start:dev
```

Server will listen on `http://localhost:3030` when `PORT=3030`.

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
| `DB_SYNC` | No | `false` | TypeORM synchronize mode. Keep `false` in normal environments. |
| `REDIS_ENABLED` | No | `false` | Enable Redis connection and distributed insert locks. |
| `REDIS_HOST` | No | `127.0.0.1` | Redis host. |
| `REDIS_PORT` | No | `6379` | Redis port. |
| `REDIS_USER` | No | `""` | Redis ACL username. |
| `REDIS_PASS` | No | `""` | Redis password. |
| `REDIS_DB` | No | `0` | Redis database index. |
| `REDIS_KEY_PREFIX` | No | `rtm:mcp:` | Prefix for all Redis keys. |
| `REDIS_LOCK_TTL_MS` | No | `15000` | Lock TTL (ms) for insert tool execution. |
| `PY_AI_BASE_URL` | No | - | Present in `.env.example` but currently not used in application code. |

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

When `REDIS_ENABLED=true`, `insert_mcq`, `insert_essay`, and `insert_summary` use a distributed lock per `job_id + document_id` to reduce duplicate concurrent writes across multiple app instances.

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

## MCP Transport Endpoints

This server enables both legacy SSE and Streamable HTTP transports from `@rekog/mcp-nest`.

### Streamable HTTP (recommended)

- `POST /mcp`
- `GET /mcp`
- `DELETE /mcp`

The module is configured in stateful mode (`statelessMode: false`) with custom session IDs.

### Legacy SSE transport

- `GET /sse`
- `POST /messages`

### Basic app route

- `GET /` -> `Hello World!`

## Available Tools

### `insert_mcq`

Insert one MCQ generation payload:

- upsert-like behavior for `generation_jobs` by `job_id` (create if missing)
- insert sources and warnings
- insert one `mcq_quizzes` row and its `mcq_questions`

Returned payload (tool result):

```json
{
  "jobId": "<generation_jobs.id>",
  "mcqQuizId": "<mcq_quizzes.id>",
  "questionsInserted": 2
}
```

### `insert_essay`

Insert one essay generation payload:

- create `generation_jobs` if not exists
- insert sources and warnings
- insert one `essay_quizzes` row and its `essay_questions`

Returned payload:

```json
{
  "jobId": "<generation_jobs.id>",
  "essayQuizId": "<essay_quizzes.id>",
  "questionsInserted": 2
}
```

### `insert_summary`

Insert one summary generation payload:

- create `generation_jobs` if not exists
- insert sources and warnings
- insert one `summaries` row

Returned payload:

```json
{
  "jobId": "<generation_jobs.id>",
  "summaryId": "<summaries.id>",
  "keyPoints": 3
}
```

## Payload Contract

All tools share this base shape:

```json
{
  "event": "material.generated",
  "job_id": "job-1",
  "status": "SUCCESS",
  "user_id": "user-1",
  "result": {
    "user_id": "user-1",
    "document_id": "doc-1",
    "attempt": 1,
    "finished_at": "2026-03-01T09:00:00.000Z",
    "material": {
      "filename": "file.pdf",
      "file_type": "application/pdf",
      "extracted_chars": 1200
    },
    "sources": [
      {
        "chunk_id": "c1",
        "source_id": "src-1",
        "excerpt": "source excerpt"
      }
    ],
    "warnings": [],
    "tool_calls": []
  }
}
```

Tool-specific required keys inside `result`:

- `insert_mcq`: `mcq_quiz.questions[]` with `question`, `options[]`, `correct_answer`, `explanation`
- `insert_essay`: `essay_quiz.questions[]` with `question`, `expected_points`
- `insert_summary`: `summary` with `title`, `overview`, `key_points[]`

## Minimal Tool Payload Examples

### `insert_mcq` arguments

```json
{
  "event": "material.generated",
  "job_id": "job-mcq-1",
  "status": "SUCCESS",
  "user_id": "user-1",
  "result": {
    "user_id": "user-1",
    "document_id": "doc-1",
    "attempt": 1,
    "finished_at": "2026-03-01T09:00:00.000Z",
    "material": {
      "filename": "sample.pdf",
      "file_type": "application/pdf",
      "extracted_chars": 980
    },
    "sources": [],
    "warnings": [],
    "tool_calls": [],
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
}
```

### `insert_essay` arguments

```json
{
  "event": "material.generated",
  "job_id": "job-essay-1",
  "status": "SUCCESS",
  "user_id": "user-1",
  "result": {
    "user_id": "user-1",
    "document_id": "doc-1",
    "attempt": 1,
    "finished_at": "2026-03-01T09:00:00.000Z",
    "material": {
      "filename": "sample.pdf",
      "file_type": "application/pdf",
      "extracted_chars": 980
    },
    "sources": [],
    "warnings": [],
    "tool_calls": [],
    "essay_quiz": {
      "questions": [
        {
          "question": "Explain the benefits of MCP.",
          "expected_points": "5"
        }
      ]
    }
  }
}
```

### `insert_summary` arguments

```json
{
  "event": "material.generated",
  "job_id": "job-summary-1",
  "status": "SUCCESS",
  "user_id": "user-1",
  "result": {
    "user_id": "user-1",
    "document_id": "doc-1",
    "attempt": 1,
    "finished_at": "2026-03-01T09:00:00.000Z",
    "material": {
      "filename": "sample.pdf",
      "file_type": "application/pdf",
      "extracted_chars": 980
    },
    "sources": [],
    "warnings": [],
    "tool_calls": [],
    "summary": {
      "title": "MCP Summary",
      "overview": "MCP standardizes context exchange between AI clients and servers.",
      "key_points": [
        "Standard protocol",
        "Tool/resource abstraction",
        "Supports multiple transports"
      ]
    }
  }
}
```

## Example Client (TypeScript SDK)

Create `scripts/test-mcp-client.mjs`:

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3030/mcp")
);

const client = new Client({
  name: "rtm-local-client",
  version: "1.0.0",
});

await client.connect(transport);

const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name));

const result = await client.callTool({
  name: "insert_summary",
  arguments: {
    event: "material.generated",
    job_id: "job-summary-cli-1",
    status: "SUCCESS",
    user_id: "user-1",
    result: {
      user_id: "user-1",
      document_id: "doc-1",
      attempt: 1,
      finished_at: "2026-03-01T09:00:00.000Z",
      material: {
        filename: "sample.pdf",
        file_type: "application/pdf",
        extracted_chars: 999,
      },
      sources: [],
      warnings: [],
      tool_calls: [],
      summary: {
        title: "CLI Summary",
        overview: "Inserted from SDK client",
        key_points: ["point-1", "point-2"],
      },
    },
  },
});

console.log("CALL RESULT:", result);

await transport.close();
```

Run:

```bash
node scripts/test-mcp-client.mjs
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
- App e2e smoke test for `GET /`

## Troubleshooting

- Migration fails with `uuid_generate_v4` not found:
  - Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` in your DB.
- `Session not found` from `/mcp`:
  - Use a proper MCP client (SDK) so `Mcp-Session-Id` handling is automatic.
- Zod validation errors on tool call:
  - Ensure required `result.<tool_specific_field>` is present:
    - `mcq_quiz`, `essay_quiz`, or `summary`.

## Project Structure

- `src/main.ts`: app bootstrap (Fastify + Winston logger)
- `src/config`: env schema + typed config service
- `src/database`: TypeORM setup
- `src/mcp/entities`: DB entities
- `src/mcp/schemas`: Zod payload schemas
- `src/mcp/tools`: MCP tool handlers
- `src/mcp/migrations`: DB migration files
- `test`: e2e tests
