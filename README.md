# 轻记账 · 心灵空间 🌿

极简、私人、多用户的生活记录小程序。Go 后端 + 微信小程序前端，集成轻记账与心灵空间：支持语音记账、标签/类目/平台管理、数据统计分析、情绪对话、心灵周报和白噪音。

> English: [README.en.md](./README.en.md)
>
> ⚠️ Web 前端（`web/`）尚在开发中，当前生产可用前端的为 WeChat 小程序（`frontend/`）。

## 功能

- **多用户隔离** — 管理员创建账号，每位用户独立数据（标签、类目、平台按用户隔离）
- **收支记录** — 支持金额、日期、备注、标签、类目、交易平台
- **语音记账** — 录音 → 本地 sherpa-onnx 语音识别 → LLM 结构化输出
- **统计分析** — 按类目/平台/标签维度查看饼图，每日收支变化趋势折线图（Canvas 2D 原生绘制）
- **心灵空间** — 三个主题的情绪/成长对话，支持历史记录、趋势统计、周报和白噪音
- **密码认证** — 账号 + bcrypt 密码登录，支持修改密码、管理员重置
- **数据备份** — S3 兼容存储（MinIO/AWS），按星期轮换

## 架构

```
┌──────────────────────────────────┐
│  WeChat 小程序 (frontend/)        │
│  空间选择 · 记账 · 心灵空间       │
└──────────────┬───────────────────┘
               │ HTTPS
┌──────────────▼───────────────────┐
│  Caddy / Nginx (反向代理)         │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  Go 后端 (src/)                   │
│  Gin + GORM + SQLite              │
│  JWT 认证 · bcrypt 密码           │
└──────────────┬───────────────────┘
               │
┌──────────────▼───────────────────┐
│  AI / 音频能力                     │
│  语音记账: ffmpeg → SenseVoice    │
│  心灵对话: DeepSeek/Doubao LLM    │
└──────────────────────────────────┘
```

## 项目结构

```
bill/
├── src/                     # Go 后端
│   ├── main.go              # 入口：服务启动 / CLI 运维工具
│   ├── config/              # 环境变量配置
│   ├── database/            # SQLite 初始化、自动迁移
│   ├── handlers/            # HTTP 处理器（auth/record/tag/category/platform/analysis/voice/mental/admin）
│   ├── middleware/           # JWT 认证 & Admin 鉴权中间件
│   ├── models/              # GORM 数据模型
│   └── services/            # 业务逻辑（统计、语音解析）
├── frontend/                # WeChat 小程序
│   ├── pages/               # 页面（login/space-select/records/analysis/mental-* 等）
│   ├── components/          # 组件（date-picker/chart-canvas/voice-bubble）
│   └── utils/               # 工具（api 封装、认证）
├── web/                     # Web 前端（开发中 ⚠️）
│   └── index.html           # 单文件 SPA（零依赖、零构建）
├── scripts/                 # Python 脚本（ASR 识别、模型下载）
├── assets/sounds/           # 心灵空间白噪音资源
├── deploy/                  # 部署配置（systemd、定时备份、环境变量）
├── deploy.sh                # 一键部署脚本（Ubuntu 24）
└── Caddyfile                # Caddy 反向代理配置示例
```

## 快速开始

### 1. 启动后端

```bash
# 编译
cd src && go build -o ../bill .

# 配置环境变量
cat > .env << EOF
JWT_SECRET=your-secret-key
DB_PATH=./bill.db
APP_PORT=8080
AI_API_KEY=sk-your-api-key
EOF

# 创建管理员账号
./bill admin create-user admin    # 初始密码 1234

# 启动服务
./bill
```

### 2. 部署（Ubuntu 24 服务器）

```bash
bash deploy.sh
```

一键完成：Go 编译、Python 虚拟环境、SenseVoice 模型下载、systemd 服务、nginx 反向代理。

### 3. 前端配置

在微信开发者工具中打开 `frontend/` 目录，配置合法域名后即可运行。

## CLI 运维工具

```bash
bill admin list-users                     # 列出所有用户
bill admin create-user <账号>              # 创建用户（初始密码 1234）
bill admin reset-password <账号>           # 重置密码为 1234
bill admin delete-user <账号|ID>           # 删除用户（含所有记录）
bill backup <本地文件> <S3路径>            # 上传备份到 S3
```

## API 概览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/login` | POST | 账号密码登录 |
| `/api/password` | PUT | 修改密码（需登录） |
| `/api/records` | GET/POST | 记录列表 / 新增 |
| `/api/records/:id` | GET/PUT/DELETE | 记录详情 / 修改 / 删除 |
| `/api/records/voice` | POST | 语音记账（multipart 上传音频） |
| `/api/tags` | GET/POST | 标签列表 / 新增 |
| `/api/tags/:id` | PUT/DELETE | 修改 / 删除标签 |
| `/api/categories` | GET/POST | 类目列表 / 新增 |
| `/api/categories/:id` | PUT/DELETE | 修改 / 删除类目 |
| `/api/platforms` | GET/POST | 平台列表 / 新增 |
| `/api/platforms/:id` | PUT/DELETE | 修改 / 删除平台 |
| `/api/analysis/summary` | GET | 统计分析数据 |
| `/api/mental/profile` | GET/POST | 心灵空间昵称资料 |
| `/api/mental/analyze` | POST | 心灵对话分析 |
| `/api/mental/history` | GET | 心灵对话历史 |
| `/api/mental/weekly-report` | GET | 心灵周报 |
| `/api/mental/statistics` | GET | 心灵趋势统计 |
| `/api/mental/sounds/:filename` | GET | 白噪音资源 |
| `/api/admin/users` | GET/POST | 管理员：用户列表 / 创建 |
| `/api/admin/users/:id` | DELETE | 管理员：删除用户 |

## 技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | Gin (Go) |
| ORM | GORM + SQLite |
| 认证 | JWT + bcrypt |
| 语音识别 | sherpa-onnx (SenseVoice) |
| AI 解析 | DeepSeek / Doubao API |
| 前端 | 微信小程序原生 |
| 图表 | Canvas 2D 原生绘制 |
| 部署 | systemd + Caddy/nginx |
| 备份 | AWS S3 SDK（MinIO 兼容） |
