package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/dynamicers/bill/src/config"
	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
)

// VoiceRecordResult LLM 解析语音后返回的结构化记录
type VoiceRecordResult struct {
	Date     string   `json:"date"`
	Type     string   `json:"type"`
	Amount   float64  `json:"amount"`
	Note     string   `json:"note"`
	Category string   `json:"category"`
	Platform string   `json:"platform"`
	Tags     []string `json:"tags"`
	RawText  string   `json:"raw_text,omitempty"`
}

// ProcessVoice 处理语音文件，返回解析后的记录
// audioData: 音频二进制数据
// filename: 原始文件名（用于推断格式）
func ProcessVoice(cfg *config.Config, audioData []byte, filename string) (*VoiceRecordResult, error) {
	// 第1步：语音转文字（ASR）
	text, err := speechToText(cfg, audioData, filename)
	if err != nil {
		return nil, fmt.Errorf("语音识别失败: %w", err)
	}
	if text == "" {
		return nil, fmt.Errorf("未识别到语音内容")
	}

	// 第2步：LLM 提取结构化字段
	result, err := extractWithLLM(cfg, text)
	if err != nil {
		return nil, fmt.Errorf("AI 解析失败: %w", err)
	}
	result.RawText = text

	return result, nil
}

// ========== ASR：sherpa-onnx Python 脚本 ==========

func speechToText(cfg *config.Config, audioData []byte, filename string) (string, error) {
	// 1. 写临时文件
	inputFile, err := writeTemp(audioData, filename)
	if err != nil {
		return "", fmt.Errorf("写入临时文件失败: %w", err)
	}
	defer os.Remove(inputFile)

	// 2. ffmpeg 转 16kHz 单声道 WAV
	wavFile := inputFile + ".wav"
	defer os.Remove(wavFile)
	if err := convertToWav(inputFile, wavFile); err != nil {
		return "", fmt.Errorf("音频转换失败: %w", err)
	}

	// 3. 调用 Python ASR 脚本
	modelPath := cfg.ASRModelPath
	if modelPath == "" {
		modelPath = "./models/sense-voice"
	}
	pythonBin := cfg.ASRPython
	if pythonBin == "" {
		pythonBin = ".venv/bin/python3"
	}
	asrScript := cfg.ASRSherpaBin
	if asrScript == "" {
		asrScript = "./scripts/asr.py"
	}

	if _, err := os.Stat(pythonBin); err != nil {
		return "", fmt.Errorf("Python 不可用 (%s): 请先运行 bash scripts/download-sherpa.sh", pythonBin)
	}
	if _, err := os.Stat(asrScript); err != nil {
		return "", fmt.Errorf("ASR 脚本缺失 (%s)", asrScript)
	}

	return runPythonASR(pythonBin, asrScript, modelPath, wavFile)
}

func runPythonASR(pythonBin, script, modelPath, wavFile string) (string, error) {
	cmd := exec.Command(pythonBin, script, modelPath, wavFile)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[ASR] 识别失败: %s", strings.TrimSpace(stderr.String()))
		return "", fmt.Errorf("语音识别失败")
	}

	text := strings.TrimSpace(stdout.String())
	if text == "" {
		return "", fmt.Errorf("未识别到语音内容")
	}
	return text, nil
}

func writeTemp(data []byte, filename string) (string, error) {
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".mp3"
	}
	f, err := os.CreateTemp("", "voice_*"+ext)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := f.Write(data); err != nil {
		return "", err
	}
	return f.Name(), nil
}

func convertToWav(input, output string) error {
	cmd := exec.Command("ffmpeg",
		"-y", "-i", input,
		"-ar", "16000",
		"-ac", "1",
		"-sample_fmt", "s16",
		"-f", "wav",
		output,
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		log.Printf("[ASR] ffmpeg 转换失败: %s", stderr.String())
		return fmt.Errorf("音频转换失败")
	}
	return nil
}

