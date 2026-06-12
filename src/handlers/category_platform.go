package handlers

import (
	"net/http"
	"strconv"

	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
	"github.com/gin-gonic/gin"
)

// ========== Category ==========

type CategoryHandler struct{}

func NewCategoryHandler() *CategoryHandler { return &CategoryHandler{} }

func (h *CategoryHandler) List(c *gin.Context) {
	var list []models.Category
	database.DB.Where("user_id = ?", getUserID(c)).Order("id").Find(&list)
	if list == nil {
		list = []models.Category{}
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": list})
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var req struct{ Name string `json:"name" binding:"required"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入类目名称"})
		return
	}
	m := models.Category{UserID: getUserID(c), Name: req.Name}
	if err := database.DB.Create(&m).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "类目名已存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "创建成功", "data": m})
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid := getUserID(c)
	var req struct{ Name string `json:"name" binding:"required"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入类目名称"})
		return
	}
	var m models.Category
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&m).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "类目不存在"})
		return
	}
	m.Name = req.Name
	if err := database.DB.Save(&m).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "类目名已存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "更新成功", "data": m})
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid := getUserID(c)
	var m models.Category
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&m).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "类目不存在"})
		return
	}
	database.DB.Model(&models.Record{}).Where("category_id = ?", id).Update("category_id", nil)
	database.DB.Delete(&m)
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}

// ========== Platform ==========

type PlatformHandler struct{}

func NewPlatformHandler() *PlatformHandler { return &PlatformHandler{} }

func (h *PlatformHandler) List(c *gin.Context) {
	var list []models.Platform
	database.DB.Where("user_id = ?", getUserID(c)).Order("id").Find(&list)
	if list == nil {
		list = []models.Platform{}
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": list})
}

func (h *PlatformHandler) Create(c *gin.Context) {
	var req struct{ Name string `json:"name" binding:"required"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入平台名称"})
		return
	}
	m := models.Platform{UserID: getUserID(c), Name: req.Name}
	if err := database.DB.Create(&m).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "平台名已存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "创建成功", "data": m})
}

func (h *PlatformHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid := getUserID(c)
	var req struct{ Name string `json:"name" binding:"required"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入平台名称"})
		return
	}
	var m models.Platform
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&m).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "平台不存在"})
		return
	}
	m.Name = req.Name
	if err := database.DB.Save(&m).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "平台名已存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "更新成功", "data": m})
}

func (h *PlatformHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid := getUserID(c)
	var m models.Platform
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&m).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "平台不存在"})
		return
	}
	database.DB.Model(&models.Record{}).Where("platform_id = ?", id).Update("platform_id", nil)
	database.DB.Delete(&m)
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}
