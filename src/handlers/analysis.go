package handlers

import (
	"net/http"
	"strconv"

	"github.com/dynamicers/bill/src/services"
	"github.com/gin-gonic/gin"
)

type AnalysisHandler struct{}

func NewAnalysisHandler() *AnalysisHandler {
	return &AnalysisHandler{}
}

// Summary 获取汇总数据
func (h *AnalysisHandler) Summary(c *gin.Context) {
	userID := c.GetUint("user_id")

	q := services.ChartQuery{
		UserID:    userID,
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		Type:      c.DefaultQuery("type", "all"),
	}
	if tagIDsStr := c.Query("tag_ids"); tagIDsStr != "" {
		for _, s := range splitInts(tagIDsStr) {
			q.TagIDs = append(q.TagIDs, uint(s))
		}
	}
	if v := c.Query("category_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 32); err == nil {
			uid := uint(id)
			q.CategoryID = &uid
		}
	}
	if v := c.Query("platform_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 32); err == nil {
			uid := uint(id)
			q.PlatformID = &uid
		}
	}
	if v := c.Query("min_amount"); v != "" {
		q.MinAmount, _ = strconv.ParseFloat(v, 64)
	}
	if v := c.Query("max_amount"); v != "" {
		q.MaxAmount, _ = strconv.ParseFloat(v, 64)
	}

	summary, err := services.GetSummary(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    summary,
	})
}
