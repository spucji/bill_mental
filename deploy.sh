#!/bin/bash
# ============================================================
# 在 Ubuntu 24 服务器上执行 —— 一键部署 bill 服务
#
#   ssh root@your-server
#   apt-get install -y git && git clone https://gitee.com/you/bill.git
#   cd bill && bash deploy.sh
#
# 或直接一行:
#   curl -fsSL https://your.repo/install.sh | bash
# ============================================================
set -e

APP_DIR="/opt/bill"
VENV_DIR="${APP_DIR}/.venv"
MODEL_DIR="${APP_DIR}/models/sense-voice"
GO_VER="1.26.2"

# ---------- 自动检测源码路径 ----------
if [ -f "./go.mod" ] && [ -d "./src" ]; then
    SRC_DIR="$(pwd)"
else
    SRC_DIR="${APP_DIR}"
fi

echo "=== 源码: ${SRC_DIR} ==="

echo ""
echo "=== 1. 系统依赖 ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    git ca-certificates \
    python3 python3-pip python3-venv \
    ffmpeg curl

# Go
if ! command -v go &>/dev/null || [ "$(go version | grep -oP 'go\K[0-9.]+' | cut -d. -f2)" -lt 20 ]; then
    echo "安装 Go ${GO_VER} ..."
    curl -fSL "https://go.dev/dl/go${GO_VER}.linux-amd64.tar.gz" | tar -C /usr/local -xz
    export PATH="/usr/local/go/bin:${PATH}"
    echo 'export PATH=/usr/local/go/bin:$PATH' > /etc/profile.d/go.sh
fi

echo ""
echo "=== 2. Caddy (反向代理) ==="
if ! command -v caddy &>/dev/null; then
    apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    chmod o+r /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install caddy
    echo "✓ Caddy 安装完成"
else
    echo "✓ Caddy 已安装"
fi

echo ""
echo "=== 3. 拷贝到 ${APP_DIR} ==="
if [ "${SRC_DIR}" != "${APP_DIR}" ]; then
    [ -d "${APP_DIR}" ] && mv "${APP_DIR}" "${APP_DIR}.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
    cp -r "${SRC_DIR}" "${APP_DIR}"
fi
cd "${APP_DIR}"

echo ""
echo "=== 4. Python venv + sherpa-onnx ==="
python3 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --quiet sherpa-onnx sherpa-onnx-bin

echo ""
echo "=== 5. SenseVoice 模型 (~40MB) ==="
if [ ! -f "${MODEL_DIR}/model.int8.onnx" ]; then
    mkdir -p "$(dirname "${MODEL_DIR}")"
    curl -fSL --connect-timeout 10 --max-time 180 \
        -o /tmp/sense-voice.tar.bz2 \
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2"
    tar -xjf /tmp/sense-voice.tar.bz2 -C "${APP_DIR}/models" --strip-components=1
    rm /tmp/sense-voice.tar.bz2
    echo "✓ 模型下载完成"
else
    echo "✓ 模型已存在"
fi

echo ""
echo "=== 6. 编译 Go ==="
GOPROXY=https://goproxy.cn,direct CGO_ENABLED=1 go build -o "${APP_DIR}/bill" ./src/

echo ""
echo "=== 7. systemd 服务 ==="
cat > /etc/systemd/system/bill.service << 'SYSTEMD'
[Unit]
Description=轻记账 API 服务
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bill
EnvironmentFile=/opt/bill/.env
ExecStart=/opt/bill/bill
Restart=on-failure
RestartSec=5

NoNewPrivileges=yes
PrivateTmp=yes

StandardOutput=journal
StandardError=journal
SyslogIdentifier=bill

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable bill

echo ""
# echo "=== 8. Caddy 配置 ==="
# cat > /etc/caddy/Caddyfile << 'CADDY'
# your-domain {
#     reverse_proxy localhost:8080
# }
# CADDY
# systemctl enable caddy
# systemctl restart caddy
# sleep 1
# systemctl status caddy --no-pager || true

echo ""
echo "=============================="
echo "部署完成"
echo "=============================="
echo ""
echo "  配置: vi ${APP_DIR}/.env    # 填入 JWT_SECRET、AI_API_KEY 等"
echo "  域名: vi /etc/caddy/Caddyfile     # 替换为你的域名"
echo "  启动: systemctl restart bill"
echo "  状态: systemctl status bill"
echo "  日志: journalctl -u bill -f"
echo "  用户: ${APP_DIR}/bill admin create-user <账号>"
echo "  安全: 云控制台安全组放行 80/tcp 和 443/tcp"
echo ""
echo "  备份: echo '0 3 * * * ${APP_DIR}/deploy/cron/backup.sh' | crontab -"
