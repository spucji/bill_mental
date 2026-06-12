package handlers

import (
	"net/http"
	"strconv"

	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
	"github.com/gin-gonic/gin"
)

type TagHandler struct{}

func NewTagHandler() *TagHandler { return &TagHandler{} }

func getUserID(c *gin.Context) uint {
	id, _ := c.Get("user_id")
	return id.(uint)
}

type CreateTagReq struct {
	Name string `json:"name" binding:"required"`
}

func (h *TagHandler) List(c *gin.Context) {
	var tags []models.Tag
	database.DB.Where("user_id = ?", getUserID(c)).Order("created_at desc").Find(&tags)
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": tags})
}

func (h *TagHandler) Create(c *gin.Context) {
	var req CreateTagReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入标签名称"})
		return
	}

	tag := models.Tag{UserID: getUserID(c), Name: req.Name}
	if err := database.DB.Create(&tag).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "标签名已存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "创建成功", "data": tag})
}

func (h *TagHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "无效的 ID"})
		return
	}

	var req CreateTagReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入标签名称"})
		return
	}

	uid := getUserID(c)
	var tag models.Tag
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "标签不存在"})
		return
	}

	tag.Name = req.Name
	if err := database.DB.Save(&tag).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "标签名已存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "更新成功", "data": tag})
}

func (h *TagHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid := getUserID(c)

	var tag models.Tag
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "标签不存在"})
		return
	}

	database.DB.Model(&tag).Association("Records").Clear()
	database.DB.Delete(&tag)
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}
