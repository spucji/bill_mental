package handlers

import (
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/dynamicers/bill/src/config"
	"github.com/dynamicers/bill/src/services"
	"github.com/gin-gonic/gin"
)

type MentalHandler struct {
	cfg *config.Config
}

func NewMentalHandler(cfg *config.Config) *MentalHandler {
	return &MentalHandler{cfg: cfg}
}

type mentalProfileReq struct {
	Username string `json:"username"`
}

type mentalAnalyzeReq struct {
	Theme string `json:"theme" binding:"required"`
	Text  string `json:"text" binding:"required"`
}

func (h *MentalHandler) GetProfile(c *gin.Context) {
	profile, err := services.GetMentalProfile(c.GetUint("user_id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": profile})
}

func (h *MentalHandler) UpdateProfile(c *gin.Context) {
	var req mentalProfileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请求格式错误"})
		return
	}
	profile, err := services.UpdateMentalProfile(c.GetUint("user_id"), req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": profile})
}

func (h *MentalHandler) Analyze(c *gin.Context) {
	var req mentalAnalyzeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入内容和主题"})
		return
	}
	result, err := services.AnalyzeMentalText(h.cfg, c.GetUint("user_id"), req.Theme, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": result})
}

func (h *MentalHandler) History(c *gin.Context) {
	items, err := services.GetMentalHistory(
		c.GetUint("user_id"),
		c.DefaultQuery("theme", "all"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": items})
}

func (h *MentalHandler) WeeklyReport(c *gin.Context) {
	report, err := services.GetMentalWeeklyReport(c.GetUint("user_id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": report})
}

func (h *MentalHandler) Statistics(c *gin.Context) {
	rangeDays, _ := strconv.Atoi(c.DefaultQuery("range_days", "7"))
	stats, err := services.GetMentalStatistics(c.GetUint("user_id"), c.DefaultQuery("theme", "sister"), rangeDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": stats})
}

func (h *MentalHandler) Sound(c *gin.Context) {
	filename := filepath.Base(c.Param("filename"))
	if filename == "." || filename == "/" || strings.Contains(filename, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "文件名不合法"})
		return
	}
	c.FileAttachment(filepath.Join("assets", "sounds", filename), filename)
}
