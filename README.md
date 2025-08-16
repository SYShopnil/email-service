# Tech-Analytical-LTD’s Queued Email Delivery & Logging Service

**NestJS • TypeScript • PostgreSQL (TypeORM/Prisma) • Redis (BullMQ)**

Developer-ready backend that exposes two endpoints to **queue emails** and **log every attempt** (success or failure) with timestamps and error details. Designed to meet the TAL assessment requirements and delivery items.

---

## Tech Stack

**Language:** TypeScript
**Framework:** NestJS
**Queue:** BullMQ (Redis)
**Database:** PostgreSQL (works with **Prisma**;
**Docs:** Swagger

---

## What it does (Key Features)

- **Queue-first email sending**: `POST /email/send` enqueues a job; a worker sends via SMTP (e.g., Brevo). [^ref-system-design]
- **Complete logging**: Every email has a record with `createdAt`, `sentAt`, `failedAt`, `status`, and `errorMessage` (if any). [^ref-system-design]
- **Daily rollups**: `GET /email/logs` returns paginated logs plus **today’s** stats: total created, sent, and failed. [^ref-system-design]
- **Resilient retries**: Worker retries failed jobs up to a configurable max attempt. [^ref-system-design]
- **Rate limiting (optional)**, **request/response console logging (optional)**, [^ref-system-design]**Docker support (optional)**. [^ref-system-design]

> End-to-end flow (middleware/guards → rate limit → DTO validation → controller → service → DB log → enqueue → worker → SMTP → DB status updates) mirrors the assessment’s desired behavior.&#x20;

---

## API Flow (High Level) [^ref-system-design]

**Phase 1 — Request Path (`POST /email/send`):**
Middleware & Guards → Route Rate Limit → DTO Validation → Controller → Service
→ **Create PENDING log** → **Enqueue job** → `201 Created (PENDING)` if enqueued, else mark **FAILED**. [^ref-system-design]

**Phase 2 — Worker Path (BullMQ consumer):**
Pick job → **SMTP send** → on success: update **SENT**; on failure: **retry** (up to max) → finally **FAILED** if still unsuccessful.
Note: Real SMTP providers often don’t confirm final delivery; a **webhook** can be added to reconcile final status.&#x20; [^ref-system-design]

---

## Endpoints (API Reference)

### 1) Send Email

```http
POST /email/send
Content-Type: application/json
```

**Body**

```json
{
  "to": "person@example.com",
  "subject": "Hello from TAL",
  "body": "Queued delivery test"
}
```

**201 Created (Pending)**

- Creates a PENDING row and enqueues a BullMQ job.

### 2) Get Email Logs (with Today’s Summary) [^ref-system-design]

```http
GET /email/logs?page=1&limit=10
```

**Response Includes**

- `items[]`: `to`, `subject`, `status`, `createdAt`, `sentAt`, `failedAt`, `errorMessage`
- `pagination`: `page`, `limit`, `total`
- `today`: `{ totalEmailsSentToday, successful, failed }`

_Scalability note:_ lists default to offset pagination; for high-traffic, switch to **cursor pagination** (return a cursor = last item id, and fetch records created before that on subsequent calls).&#x20;

---

## Run Locally

Clone the project

```bash
git clone <your-repo-url>
cd <repo-folder>
```

Install dependencies (Development)

```bash
npm install
```

Create .env

```bash
cp .env.example .env
```

Generate/Run (choose your ORM flow)

**If using Prisma**

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Production build & start

```bash
npm run build
npm run start
```

---

Test build & start (With Docker)

```bash
docker compose up -d --build

```

---

## Environment Variables

**Server**

- `APP_PORT` — API port (e.g., `3030`)

**Database (PostgreSQL)**

- `DATABASE_URL` — `postgresql://postgres:<db-host-password>@localhost:5432/<db-name>?schema=public`

**Queue/Redis**

- `REDIS_HOST` — e.g., `localhost`
- `REDIS_PORT` — e.g., `6379`
- `REDIS_PASSWORD` — e.g., `<redis-password>`

**SMTP**

- `SMTP_HOST` — e.g., `smtp-relay.brevo.com`
- `SMTP_PORT` — e.g., `587`
- `SMTP_SECURE` — `false` (for 587)
- `SMTP_USER` — SMTP username
- `SMTP_PASS` — SMTP password

**(Environment)**

- `NODE_ENV` — Deploy environment eg: development, production

---

## ERD Diagram

```
EmailLog
  id (uuid, pk)
  to (text)
  subject (text)
  body (text)
  status (enum: PENDING | SENT | FAILED)
  errorMessage (text, nullable)
  createdAt (timestamp)
  sentAt (timestamp, nullable)
  failedAt (timestamp, nullable)
```

## Use Case Diagram [^ref-system-design]

- **Client** calls `POST /email/send` → system enqueues and responds quickly.
- **Worker** sends via SMTP → updates DB status and timestamps.
- **Client** calls `GET /email/logs` → sees paginated all logs and today’s summary.

---

## Swagger

- Local: `http://localhost:<PORT>/docs`
- Docker local: `http://localhost/docs`
- Live: `https://email-service-task-ouxg.onrender.com/docs`

---

## Docker (optional)

`Dockerfile` + `docker-compose.yml` can run APP, Postgres, NGINX and Redis locally:

- `app` (NestJS)
- `postgres`
- `redis`
- `nginx`

---

## Design Rationale (Deliverables) [^ref-task]

### Why PostgreSQL? [^ref-system-design]

- Email logs are **highly structured** and require **strong consistency** for status + timestamps. PostgreSQL is a **balanced relational DB** with ACID guarantees, ideal for transactional integrity and reliable queries on time-series log rows. (Assessment allows PostgreSQL or MongoDB; this project picks PostgreSQL.)[^ref-system-design]

### Is it scalable? [^ref-system-design]

- **Yes**, for typical to high throughput:
  - **Queue decoupling** (HTTP → BullMQ → Worker) smooths spikes and isolates SMTP latency. [^ref-system-design]
  - **Efficient reads**: pagination + indexes; switch to **cursor pagination** under heavy load. [^ref-system-design]
  - **Background retries**: configurable attempts reduce transient SMTP issues. [^ref-system-design]
  - **Further scaling**: read replicas for reporting; webhook integration for final delivery confirmation if the SMTP provider supports it. [^ref-system-design]

## Assessment Mapping [^ref-task]

- **Endpoints**: `POST /send` (aka `/email/send` in this codebase) and `GET /logs/email` (aka `/email/logs`). [^ref-task]
- **Queue**: Bull or BullMQ with Redis. [^ref-task]
- **DB**: PostgreSQL (Prisma/TypeORM supported). [^ref-task]
- **Logs include**: today’s totals (created/sent/failed), timestamps, error details. [^ref-task]
- **Bonus**: rate limiting, console logging, Docker. [^ref-task]
- **Deliverables**: public repo, Postman docs, `.env` (secrets for local run), brief system design (above) [^ref-task]

[^ref-system-design]: [`System-Design`](https://github.com/SYShopnil/email-service/blob/master/requirement/email-service-api-design.pdf)

[^ref-task]: [`Assessment-Details`](https://github.com/SYShopnil/email-service/blob/master/requirement/email-service-guied.pdf)

---

## Postman Collection

- File (at repo root): [email-service.postman_collection.json](./email-service.postman_collection.json)
- Import steps:
  1. Open Postman → **Import**
  2. Choose **File** and select `email-service.postman_collection.json`
  3. (Optional) Create an Environment with:
     - `baseUrl` = `http://localhost:<PORT>`
  4. Run requests (they use `{{baseUrl}}` so switching environments is easy)

## Support

For support, email **[sadmanishopnil@gmail.com](mailto:sadmanishopnil@gmail.com)**. t
