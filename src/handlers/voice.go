package handlers

import (
	"io"
	"net/http"

	"github.com/dynamicers/bill/src/config"
	"github.com/dynamicers/bill/src/services"
	"github.com/gin-gonic/gin"
)

type VoiceHandler struct {
	cfg *config.Config
}

func NewVoiceHandler(cfg *config.Config) *VoiceHandler {
	return &VoiceHandler{cfg: cfg}
}

// ParseVoice 解析语音文件，返回结构化记录
func (h *VoiceHandler) ParseVoice(c *gin.Context) {
	// 验证 AI 配置
	if h.cfg.AIAPIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "未配置 AI_API_KEY，请设置环境变量",
		})
		return
	}

	// 获取上传文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请上传语音文件（表单字段名: file）",
		})
		return
	}
	defer file.Close()

	// 限制文件大小（最大 10MB）
	if header.Size > 10<<20 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "文件过大，请控制在 10MB 以内",
		})
		return
	}

	// 读取文件内容
	audioData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "读取文件失败",
		})
		return
	}

	// 调用语音解析服务
	result, err := services.ProcessVoice(h.cfg, audioData, header.Filename)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"code":    422,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "解析成功",
		"data":    result,
	})
}
