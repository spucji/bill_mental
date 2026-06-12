package config

import (
	"os"
	"strings"
)

type Config struct {
	ServerPort string
	TLSCert    string // HTTPS 证书路径（空=HTTP）
	TLSKey     string // HTTPS 私钥路径
	LogPath    string // 日志文件路径（空=仅 stderr）
	DBPath     string // SQLite 文件路径
	JWTSecret  string
	AdminKey   string // 管理员密钥

	// AI / 语音解析
	AIProvider  string // deepseek / doubao
	AIAPIKey    string
	AIModel     string
	AIBaseURL   string // 自定义 API 地址（可选）
	ASRProvider string // sherpa-onnx
	ASRAppID    string
	ASRToken    string
	ASRModelPath string // sherpa-onnx 模型路径
	ASRSherpaBin string // ASR 脚本路径（Python 脚本）
	ASRPython    string // Python 解释器路径
}

func Load() *Config {
	aiProvider := strings.ToLower(getEnv("AI_PROVIDER", "deepseek"))

	model := getEnv("AI_MODEL", "")
	baseURL := getEnv("AI_BASE_URL", "")
	if model == "" {
		switch aiProvider {
		case "doubao":
			model = "doubao-1.5-pro-32k"
		default:
			model = "deepseek-chat"
		}
	}
	if baseURL == "" {
		switch aiProvider {
		case "doubao":
			baseURL = "https://ark.cn-beijing.volces.com/api/v3"
		default:
			baseURL = "https://api.deepseek.com/v1"
		}
	}

	return &Config{
		ServerPort: getEnv("APP_PORT", "8080"),
		TLSCert:    getEnv("TLS_CERT", ""),
		TLSKey:     getEnv("TLS_KEY", ""),
		LogPath:    getEnv("LOG_PATH", ""),
		DBPath:     getEnv("DB_PATH", "./bill.db"),
		JWTSecret:  getEnv("JWT_SECRET", "bill-secret-key-change-in-production"),
		AdminKey:   getEnv("ADMIN_KEY", "admin-change-me"),

		AIProvider:   aiProvider,
		AIAPIKey:     getEnv("AI_API_KEY", ""),
		AIModel:      model,
		AIBaseURL:    baseURL,
		ASRProvider:  getEnv("ASR_PROVIDER", "sherpa-onnx"),
		ASRAppID:     getEnv("ASR_APP_ID", ""),
		ASRToken:     getEnv("ASR_TOKEN", ""),
		ASRModelPath: getEnv("ASR_MODEL_PATH", "./models/sense-voice"),
		ASRSherpaBin: getEnv("ASR_SHERPA_BIN", "./scripts/asr.py"),
		ASRPython:    getEnv("ASR_PYTHON", ".venv/bin/python3"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
