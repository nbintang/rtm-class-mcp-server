# RTM Class MCP Server

NestJS + Fastify service for storing generated learning content into PostgreSQL.  
This project exposes HTTP endpoints and MCP tools for:

- MCQ quiz insertion
- Essay quiz insertion
- Summary insertion

## Tech Stack

- Node.js + NestJS 11
- Fastify (`@nestjs/platform-fastify`)
- TypeORM + PostgreSQL
- Zod + `nestjs-zod` for request DTO validation
- Jest (unit + e2e)

## Project Structure

- `src/config` configuration schema and typed config service
- `src/database` TypeORM data source/module setup
- `src/mcp/entities` database entities
- `src/mcp/schemas` Zod schemas for payloads
- `src/mcp/dto` DTO classes generated from Zod schemas
- `src/mcp/tools` MCP tool implementations
- `src/mcp/mcp.controller.ts` HTTP API endpoints
- `src/mcp/migrations` TypeORM migrations
- `test` e2e test suites

## Requirements

- Node.js 20+
- PostgreSQL 14+
- npm

## Environment Variables

Copy `.env.example` to `.env` and set values:

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
```

Notes:

- `PORT` defaults to `3000` in schema if not provided.
- `DB_SYNC=false` is recommended when using migrations.

## Install

```bash
npm install
```

## Run

```bash
# development (watch mode)
npm run start:dev

# production build + run
npm run build
npm run start:prod
```

## API Endpoints

Base path:

- `POST /api/mcp/insert/mcq`
- `POST /api/mcp/insert/essay`
- `POST /api/mcp/insert/summary`

Validation:

- Request body is validated by `nestjs-zod` DTOs built from Zod schemas.
- Invalid payload returns `400 Bad Request`.

### Example: Insert MCQ

```bash
curl -X POST http://localhost:3030/api/mcp/insert/mcq \
  -H "Content-Type: application/json" \
  -d '{
    "event": "material.generated",
    "job_id": "job-1",
    "status": "SUCCESS",
    "user_id": "user-1",
    "result": {
      "user_id": "user-1",
      "document_id": "doc-1",
      "material": {
        "filename": "file.pdf",
        "file_type": "application/pdf",
        "extracted_chars": 1200
      },
      "sources": [
        { "chunk_id": "c1", "source_id": "s1", "excerpt": "text" }
      ],
      "warnings": [],
      "attempt": 1,
      "mcq_quiz": {
        "questions": [
          {
            "question": "What is A?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "explanation": "Because A"
          }
        ]
      }
    }
  }'
```

## Database Migration

```bash
# generate migration
npm run migration:generate

# run migration
npm run migration:run

# revert migration
npm run migration:revert
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

## Current Test Coverage Scope

- Tool unit tests:
  - `insert-mcq.tool.spec.ts`
  - `insert-essay.tool.spec.ts`
  - `insert-summary.tool.spec.ts`
- Controller unit test:
  - `mcp.controller.spec.ts`
- e2e tests:
  - `app.e2e-spec.ts`
  - `mcp.e2e-spec.ts`