// ========== LLM：提取结构化记录 ==========

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model          string        `json:"model"`
	Messages       []chatMessage `json:"messages"`
	ResponseFormat *struct {
		Type string `json:"type"`
	} `json:"response_format,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func extractWithLLM(cfg *config.Config, text string) (*VoiceRecordResult, error) {
	today := time.Now().Format("2006-01-02")

	// 从数据库查标签、类目、平台列表
	var tagModels []models.Tag
	database.DB.Find(&tagModels)
	tagNames := make([]string, len(tagModels))
	for i, t := range tagModels {
		tagNames[i] = t.Name
	}
	tagsHint := strings.Join(tagNames, "、")
	if tagsHint == "" {
		tagsHint = "暂无标签"
	}

	var catModels []models.Category
	database.DB.Find(&catModels)
	catNames := make([]string, len(catModels))
	for i, c := range catModels {
		catNames[i] = c.Name
	}
	catHint := strings.Join(catNames, "、")
	if catHint == "" {
		catHint = "暂无类目"
	}

	var platModels []models.Platform
	database.DB.Find(&platModels)
	platNames := make([]string, len(platModels))
	for i, p := range platModels {
		platNames[i] = p.Name
	}
	platHint := strings.Join(platNames, "、")
	if platHint == "" {
		platHint = "暂无平台"
	}

	systemPrompt := `你是一个记账助手。用户会用中文说一段话，描述一笔收入或支出。
请从用户的话中提取以下字段，严格按 JSON 格式返回（不要再包一层 markdown 代码块）：

{
  "date": "YYYY-MM-DD 格式的日期。如果有"今天""昨天""前天"等，参考当前日期 ` + today + ` 推算；如果提到具体日期如"5月20号"则用当前年份。默认今天",
  "type": "income 或 expense。收入类关键词：工资、奖金、报销、退款、到账、收入、赚；支出类关键词：花了、买了、付了、消费、支出、转账出去",
  "amount": 数字金额，单位是元。如"五十块"=50，"一千五"=1500，"5毛"=0.5。只保留数字",
  "note": "简短事项描述，不超过20字",
  "category": "从以下已有类目中选1个最匹配的（只能选这些）：` + catHint + `。如果都不匹配则填"其他"",
  "platform": "从以下已有平台中选1个最匹配的（只能选这些）：` + platHint + `。如果都不匹配则填"其他"",
  "tags": ["从以下已有标签中选1-3个最匹配的（只能选这些）：` + tagsHint + `"]
}

注意：金额必须在 amount 字段。category、platform、tags 只能从给出选项中选。`

	reqBody := chatRequest{
		Model: cfg.AIModel,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: text},
		},
	}

	// DeepSeek 支持 response_format，Doubao 也兼容
	if cfg.AIProvider == "deepseek" {
		reqBody.ResponseFormat = &struct {
			Type string `json:"type"`
		}{Type: "json_object"}
	}

	jsonBody, _ := json.Marshal(reqBody)

	url := cfg.AIBaseURL + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.AIAPIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求 AI 失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("AI 返回格式异常: %s", string(respBody))
	}
	if chatResp.Error != nil {
		return nil, fmt.Errorf("AI 错误: %s", chatResp.Error.Message)
	}
	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("AI 未返回内容")
	}

	content := chatResp.Choices[0].Message.Content
	// 清理可能的 markdown 代码块包裹
	content = stripMarkdownCodeBlock(content)

	var result VoiceRecordResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		// 尝试提取 JSON 子串
		if extracted, ok := extractJSON(content); ok {
			if err2 := json.Unmarshal([]byte(extracted), &result); err2 != nil {
				return nil, fmt.Errorf("AI 返回无法解析为 JSON: %s", content)
			}
		} else {
			return nil, fmt.Errorf("AI 返回无法解析为 JSON: %s", content)
		}
	}

	// 默认值补全
	if result.Date == "" {
		result.Date = today
	}
	if result.Type == "" {
		result.Type = "expense"
	}

	return &result, nil
}

func stripMarkdownCodeBlock(s string) string {
	// 去掉 ```json ... ``` 包裹
	if len(s) >= 7 && s[:7] == "```json" {
		s = s[7:]
		if idx := lastIndex(s, "```"); idx >= 0 {
			s = s[:idx]
		}
	} else if len(s) >= 3 && s[:3] == "```" {
		s = s[3:]
		if idx := lastIndex(s, "```"); idx >= 0 {
			s = s[:idx]
		}
	}
	return s
}

func lastIndex(s, substr string) int {
	for i := len(s) - len(substr); i >= 0; i-- {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func extractJSON(s string) (string, bool) {
	start := -1
	end := -1
	braceCount := 0
	for i, c := range s {
		if c == '{' {
			if start == -1 {
				start = i
			}
			braceCount++
		} else if c == '}' {
			braceCount--
			if braceCount == 0 && start != -1 {
				end = i + 1
				break
			}
		}
	}
	if start >= 0 && end > start {
		return s[start:end], true
	}
	return "", false
}
