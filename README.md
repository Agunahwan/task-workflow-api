# Task Workflow API

This API is used for **task and workflow management** with role-based rules (agent & manager) and **optimistic locking**. The database uses **SQLite** for development.

---

## Table of Contents

1. [Features](#features)  
2. [Requirements](#requirements)  
3. [Setup](#setup)  
4. [Database Structure](#database-structure)  
5. [Task Lifecycle & Role Rules](#task-lifecycle--role-rules)  
6. [API Endpoints](#api-endpoints)  
7. [cURL Examples](#curl-examples)  
8. [Important Notes](#important-notes)  

---

## Features

- CRUD tasks (create, read, update)  
- Role-based task transitions (agent & manager)  
- Optimistic locking (`version`)  
- Event outbox for each task transition  
- Transaction-safe for SQLite  

---

## Requirements

- Node.js >= 18  
- SQLite (can be a local development file: `db.sqlite`)  
- Yarn / npm  

---

## Setup

1. **Clone the repository**  

```bash
git clone <repo-url>
cd task-workflow-api
```

2. **Install dependencies**

```bash
yarn install
# or npm install
```

3. **Configure SQLite in `db/knex.ts`**

```ts
import knex from 'knex';

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite'
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1  // SQLite write concurrency = 1
  }
});
```

## Run Migrations / Create Tables (Example)

```sql
-- Tasks table
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT,
  state TEXT NOT NULL,
  assignee_id TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

-- Task events table
CREATE TABLE task_events (
  event_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);
```

**Notes:**

- `tasks.task_id` is the primary key for tasks.  
- `task_events.tenant_id` is required for multi-tenant support.  
- `task_events.payload` stores the transition information in JSON format.  
- `version` in `tasks` is used for **optimistic locking** to prevent conflicts.

---

## Start the Server

```bash
yarn dev
# or npm run dev
```

Server runs at: `http://localhost:3000`

---

## Database Structure

- `tasks`: stores tasks with state and assignee  
- `task_events`: records every task change (outbox event)  
- **Tenant_id** is required in all tables → supports multi-tenant  

---

## Task Lifecycle & Role Rules

| Role     | Allowed Transition | Notes                              |
|----------|-----------------|------------------------------------|
| Agent    | NEW → IN_PROGRESS | Only for assigned tasks            |
| Agent    | IN_PROGRESS → DONE | Only for assigned tasks           |
| Agent    | → CANCELLED       | ❌ Not allowed                     |
| Manager  | → CANCELLED       | Only allowed to cancel             |
| Manager  | → other states    | ❌ Not allowed                     |

- Optimistic locking: `version` must match when updating/transitioning.  
- Event outbox is automatically recorded on each transition.

---

## API Endpoints

### 1. Create Task (Idempotent)

```http
POST /v1/workspaces/:workspaceId/tasks
Headers:
  X-Tenant-Id: <tenant_id>        # required
  X-Role: agent|manager           # required
  Idempotency-Key: <optional>    # optional, ensures idempotent request
Content-Type: application/json

Body:
{
  "title": "Follow up customer",
  "priority": "LOW|MEDIUM|HIGH"  # optional, default is MEDIUM
}
```

### 2. Assign Task

```http
POST /v1/workspaces/:workspaceId/tasks/:taskId/assign
Headers:
  X-Role: manager                # required
  If-Match-Version: <version>    # required, for optimistic locking
Content-Type: application/json

Body:
{
  "assigneeId": "u2",
  "role": "manager"
}
```

### 3. Transition Task State

```http
POST /v1/workspaces/:workspaceId/tasks/:taskId/transition
Headers:
  X-Role: agent|manager           # required
  X-User-Id: <userId>             # required
  If-Match-Version: <version>     # required, for optimistic locking
Content-Type: application/json

Body:
{
  "to_state": "IN_PROGRESS|DONE|CANCELLED"
}
```

### 4. Get Task + Audit Timeline

```http
GET /v1/workspaces/:workspaceId/tasks/:taskId
Headers:
  Content-Type: application/json
```

### 5. List Tasks (Simple Filtering + Cursor Pagination)

```http
GET /v1/workspaces/:workspaceId/tasks?state=IN_PROGRESS&assignee_id=u_12&limit=20&cursor=<cursor>
Headers:
  Content-Type: application/json
```

## cURL Examples

### Manager cancel task

```bash
curl -X POST http://localhost:3000/v1/workspaces/w1/tasks/f18e8fd7-02a5-438e-9fed-88af7b889e16/transition \
  -H "Content-Type: application/json" \
  -H "X-Role: manager" \
  -H "X-User-Id: u1" \
  -H "If-Match-Version: 2" \
  -d '{"to_state": "CANCELLED"}'
```

### Agent start task

```bash
curl -X POST http://localhost:3000/v1/workspaces/w1/tasks/f18e8fd7-02a5-438e-9fed-88af7b889e16/transition \
  -H "Content-Type: application/json" \
  -H "X-Role: agent" \
  -H "X-User-Id: u2" \
  -H "If-Match-Version: 2" \
  -d '{"to_state": "IN_PROGRESS"}'
```

### Get task with events

```bash
curl -X GET http://localhost:3000/v1/workspaces/w1/tasks/f18e8fd7-02a5-438e-9fed-88af7b889e16 \
  -H "Content-Type: application/json"
```

> ⚠️ Make sure `X-User-Id` is the task assignee when performing transitions.

### List Tasks

```bash
curl -X GET "http://localhost:3000/v1/workspaces/w1/tasks?state=IN_PROGRESS&assignee_id=u_12&limit=2" \
  -H "Content-Type: application/json"
```

---

## Important Notes

- **SQLite** allows only 1 write connection → use transactions for all read/write operations.  
- `task_events.tenant_id` **must be included** when inserting events.  
- `version` must always be checked (optimistic locking) to avoid **version conflicts**.  
- Role & state rules must follow the table in **Task Lifecycle & Role Rules**.  
- Ensure headers like `X-Role`, `X-User-Id`, and `If-Match-Version` are correctly set when performing task transitions.  
- Always validate that the task exists before performing updates or transitions to prevent `NotFoundError`.  
- Agent cannot cancel tasks; manager can only cancel tasks.  
- The `events` array in the response contains the task’s history of state transitions and other important events.  
- When inserting events into `task_events`, include `tenant_id` to maintain multi-tenant consistency.
