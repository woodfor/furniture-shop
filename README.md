# Furniture Shop (Next.js + Payload + Postgres)

## Development (recommended)

### 1) Prepare env

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 2) Start database only (recommended for fast reload)

```bash
npm run docker:up
npm run dev
```

This starts:

- `postgres` on `localhost:5432`
- local Next.js + Payload on [http://localhost:3000](http://localhost:3000)

### 3) Open admin and site

- Site homepage: [http://localhost:3000](http://localhost:3000)
- Payload admin: [http://localhost:3000/admin](http://localhost:3000/admin)

### 4) Logs / stop

```bash
npm run docker:logs
npm run docker:down
```

## Optional: run app inside Docker (slower HMR on Windows)

If you need full containerized runtime:

```bash
npm run docker:up:app
```

Then open:

- Site: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

For local app + Docker DB mode, keep `DATABASE_URI` as:

```env
DATABASE_URI=postgresql://postgres:postgres@localhost:5432/furniture_shop
```
