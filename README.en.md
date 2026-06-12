# Light Bookkeeping 🌿

A minimalist, private, multi-user personal bookkeeping app. Go backend + WeChat Mini Program frontend. Supports voice input, tag/category/platform management, and statistical analysis.

> 中文: [README.md](./README.md)
>
> ⚠️ The Web frontend (`web/`) is still under development. The production-ready frontend is the WeChat Mini Program (`frontend/`).

## Features

- **Multi-user isolation** — Admin creates accounts; each user has independent data (tags, categories, platforms scoped per user)
- **Income & expense tracking** — Amount, date, notes, tags, categories, payment platforms
- **Voice input** — Record → local sherpa-onnx speech recognition → LLM structured parsing
- **Statistics** — Pie charts by category/platform/tag; daily trend line chart (native Canvas 2D)
- **Password auth** — Account + bcrypt password login, change password, admin reset
- **Data backup** — S3-compatible storage (MinIO/AWS), daily rotation

## Architecture

```
┌──────────────────────────────────┐
│  WeChat Mini Program (frontend/)  │
│  Native Canvas · Voice component  │
└──────────────┬───────────────────┘
               │ HTTPS
┌──────────────▼───────────────────┐
│  Caddy / Nginx (reverse proxy)    │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  Go Backend (src/)                │
│  Gin + GORM + SQLite              │
│  JWT auth · bcrypt passwords      │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  Voice Pipeline                   │
│  ffmpeg → sherpa-onnx (SenseVoice)│
│  → DeepSeek/Doubao LLM           │
└──────────────────────────────────┘
```

## Project Structure

```
bill/
├── src/                     # Go backend
│   ├── main.go              # Entry: HTTP server / CLI admin tool
│   ├── config/              # Environment config
│   ├── database/            # SQLite init & auto-migration
│   ├── handlers/            # HTTP handlers
│   ├── middleware/           # JWT & Admin auth middleware
│   ├── models/              # GORM data models
│   └── services/            # Business logic (summary, voice)
├── frontend/                # WeChat Mini Program
│   ├── pages/               # Pages
│   ├── components/          # Components (date-picker, chart, voice)
│   └── utils/               # API wrapper, auth helpers
├── web/                     # Web frontend (WIP ⚠️)
│   └── index.html           # Single-file SPA (zero deps, zero build)
├── scripts/                 # Python scripts (ASR, model download)
├── deploy/                  # Deploy configs (systemd, cron backup, env)
├── deploy.sh                # One-click deploy (Ubuntu 24)
└── Caddyfile                # Caddy reverse proxy example
```

## Quick Start

### 1. Run Backend

```bash
# Build
cd src && go build -o ../bill .

# Configure
cat > .env << EOF
JWT_SECRET=your-secret-key
DB_PATH=./bill.db
SERVER_PORT=8080
EOF

# Create admin user
./bill admin create-user admin    # default password: 1234

# Start server
./bill
```

### 2. Deploy (Ubuntu 24)

```bash
bash deploy.sh
```

One command: Go build, Python venv, SenseVoice model download, systemd service, nginx reverse proxy.

### 3. Frontend

Open `frontend/` in WeChat DevTools. Configure the server domain in WeChat backend, then start the mini program.

## CLI Admin Tool

```bash
bill admin list-users                     # List all users
bill admin create-user <account>          # Create user (default password: 1234)
bill admin reset-password <account>       # Reset password to 1234
bill admin delete-user <account|ID>       # Delete user and all their records
bill backup <local_path> <s3_key>         # Upload backup to S3
```

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | Login with account & password |
| `/api/password` | PUT | Change password (authenticated) |
| `/api/records` | GET/POST | List / create records |
| `/api/records/:id` | GET/PUT/DELETE | Get / update / delete record |
| `/api/records/voice` | POST | Voice input (multipart audio upload) |
| `/api/tags` | GET/POST | List / create tags |
| `/api/tags/:id` | PUT/DELETE | Update / delete tag |
| `/api/categories` | GET/POST | List / create categories |
| `/api/categories/:id` | PUT/DELETE | Update / delete category |
| `/api/platforms` | GET/POST | List / create platforms |
| `/api/platforms/:id` | PUT/DELETE | Update / delete platform |
| `/api/analysis/summary` | GET | Statistical summary |
| `/api/admin/users` | GET/POST | Admin: list / create users |
| `/api/admin/users/:id` | DELETE | Admin: delete user |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend framework | Gin (Go) |
| ORM | GORM + SQLite |
| Auth | JWT + bcrypt |
| Speech recognition | sherpa-onnx (SenseVoice) |
| AI parsing | DeepSeek / Doubao API |
| Frontend | WeChat Mini Program (native) |
| Charts | Canvas 2D (native) |
| Deployment | systemd + Caddy/nginx |
| Backup | AWS S3 SDK (MinIO compatible) |
