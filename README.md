# SuperMiner — Koyla-Chain Mining Compliance Backend

A backend for coal mine safety compliance, built for the Smart India Hackathon. Provides authentication, role-based access control, CRUD operations, WatermelonDB offline synchronization, and PostGIS spatial queries.

## Architecture

```
Mobile App (WatermelonDB)
    │
    ├── POST /api/sync  (push offline changes)
    ├── GET  /api/sync   (pull server changes)
    │
    ▼
Express.js Backend (:3000)
    │
    ├── /api/auth         → Authentication (JWT)
    ├── /api/mines        → Mines CRUD
    ├── /api/incidents    → Incidents CRUD
    ├── /api/inspections  → Inspections CRUD
    ├── /api/sync         → WatermelonDB Sync
    ├── /api/spatial      → PostGIS Queries
    │
    ▼
PostgreSQL + PostGIS
```

**Pattern**: `route → middleware (auth + validate) → controller → db.query() → response`

## Technologies

- **Node.js** + **Express.js** — API server
- **PostgreSQL** + **PostGIS** — database with spatial support
- **bcrypt** — password hashing
- **jsonwebtoken** — JWT authentication
- **pg** — PostgreSQL client
- **express-validator** — request validation
- **uuid** — UUID generation for sync

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ with PostGIS extension

### Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE superminer;"

# Enable PostGIS (schema.sql does this, but just in case)
psql -U postgres -d superminer -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### Install & Run

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Start the server (auto-creates tables)
npm run dev

# Load seed data (test users, mines, etc.)
npm run seed
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/superminer` | PostgreSQL connection string |
| `JWT_SECRET` | `secret` | Secret for JWT signing (change in production!) |
| `PORT` | `3000` | Server port |

## Test Users (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Miner | miner@koyla.dev | password123 |
| Overman | overman@koyla.dev | password123 |
| Mine Manager | manager@koyla.dev | password123 |
| DGMS Inspector | inspector@dgms.gov.in | password123 |

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login, get JWT | Public |
| GET | `/api/auth/me` | Get current user | JWT |

### Mines

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/mines` | List mines (scoped) | All authenticated |
| GET | `/api/mines/:id` | Get mine details | All authenticated |
| POST | `/api/mines` | Create mine | Manager, DGMS |
| PUT | `/api/mines/:id` | Update mine | Manager (own mine) |

### Incidents

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/incidents` | List incidents (scoped) | All authenticated |
| GET | `/api/incidents/:id` | Get incident | All authenticated |
| POST | `/api/incidents` | Report incident | Miner, Overman |
| PUT | `/api/incidents/:id` | Update incident | Manager (own mine) |

### Inspections

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/inspections` | List inspections (scoped) | All authenticated |
| GET | `/api/inspections/:id` | Get inspection | All authenticated |
| POST | `/api/inspections` | Create inspection | Overman, Manager, DGMS |
| PUT | `/api/inspections/:id` | Update inspection | Manager, DGMS |

### Sync (WatermelonDB)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync?last_pulled_at=0` | Pull changes since timestamp |
| POST | `/api/sync` | Push offline changes (idempotent) |

### Spatial (PostGIS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spatial/incidents/nearby?lat=X&lng=Y&radius=500` | Find incidents within radius |
| GET | `/api/spatial/violations/near-shaft/:shaftId?radius=500` | Violations near shaft |
| GET | `/api/spatial/mines/:id/boundary` | Mine boundary as GeoJSON |

## Roles & Permissions

| Role | Create | Read | Update | Scope |
|------|--------|------|--------|-------|
| ROLE_MINER | Incidents | Own mine | — | Own mine |
| ROLE_OVERMAN | Incidents, Inspections | Own mine | — | Own mine |
| ROLE_MINE_MANAGER | Mines, Incidents, Inspections | Own mine | Own mine | Own mine |
| ROLE_DGMS_INSPECTOR | Inspections | All mines | Inspections | Global |

**Scope enforcement**: A manager from Mine A cannot access Mine B's data. This is enforced at the query level using `mine_id` from the JWT.

## Synchronization

The mobile app uses WatermelonDB and may work offline. The sync protocol:

1. **Pull** (`GET /api/sync?last_pulled_at=<timestamp>`):
   - Returns records created, updated, or deleted since the timestamp
   - Scoped to the user's mine

2. **Push** (`POST /api/sync`):
   - Sends offline changes (created, updated, deleted records)
   - **Duplicate safety**: Uses `ON CONFLICT (watermelon_id) DO NOTHING` — retrying the same push never creates duplicates
   - **Conflict resolution**: Server wins — if the server record was modified after `lastPulledAt`, the mobile change is skipped
   - **Deletes**: Soft-delete via `deleted_at` column — mobile learns about deletions through pull

## Testing

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE superminer_test;"
psql -U postgres -d superminer_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run tests
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/superminer_test npm test
```

## Project Structure

```
backend/
├── app.js                          # Express app setup + route mounting
├── server.js                       # Entry point
├── package.json
├── .env.example                    # Environment template
├── db/
│   ├── index.js                    # PostgreSQL pool + query helper
│   ├── schema.sql                  # Full schema (PostGIS, sync columns, indexes)
│   └── seed.sql                    # Dev seed data
├── controllers/
│   ├── auth.controller.js          # Register, Login, Me
│   ├── mines.controller.js         # Mines CRUD
│   ├── incidents.controller.js     # Incidents CRUD
│   ├── inspections.controller.js   # Inspections CRUD
│   ├── sync.controller.js          # WatermelonDB sync pull/push
│   └── spatial.controller.js       # PostGIS spatial queries
├── middleware/
│   ├── auth.js                     # JWT authenticate + role authorize
│   └── validate.js                 # express-validator wrapper
├── routes/
│   ├── auth.routes.js
│   ├── mines.routes.js
│   ├── incidents.routes.js
│   ├── inspections.routes.js
│   ├── sync.routes.js
│   └── spatial.routes.js
└── tests/
    └── api.test.js                 # Integration tests
```
