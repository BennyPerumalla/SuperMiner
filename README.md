# SIH26024 — Koyla-Chain Compliance Ecosystem

Production-quality backend for coal mine safety compliance, built for the Smart India Hackathon.

## Architecture

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Core API** | Node.js / Express | 3000 | Auth, RBAC, CRUD, WatermelonDB Sync, PostGIS |
| **AI Service** | Python / FastAPI | 8000 | YOLO/PaddleOCR hazard detection (stub) |
| **PostgreSQL** | PostGIS 16 | 5432 | Source of truth for application state |
| **Redis** | Redis 7 | 6379 | Token blacklist, rate limiting, sessions |

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for AI service development)

### Run with Docker (recommended)

```bash
docker compose up --build
```

This starts all services. Access:
- **Swagger UI**: http://localhost:3000/api-docs
- **FastAPI Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:3000/health

### Run Locally (without Docker)

1. **Start PostgreSQL + Redis** (via Docker or local install):
   ```bash
   docker compose up postgres redis
   ```

2. **Core API**:
   ```bash
   cd services/core-api
   cp .env.example .env    # Edit if needed
   npm install
   npm run migrate          # Run database migrations
   npm run seed             # Load development data
   npm run dev              # Start with hot-reload (port 3000)
   ```

3. **AI Service**:
   ```bash
   cd services/ai-service
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

## Test Users (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Miner | miner@koyla.dev | password123 |
| Overman | overman@koyla.dev | password123 |
| Mine Manager | manager@koyla.dev | password123 |
| DGMS Inspector | inspector@dgms.gov.in | password123 |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, get JWT tokens |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke tokens |
| GET | `/api/auth/me` | Get current user |

### CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/mines` | List/create mines |
| GET/PUT | `/api/mines/:id` | Get/update mine |
| GET/POST | `/api/incidents` | List/create incidents |
| GET/PUT | `/api/incidents/:id` | Get/update incident |
| GET/POST | `/api/inspections` | List/create inspections |
| GET/PUT | `/api/inspections/:id` | Get/update inspection |

### Sync (WatermelonDB)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync?last_pulled_at=0` | Pull changes since timestamp |
| POST | `/api/sync` | Push offline changes (idempotent) |

### Spatial (PostGIS)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/spatial/violations/near-shaft/:id` | 500m proximity query |
| GET | `/api/spatial/incidents/nearby` | Radius search |
| GET | `/api/spatial/mines/:id/contains` | Point-in-boundary |
| GET | `/api/spatial/mines/:id/sensors` | Mine sensors |

### AI (Internal)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/ai/analyze-hazard` | Hazard detection |

## Testing

```bash
# Core API tests (requires PostgreSQL)
cd services/core-api
npm test

# AI Service tests
cd services/ai-service
pytest
```

## Project Structure

```
superminer/
├── docker-compose.yml
├── docker/postgres/init.sql
├── services/
│   ├── core-api/             # Node.js Express
│   │   ├── src/
│   │   │   ├── config/       # App, DB, Redis config
│   │   │   ├── middleware/    # Auth, RBAC, validation, errors
│   │   │   ├── modules/      # Feature-based: auth, mines, sync...
│   │   │   ├── db/           # Migrations + seeds
│   │   │   ├── utils/        # Logger, errors, response helpers
│   │   │   └── docs/         # Swagger config
│   │   └── tests/
│   └── ai-service/           # Python FastAPI
│       ├── app/
│       │   ├── routers/      # API endpoints
│       │   ├── schemas/      # Pydantic models
│       │   ├── services/     # Business logic (ML stubs)
│       │   └── middleware/   # Internal auth
│       └── tests/
└── docs/
```
