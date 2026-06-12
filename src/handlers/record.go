package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
	"github.com/gin-gonic/gin"
)

type RecordHandler struct{}

const (
	defaultRecordPageSize = 20
	fullRecordPageSize    = 200
	maxRecordPageSize     = 5000
)

func NewRecordHandler() *RecordHandler {
	return &RecordHandler{}
}

type CreateRecordReq struct {
	Date       string  `json:"date" binding:"required"`
	Type       string  `json:"type" binding:"required"`
	Amount     float64 `json:"amount" binding:"required"`
	Note       string  `json:"note"`
	TagIDs     []uint  `json:"tag_ids"`
	CategoryID *uint   `json:"category_id"`
	PlatformID *uint   `json:"platform_id"`
}

type UpdateRecordReq struct {
	Date       string  `json:"date"`
	Type       string  `json:"type"`
	Amount     float64 `json:"amount"`
	Note       string  `json:"note"`
	TagIDs     []uint  `json:"tag_ids"`
	CategoryID *uint   `json:"category_id"`
	PlatformID *uint   `json:"platform_id"`
}

// List 查询收支记录（支持筛选和分页）
func (h *RecordHandler) List(c *gin.Context) {
	userID := c.GetUint("user_id")

	query := database.DB.Where("user_id = ?", userID).Preload("Tags").Preload("Category").Preload("Platform")

	// 日期范围
	if startDate := c.Query("start_date"); startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("date >= ?", t)
		}
	}
	if endDate := c.Query("end_date"); endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("date <= ?", t)
		}
	}

	// 收支类型
	if recordType := c.Query("type"); recordType != "" {
		query = query.Where("type = ?", recordType)
	}

	// 金额范围
	if minAmount := c.Query("min_amount"); minAmount != "" {
		if v, err := strconv.ParseFloat(minAmount, 64); err == nil {
			query = query.Where("amount >= ?", v)
		}
	}
	if maxAmount := c.Query("max_amount"); maxAmount != "" {
		if v, err := strconv.ParseFloat(maxAmount, 64); err == nil {
			query = query.Where("amount <= ?", v)
		}
	}

	// 标签筛选（包含任一选中标签的记录）
	if tagIDsStr := c.Query("tag_ids"); tagIDsStr != "" {
		var tagIDs []uint
		for _, s := range splitInts(tagIDsStr) {
			tagIDs = append(tagIDs, uint(s))
		}
		if len(tagIDs) > 0 {
			subQuery := database.DB.Table("record_tags").
				Select("record_id").
				Where("tag_id IN ?", tagIDs)
			query = query.Where("id IN (?)", subQuery)
		}
	}

	// 分页
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", strconv.Itoa(defaultRecordPageSize)))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = defaultRecordPageSize
	}
	if pageSize == fullRecordPageSize {
		pageSize = maxRecordPageSize
	}
	if pageSize > maxRecordPageSize {
		pageSize = maxRecordPageSize
	}

	var total int64
	query.Model(&models.Record{}).Count(&total)

	var records []models.Record
	query.Order("date desc, id desc").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&records)

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data": gin.H{
			"list":      records,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// Get 获取单条记录
func (h *RecordHandler) Get(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的 ID"})
		return
	}

	var record models.Record
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).Preload("Tags").Preload("Category").Preload("Platform").First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "记录不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    record,
	})
}

// Create 创建收支记录
func (h *RecordHandler) Create(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateRecordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请填写完整信息"})
		return
	}

	if req.Type != "income" && req.Type != "expense" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "类型必须为 income 或 expense"})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "日期格式错误，应为 2006-01-02"})
		return
	}

	record := models.Record{
		UserID:     userID,
		Date:       date,
		Type:       req.Type,
		Amount:     req.Amount,
		Note:       req.Note,
		CategoryID: req.CategoryID,
		PlatformID: req.PlatformID,
	}

	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		database.DB.Where("id IN ?", req.TagIDs).Find(&tags)
		record.Tags = tags
	}

	database.DB.Create(&record)
	database.DB.Preload("Tags").Preload("Category").Preload("Platform").First(&record, record.ID)

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "创建成功",
		"data":    record,
	})
}

// Update 更新收支记录
func (h *RecordHandler) Update(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的 ID"})
		return
	}

	var record models.Record
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "记录不存在"})
		return
	}

	var req UpdateRecordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "参数错误"})
		return
	}

	if req.Date != "" {
		if date, err := time.Parse("2006-01-02", req.Date); err == nil {
			record.Date = date
		}
	}
	if req.Type != "" {
		if req.Type != "income" && req.Type != "expense" {
			c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "类型必须为 income 或 expense"})
			return
		}
		record.Type = req.Type
	}
	if req.Amount != 0 {
		record.Amount = req.Amount
	}
	record.Note = req.Note
	record.CategoryID = req.CategoryID
	record.PlatformID = req.PlatformID

	if req.TagIDs != nil {
		var tags []models.Tag
		database.DB.Where("id IN ?", req.TagIDs).Find(&tags)
		database.DB.Model(&record).Association("Tags").Replace(tags)
	}

	database.DB.Save(&record)
	database.DB.Preload("Tags").Preload("Category").Preload("Platform").First(&record, record.ID)

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
		"data":    record,
	})
}

// Delete 删除收支记录
func (h *RecordHandler) Delete(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的 ID"})
		return
	}

	var record models.Record
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "记录不存在"})
		return
	}

	database.DB.Model(&record).Association("Tags").Clear()
	database.DB.Delete(&record)

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}

func splitInts(s string) []int {
	var result []int
	for _, part := range splitByComma(s) {
		if v, err := strconv.Atoi(part); err == nil {
			result = append(result, v)
		}
	}
	return result
}

func splitByComma(s string) []string {
	var parts []string
	current := ""
	for _, ch := range s {
		if ch == ',' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else if ch != ' ' {
			current += string(ch)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}
