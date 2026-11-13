# Team Platform

Full-stack team management application.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL

---

## Quick start

### 1. Prerequisites
- Node.js 18+
- Docker Desktop (for PostgreSQL)

### 2. Database

```bash
cd team-platform
docker-compose up -d
```

### 3. Backend

```bash
cd server
npm install
cp ../.env.example .env
# Edit .env — set JWT_SECRET to any long random string
npm run db:init
npm run dev
```

Server runs at http://localhost:4000

### 4. Frontend

```bash
cd client
npm install
npm run dev
```

App runs at http://localhost:5173

---

## First run

1. Open http://localhost:5173
2. Register with your email and name
3. To make yourself admin, run this once in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Or connect via Docker:

```bash
docker exec -it $(docker ps -q -f ancestor=postgres:16) psql -U postgres -d team_platform -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

---

## Features

| Feature | Member | Admin |
|---------|--------|-------|
| View own profile | ✅ edit | ✅ |
| View others' profiles | ✅ read-only | ✅ edit |
| Search colleagues | ✅ | ✅ |
| Post appreciation | ✅ | ✅ |
| View events / RSVP | ✅ | ✅ |
| Create events | ✅ | ✅ |
| Delete events | ❌ | ✅ |
| Fill surveys | ✅ | ✅ |
| Create surveys | ❌ | ✅ |
| View survey results | ❌ | ✅ |
| Publish survey reports | ❌ | ✅ |
| Manage users | ❌ | ✅ |

---

## Cloud deployment

### Environment variables (production)
```
DATABASE_URL=postgresql://...
JWT_SECRET=<strong random string>
PORT=4000
CLIENT_URL=https://your-domain.com
```

### Options
- **Railway / Render**: Deploy server as a Node.js service, add PostgreSQL plugin
- **AWS**: EC2 + RDS PostgreSQL, or ECS + RDS
- **Azure**: App Service + Azure Database for PostgreSQL
- **Vercel + Supabase**: Deploy client to Vercel, server to Railway, use Supabase for PostgreSQL
