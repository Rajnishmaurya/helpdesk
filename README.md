# AI-Powered Employee Helpdesk

An internal IT helpdesk where employees raise support tickets, support staff manage them through a controlled workflow, and an AI model suggests a category, a priority and first troubleshooting steps for each ticket. The AI is advisory only: support staff make every final decision, and the AI can never change or close a ticket.

Built as the EY Training Capstone Assessment by a team of three.

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy |
| Database | PostgreSQL 16 (managed with pgAdmin 4) |
| AI | OpenRouter free model through an OpenAI-compatible API (switchable to a local Ollama model) |

---

## Contents

1. [Architecture](#architecture)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Setup](#setup)
5. [Database](#database)
6. [AI integration](#ai-integration)
7. [Running the backend](#running-the-backend)
8. [API endpoints](#api-endpoints)
9. [Testing](#testing)
10. [Security and logging](#security-and-logging)
11. [Troubleshooting](#troubleshooting)
12. [Team](#team)

---

## Architecture

```
+------------------+   REST / JSON   +---------------------+   SQL   +--------------+
|  React frontend  | <-------------> |   FastAPI backend   | <-----> |  PostgreSQL  |
| Employee/Support |                 | validation, rules,  |         | source of    |
+------------------+                 | history, AI service |         | truth        |
                                     +----------+----------+         +--------------+
                                                |
                                                | HTTPS (advisory, may fail)
                                                v
                                     +---------------------+
                                     |  OpenRouter API     |
                                     |  free model         |
                                     +---------------------+
```

Key rules:

- PostgreSQL is the single source of truth. The frontend only shows what the API returns.
- Only FastAPI talks to PostgreSQL and to the AI model. The API key never reaches the browser.
- The AI path is optional. If the model is down, ticket create, list and update keep working.
- AI output is stored in its own table (`ai_suggestions`) and never overwrites the ticket. Only a support analyst's action changes a ticket's category, priority or status.

---

## Project structure

```
helpdesk/
  backend/
    app/
      main.py              FastAPI app, CORS, router registration
      config.py            settings loaded from .env
      db.py                database engine and one session per request
      models.py            SQLAlchemy models (mirror database/schema.sql)
      schemas.py           Pydantic request and response models
      routers/             tickets.py, ai.py, feedback.py, dashboard.py, requesters.py
      services/            workflow.py (status rules), ai_service.py (AI calls)
    tests/                 pytest suite
    check_ai.py            smoke test that calls the real AI model
    requirements.txt
    .env.example           template for .env (no real secrets)
  frontend/                React application
  database/
    schema.sql             creates the 5 tables
    seed.sql               fictional test data (safe to re-run)
    queries.sql            join and aggregate queries for the assessment
  docs/
    screenshots/           test and demo evidence
  .gitignore
  README.md
```

---

## Prerequisites

- Python 3.11 or newer
- PostgreSQL 16 and pgAdmin 4 (included in the Windows PostgreSQL installer)
- Git
- An OpenRouter account and API key (free): https://openrouter.ai
- Node.js 18 or newer (for the frontend)

---

## Setup

The commands below are for Windows PowerShell. On macOS or Linux, activate the virtual environment with `source venv/bin/activate`.

### 1. Install backend packages

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

If you use PyCharm, set the project interpreter to `backend\venv\Scripts\python.exe` so PyCharm and the terminal use the same packages.

### 2. Create the `.env` file

```
copy .env.example .env
```

Open `backend\.env` and fill in the values:

```
DATABASE_URL=postgresql+psycopg://postgres:<your password>@localhost:5432/helpdesk
OPENROUTER_API_KEY=<your OpenRouter key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=<free model id ending in :free>
AI_TIMEOUT_SECONDS=30
AI_ENABLED=true
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection. Must start with `postgresql+psycopg://`. |
| `OPENROUTER_API_KEY` | OpenRouter API key. Leave empty for Ollama. |
| `OPENROUTER_BASE_URL` | OpenAI-compatible endpoint of the AI provider. |
| `OPENROUTER_MODEL` | Model ID to use. For OpenRouter, a free model ID ends in `:free`. |
| `AI_TIMEOUT_SECONDS` | Maximum wait for an AI reply before returning 504. |
| `AI_ENABLED` | Set to `false` to switch AI off; analysis then returns 503 immediately. |
| `LOG_LEVEL` | Backend log level, for example `INFO` or `DEBUG`. |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed to call the API. |

> If your PostgreSQL password contains `@`, write it as `%40` in `DATABASE_URL` (for example `Admin@123` becomes `Admin%40123`). Other special characters such as `#`, `/` and `:` need the same URL encoding.

`.env` is listed in `.gitignore` and must never be committed.

---

## Database

### Create and load the database (pgAdmin)

1. In pgAdmin, connect to your PostgreSQL 16 server.
2. Right-click **Databases > Create > Database**, name it `helpdesk`, and save.
3. Select `helpdesk`, then open **Tools > Query Tool**. Check that the tab title says `helpdesk/postgres@PostgreSQL 16`.
4. Open `database/schema.sql` and press **F5**.
5. Open `database/seed.sql` and press **F5**.
6. Check the result:
   ```sql
   SELECT count(*) FROM tickets;   -- returns 8
   ```

To reset the database at any time, run `schema.sql` and then `seed.sql` again. `schema.sql` drops and recreates the tables, so only use it on development machines.

### Tables

| Table | Purpose | Key rules |
|---|---|---|
| `requesters` | Employees who raise tickets | Unique email |
| `tickets` | Tickets with the **human-confirmed** category, priority and status | Status must be New, In Progress or Resolved; category and priority limited to allowed values |
| `ticket_activity` | Append-only history: creation, status changes, priority changes, notes, AI feedback | Linked to a ticket; records old value, new value, actor and time |
| `ai_suggestions` | What the AI proposed for a ticket | Stored separately; never overwrites the ticket |
| `ai_feedback` | The analyst's decision on a suggestion: accepted or corrected, useful or not, final values | One review per suggestion |

Allowed values (enforced by `CHECK` constraints):

- Status: `New`, `In Progress`, `Resolved`
- Category: `Hardware`, `Software`, `Network`, `Access`, `Other`
- Priority: `Low`, `Medium`, `High`

### Seed data

`seed.sql` loads fictional data: 5 employees, 8 tickets across all three statuses, their history, and one AI suggestion that support corrected. Ticket 1 is the wireless keyboard case (Scenario 01) and ticket 2 is the department-wide shared drive outage (Scenario 02).

### Assessment queries

`database/queries.sql` contains:

| Query | Shows |
|---|---|
| Q1 | Join: every ticket with its requester and latest status change |
| Q2 | Aggregate: ticket count by status (dashboard) |
| Q3 | Aggregate: ticket count by priority, with unset shown as `Not set` (dashboard) |
| Q4 | Join: each AI suggestion next to the analyst's final decision |

In pgAdmin, highlight one query and press **F5** to run only that query.

---

## AI integration

### How analysis works

1. A support analyst requests analysis for a ticket (`POST /api/tickets/{id}/ai-analysis`).
2. The backend sends **only the ticket title and description** to the model. Requester names and emails are never sent.
3. The model must reply with JSON in this exact shape:
   ```json
   {
     "category": "Hardware | Software | Network | Access | Other",
     "priority": "Low | Medium | High",
     "priority_reason": "one or two sentences on business impact",
     "troubleshooting_steps": ["step 1", "step 2", "step 3"]
   }
   ```
4. The reply is validated with Pydantic: only the allowed categories and priorities are accepted, the reason is limited to 300 characters, and there must be 1 to 6 steps of up to 200 characters each.
5. A valid result is saved in `ai_suggestions`. The ticket itself is not changed.
6. The analyst accepts or corrects the suggestion; the decision is saved in `ai_feedback`, and only then are the ticket's category and priority updated.

### Prompt safety

- Rules are in the system message; the ticket text goes inside `<ticket>` tags and is described to the model as untrusted user data.
- Any `<ticket>` tags typed by the employee are removed, so the text cannot break out of the block.
- The AI service has no code path to update tickets, so even a successful injection cannot change ticket status.

### Failure handling

| Situation | API response | Data saved |
|---|---|---|
| Model unreachable, rate limited (429), invalid key (401), unknown model (404), or `AI_ENABLED=false` | `503` "AI service is unavailable. You can continue managing the ticket manually." | Nothing |
| No reply within `AI_TIMEOUT_SECONDS` | `504` "AI analysis timed out." | Nothing |
| Reply is not valid JSON or uses values outside the allowed lists | `502` "AI returned an invalid response." | Nothing |

All other ticket endpoints keep working in every case.

### Model choice

- Provider: OpenRouter, free tier
- Model used in testing: `<fill in the model ID from your .env>`
- Backup model: `<fill in a second free model ID>`

Free models are rate limited and their availability can change. If the model starts returning 503 or invalid output, switch `OPENROUTER_MODEL` to the backup model in `.env` and restart the backend.

### Switching to a local Ollama model

The assessment brief asks for a locally runnable model. The AI service uses the OpenAI-compatible API format, so switching to Ollama only needs a `.env` change:

```
ollama pull qwen2.5:3b
```

```
OPENROUTER_BASE_URL=http://localhost:11434/v1
OPENROUTER_MODEL=qwen2.5:3b
OPENROUTER_API_KEY=
```

No code changes are needed.

---

## Running the backend

From the `backend` folder with the virtual environment active:

```
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Interactive API documentation (Swagger): http://localhost:8000/docs

---

## API endpoints

All endpoints are prefixed with `/api`. Full request and response schemas are in Swagger at `/docs`.

### AI endpoints

| Method | Endpoint | Purpose | Responses |
|---|---|---|---|
| POST | `/tickets/{id}/ai-analysis` | Run AI analysis and store the suggestion | 201, 404, 502, 503, 504 |
| GET | `/tickets/{id}/ai-suggestions` | All suggestions for a ticket, newest first | 200, 404 |
| POST | `/ai-suggestions/{id}/feedback` | Accept or correct a suggestion | 201, 404, 409, 422 |

### Ticket, workflow and dashboard endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/requesters/` | List employees |
| POST | `/requesters/` | Create an employee |
| GET | `/requesters/{id}` | Employee details |
| POST | `/tickets/` | Create a ticket |
| GET | `/tickets/` | List tickets (query filters: `requester_id`, `status_filter`, `category`, `priority`) |
| GET | `/tickets/{id}` | Ticket details |
| PATCH | `/tickets/{id}` | Update title, description or category |
| GET | `/tickets/{id}/history` | Ticket activity history |
| PATCH | `/tickets/{id}/status` | Change status, body `{"status": ..., "note": ...}` (invalid transitions return 409) |
| PATCH | `/tickets/{id}/priority` | Set priority |
| POST | `/tickets/{id}/comments` | Add a support note |
| GET | `/dashboard/summary` | Ticket counts by status and priority |

---

## Testing

### Automated tests

From the `backend` folder:

```
python -m pytest -v
```

The AI service tests (`tests/test_ai_service.py`) use a fake model, so they need no API key, no internet and no database. They cover:

- valid replies, and replies wrapped in code fences
- unknown categories and non-JSON replies (rejected)
- model unreachable, rate limited, timed out, and AI disabled
- prompt-injection text staying inside the `<ticket>` block

### Real AI smoke test

```
python check_ai.py
```

Sends the Scenario 01 and Scenario 02 tickets to the real model in `.env` and prints the suggestions. Expected: Hardware for the keyboard ticket, and High priority for the shared drive outage. This uses your OpenRouter quota, so it is not part of the pytest suite.

### Demonstration scenarios

| Scenario | How to demonstrate |
|---|---|
| 01 Routine ticket | `POST /api/tickets/1/ai-analysis` returns a suggestion for the keyboard ticket |
| 02 Major outage | `POST /api/tickets/2/ai-analysis` returns High priority with a business-impact reason |
| 03 Human correction | Accept or correct a suggestion; check `ai_feedback` and the ticket after refresh |
| 04 AI unavailable | Set `OPENROUTER_BASE_URL=http://localhost:9`, restart the backend: analysis returns 503 while tickets can still be created, listed and updated |
| 05 Invalid request | Submit a ticket with a missing title: the API returns 422 with the field error |
| 06 Persistence | Restart the backend and refresh: tickets, history, comments and feedback are still there |

Evidence screenshots are stored in `docs/screenshots/`.

---

## Security and logging

- Secrets (`DATABASE_URL` password, `OPENROUTER_API_KEY`) live only in `backend/.env`, which is git-ignored. `.env.example` contains no real values.
- The API key is used only by the backend and is never logged or returned in a response.
- AI log lines record the ticket ID, outcome, chosen category and priority, and duration. They never contain ticket text, email addresses or the API key.
- Seed and demo data are fictional. Do not enter personal or confidential information in tickets, because ticket text is sent to an external AI provider.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| pgAdmin shows "connection timeout expired" | The PostgreSQL service is stopped or stuck. Open `services.msc`, find `postgresql-x64-16`, and start or restart it. Check with `netstat -ano \| findstr 5432`. |
| Backend cannot connect to the database | Check `DATABASE_URL`: it must start with `postgresql+psycopg://`, and `@` in the password must be written as `%40`. |
| AI analysis always returns 503 | Check that the key variable is named `OPENROUTER_API_KEY`, the key is valid, and `OPENROUTER_MODEL` is the exact model ID. The backend log shows the HTTP status (401 bad key, 404 unknown model, 429 rate limit). |
| `check_ai.py` prints INVALID OUTPUT | The model is not following the JSON format. Switch `OPENROUTER_MODEL` to another free instruct model. |
| PyCharm shows missing packages but the terminal works | PyCharm is using a different interpreter. Set it to `backend\venv\Scripts\python.exe`. |
| Tables appear in the wrong database | The Query Tool was opened on another database. Open it from `helpdesk` and check the tab title. |

---

## Team

| Member | Responsibility |
|---|---|
| Person A | Ticket and employee API, dashboard, React frontend |
| Person B | Support workflow (status, priority, comments), AI feedback endpoint, app configuration, logging, test setup |
| Person C | PostgreSQL schema, seed data and queries, SQLAlchemy models, AI service and AI endpoints, AI tests |
