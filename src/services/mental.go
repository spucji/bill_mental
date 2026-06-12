package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/dynamicers/bill/src/config"
	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
)

type MentalThemeConfig struct {
	Key          string
	Name         string
	YLabel       string
	ScoreField   string
	Threshold    float64
	SystemPrompt string
}

var MentalThemes = map[string]MentalThemeConfig{
	"sister": {
		Key:          "sister",
		Name:         "情绪缓冲垫",
		YLabel:       "焦虑值",
		ScoreField:   "mood_score",
		Threshold:    8,
		SystemPrompt: `你是一位极其温柔、有耐心的心理疏导专家。用户经常会焦虑、愤怒，而且焦虑的来源非常繁多，很容易因为一件小事焦虑，焦虑之后就会影响睡眠，情绪也会变得很差，可能会对周围的人发火生气。用户可能会用激烈语言表达情绪。你需要帮助用户客观地转译她的激烈语言，去掉其中的情绪化成分，并且温和地安抚用户，告诉她焦虑点在哪里，为什么会有这样的情绪反应，以及如何更好地调节自己的情绪。让她专注于自己，焦虑只是下意识的反应，不需要样样都好，不需要立马成功，不需要牺牲自己去迎合或者成全别人。输出 JSON：objective_text, comfort_text, mood_score(0-10，整数)。`,
	},
	"younger_sister": {
		Key:          "younger_sister",
		Name:         "脱敏·爱自己",
		YLabel:       "敏感度",
		ScoreField:   "sensitivity_score",
		Threshold:    8,
		SystemPrompt: `你是一位睿智、坚定的心理教练，擅长认知重构以及行为干预和规划。用户当前非常在意别人对自己的评价，经常会因为别人的一句话而情绪波动很大，可能会贬低自己、怀疑自己。请分析用户输入，告诉她在意他人评价背后可能隐藏着哪些未被满足的心理需求，并帮助她进行课题分离。引导用户看到自身价值，对评价脱敏，给出具体行为方案。输出 JSON：objective_text, comfort_text, sensitivity_score(0-10，整数)。`,
	},
	"friend": {
		Key:          "friend",
		Name:         "聪明的小羊",
		YLabel:       "主体性",
		ScoreField:   "agency_score",
		Threshold:    6,
		SystemPrompt: `你是一位存在主义导师，关注人的主体性、创造力、自我成长和实现。用户可能觉得自己普通、没有主见，或依赖他人和社会规范。你需要帮助用户认识到自己的独特性，看到闪光点，鼓励她记录成长瞬间，培养长期目标，建立主体性，相信自己的判断，活出想要的样子。输出 JSON：objective_text, comfort_text, agency_score(0-10，整数)。`,
	},
}

type MentalAnalyzeResult struct {
	ObjectiveText         string  `json:"objective_text"`
	ComfortText           string  `json:"comfort_text"`
	MoodScore             float64 `json:"mood_score,omitempty"`
	SensitivityScore      float64 `json:"sensitivity_score,omitempty"`
	AgencyScore           float64 `json:"agency_score,omitempty"`
	RecommendIntervention bool    `json:"recommend_intervention"`
}

