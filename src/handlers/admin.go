package handlers

import (
	"net/http"
	"strconv"

	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const defaultPassword = "1234"

// HashPassword 用 bcrypt 哈希密码
func HashPassword(pw string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(hash)
}

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler { return &AdminHandler{} }

func (h *AdminHandler) ListUsers(c *gin.Context) {
	var users []models.User
	database.DB.Order("id asc").Find(&users)
	if users == nil {
		users = []models.User{}
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "ok", "data": users})
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req struct {
		Account string `json:"account" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入账号"})
		return
	}

	var existing models.User
	if err := database.DB.Where("account = ?", req.Account).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"code": 409, "message": "账号已存在"})
		return
	}

	user := models.User{
		Account:  req.Account,
		Password: HashPassword(defaultPassword),
	}
	database.DB.Create(&user)
	SeedDefaults(user.ID)

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "创建成功，初始密码 1234", "data": user})
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "用户不存在"})
		return
	}
	database.DB.Where("user_id = ?", user.ID).Delete(&models.Record{})
	database.DB.Delete(&user)
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}

// ChangePassword 用户修改密码（需登录）
func (h *AdminHandler) ChangePassword(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请填写旧密码和新密码"})
		return
	}
	if len(req.NewPassword) < 4 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "新密码至少 4 位"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 404, "message": "用户不存在"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"code": 403, "message": "旧密码错误"})
		return
	}

	user.Password = HashPassword(req.NewPassword)
	database.DB.Save(&user)
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "密码修改成功"})
}

func SeedDefaults(userID uint) {
	cats := []string{"餐饮", "交通", "购物", "住房"}
	plats := []string{"微信", "支付宝", "现金", "银行卡"}
	tags := []string{"日常", "必需", "可选", "娱乐"}

	for _, name := range cats {
		database.DB.Create(&models.Category{UserID: userID, Name: name})
	}
	for _, name := range plats {
		database.DB.Create(&models.Platform{UserID: userID, Name: name})
	}
	for _, name := range tags {
		database.DB.Create(&models.Tag{UserID: userID, Name: name})
	}
}