type MentalHistoryItem struct {
	ThemeName string `json:"theme_name"`
	Theme     string `json:"theme"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	Time      string `json:"time"`
}

type MentalStatistics struct {
	Theme       string    `json:"theme"`
	ThemeName   string    `json:"theme_name"`
	YLabel      string    `json:"y_label"`
	Labels      []string  `json:"labels"`
	Scores      []float64 `json:"scores"`
	Mean        float64   `json:"mean"`
	Variance    float64   `json:"variance"`
	Explanation string    `json:"explanation"`
	Message     string    `json:"message,omitempty"`
}

func GetMentalProfile(userID uint) (*models.MentalProfile, error) {
	var profile models.MentalProfile
	if err := database.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		profile = models.MentalProfile{UserID: userID}
		if err := database.DB.Create(&profile).Error; err != nil {
			return nil, err
		}
	}
	return &profile, nil
}

func UpdateMentalProfile(userID uint, username string) (*models.MentalProfile, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		username = "旅人"
	}
	profile, err := GetMentalProfile(userID)
	if err != nil {
		return nil, err
	}
	profile.Username = username
	if err := database.DB.Save(profile).Error; err != nil {
		return nil, err
	}
	return profile, nil
}

func AnalyzeMentalText(cfg *config.Config, userID uint, themeKey, text string) (*MentalAnalyzeResult, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, fmt.Errorf("请输入想聊的内容")
	}

	theme, ok := MentalThemes[themeKey]
	if !ok {
		return nil, fmt.Errorf("未知心灵主题")
	}

	now := time.Now()
	userRecord := models.MentalChatRecord{
		UserID:    userID,
		Theme:     theme.Key,
		Content:   text,
		Role:      "user",
		CreatedAt: now,
	}
	if err := database.DB.Create(&userRecord).Error; err != nil {
		return nil, err
	}

	messages := []chatMessage{{Role: "system", Content: theme.SystemPrompt}}
	var history []models.MentalChatRecord
	database.DB.Where("user_id = ? AND theme = ?", userID, theme.Key).
		Order("id DESC").
		Limit(6).
		Find(&history)
	for i := len(history) - 1; i >= 0; i-- {
		content := history[i].Content
		if history[i].Role == "assistant" {
			var parsed map[string]interface{}
			if err := json.Unmarshal([]byte(content), &parsed); err == nil {
				if comfort, ok := parsed["comfort_text"].(string); ok && comfort != "" {
					content = comfort
				}
			}
		}
		messages = append(messages, chatMessage{Role: history[i].Role, Content: content})
	}

	raw, err := callMentalLLM(cfg, messages)
	if err != nil {
		return nil, err
	}

	var result MentalAnalyzeResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("AI 返回格式异常")
	}
	if strings.TrimSpace(result.ObjectiveText) == "" || strings.TrimSpace(result.ComfortText) == "" {
		return nil, fmt.Errorf("AI 返回内容不完整")
	}

	score := result.scoreFor(theme.ScoreField)
	result.RecommendIntervention = score >= theme.Threshold

	assistantRecord := models.MentalChatRecord{
		UserID:    userID,
		Theme:     theme.Key,
		Content:   raw,
		Role:      "assistant",
		CreatedAt: now,
	}
	if err := database.DB.Create(&assistantRecord).Error; err != nil {
		return nil, err
	}

	mood := models.MentalMoodData{
		UserID:    userID,
		Theme:     theme.Key,
		Score:     score,
		CreatedAt: now,
	}
	if err := database.DB.Create(&mood).Error; err != nil {
		return nil, err
	}

	return &result, nil
}

func callMentalLLM(cfg *config.Config, messages []chatMessage) (string, error) {
	if cfg.AIAPIKey == "" {
		return "", fmt.Errorf("未配置 AI_API_KEY")
	}

	reqBody := chatRequest{
		Model:    cfg.AIModel,
		Messages: messages,
		ResponseFormat: &struct {
			Type string `json:"type"`
		}{Type: "json_object"},
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", cfg.AIBaseURL+"/chat/completions", bytes.NewReader(jsonBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.AIAPIKey)

	client := &http.Client{Timeout: 45 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求 AI 失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("AI 服务错误: %s", strings.TrimSpace(string(respBody)))
	}

	var parsed chatResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("解析 AI 响应失败")
	}
	if parsed.Error != nil {
		return "", fmt.Errorf("AI 错误: %s", parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("AI 未返回结果")
	}
	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

func GetMentalHistory(userID uint, theme, startDate, endDate string) ([]MentalHistoryItem, error) {
	q := database.DB.Where("user_id = ?", userID)
	if theme != "" && theme != "all" {
		q = q.Where("theme = ?", theme)
	}
	if startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			q = q.Where("created_at >= ?", t)
		}
	}
	if endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			q = q.Where("created_at <= ?", t.AddDate(0, 0, 1))
		}
	}

	var rows []models.MentalChatRecord
	if err := q.Order("id DESC").Find(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]MentalHistoryItem, 0, len(rows))
	for i := len(rows) - 1; i >= 0; i-- {
		row := rows[i]
		content := row.Content
		if row.Role == "assistant" {
			var parsed map[string]interface{}
			if err := json.Unmarshal([]byte(content), &parsed); err == nil {
				if comfort, ok := parsed["comfort_text"].(string); ok && comfort != "" {
					content = comfort
				}
			}
		}
		themeCfg := MentalThemes[row.Theme]
		role := "我"
		if row.Role == "assistant" {
			role = "导师"
		}
		items = append(items, MentalHistoryItem{
			ThemeName: themeCfg.Name,
			Theme:     row.Theme,
			Role:      role,
			Content:   content,
			Time:      row.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}
	return items, nil
}

func GetMentalWeeklyReport(userID uint) (map[string]interface{}, error) {
	threshold := time.Now().AddDate(0, 0, -7)
	var rows []models.MentalMoodData
	if err := database.DB.Where("user_id = ? AND created_at >= ?", userID, threshold).Find(&rows).Error; err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return map[string]interface{}{
			"has_report": false,
			"report":     "本周对话较少，还没法生成深度周报哦。",
		}, nil
	}

	grouped := map[string][]float64{}
	for _, row := range rows {
		grouped[row.Theme] = append(grouped[row.Theme], row.Score)
	}

	var b strings.Builder
	b.WriteString(fmt.Sprintf("心灵空间周报 (%s)\n\n", time.Now().Format("01/02")))
	order := []string{"sister", "younger_sister", "friend"}
	for _, themeKey := range order {
		scores := grouped[themeKey]
		if len(scores) == 0 {
			continue
		}
		theme := MentalThemes[themeKey]
		avg, _ := meanAndVariance(scores)
		b.WriteString(fmt.Sprintf("【%s】\n", theme.Name))
		b.WriteString(fmt.Sprintf("- 交流次数: %d次\n", len(scores)))
		b.WriteString(fmt.Sprintf("- %s均值: %.1f\n", theme.YLabel, avg))
		b.WriteString("- 建议: " + mentalWeeklyAdvice(themeKey, avg) + "\n\n")
	}

	now := time.Now()
	profile, err := GetMentalProfile(userID)
	if err == nil {
		profile.LastReportTime = &now
		database.DB.Save(profile)
	}

	return map[string]interface{}{
		"has_report": true,
		"report":     strings.TrimSpace(b.String()),
	}, nil
}

func GetMentalStatistics(userID uint, themeKey string, rangeDays int) (*MentalStatistics, error) {
	theme, ok := MentalThemes[themeKey]
	if !ok {
		theme = MentalThemes["sister"]
	}
	if rangeDays <= 0 {
		rangeDays = 1
	}

	threshold := time.Now().AddDate(0, 0, -rangeDays)
	var rows []models.MentalMoodData
	if err := database.DB.Where("user_id = ? AND theme = ? AND created_at >= ?", userID, theme.Key, threshold).
		Order("created_at ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	stats := &MentalStatistics{
		Theme:     theme.Key,
		ThemeName: theme.Name,
		YLabel:    theme.YLabel,
		Labels:    []string{},
		Scores:    []float64{},
	}
	if len(rows) == 0 {
		stats.Message = "暂无记录"
		return stats, nil
	}

	for i, row := range rows {
		stats.Labels = append(stats.Labels, fmt.Sprintf("%d", i+1))
		stats.Scores = append(stats.Scores, row.Score)
	}
	stats.Mean, stats.Variance = meanAndVariance(stats.Scores)
	stats.Explanation = mentalStatsExplanation(theme.Key, theme.YLabel, stats.Mean, stats.Variance)
	return stats, nil
}

func (r MentalAnalyzeResult) scoreFor(field string) float64 {
	switch field {
	case "sensitivity_score":
		return clampScore(r.SensitivityScore)
	case "agency_score":
		return clampScore(r.AgencyScore)
	default:
		return clampScore(r.MoodScore)
	}
}

func clampScore(v float64) float64 {
	if v < 0 || math.IsNaN(v) {
		return 0
	}
	if v > 10 {
		return 10
	}
	return v
}

func meanAndVariance(values []float64) (float64, float64) {
	if len(values) == 0 {
		return 0, 0
	}
	var sum float64
	for _, v := range values {
		sum += v
	}
	mean := sum / float64(len(values))
	var varianceSum float64
	for _, v := range values {
		diff := v - mean
		varianceSum += diff * diff
	}
	return math.Round(mean*10) / 10, math.Round((varianceSum/float64(len(values)))*10) / 10
}

func mentalWeeklyAdvice(theme string, avg float64) string {
	switch theme {
	case "friend":
		if avg >= 7 {
			return "主体性状态很亮，继续记录那些为自己做选择的瞬间。"
		}
		return "主体性建立需要一点一点来，先从每天一个小决定开始。"
	case "younger_sister":
		if avg <= 4 {
			return "对评价的敏感度在下降，继续把注意力收回自己身上。"
		}
		return "这周可能仍会被评价牵动，记得先做课题分离。"
	default:
		if avg <= 4 {
			return "情绪状态比较稳定，继续保留让你放松的节奏。"
		}
		return "压力偏高的时候，先暂停、呼吸，再处理真正的问题。"
	}
}

func mentalStatsExplanation(theme, yLabel string, mean, variance float64) string {
	status := ""
	vibration := ""
	switch theme {
	case "friend":
		if mean >= 7 {
			status = "主体性很亮，有在靠近那个独立的自己。"
		} else {
			status = "主体性建立不是一朝一夕的，先看见今天的小选择。"
		}
		if variance <= 2 {
			vibration = "波动较小，状态比较稳定。"
		} else {
			vibration = "有一些起伏，但成长路上起伏很正常。"
		}
	case "younger_sister":
		if mean <= 4 {
			status = "敏感度在降低，脱敏训练正在起作用。"
		} else {
			status = "对评价仍然比较敏感，可以继续练习把注意力收回自己。"
		}
		if variance <= 2 {
			vibration = "波动较小，状态在慢慢稳定。"
		} else {
			vibration = "波动较大，说明近期外界评价对你影响较明显。"
		}
	default:
		if mean <= 4 {
			status = "情绪比较稳定，压力没有持续升高。"
		} else {
			status = "压力和焦虑水平偏高，需要给自己一点缓冲。"
		}
		if variance <= 2 {
			vibration = "波动较小，情绪管理比较稳定。"
		} else {
			vibration = "情绪有起伏，先允许自己有反应，再慢慢调整。"
		}
	}
	return fmt.Sprintf("当前%s均值：%.1f（%s）\n方差：%.1f（%s）", yLabel, mean, status, variance, vibration)
}
