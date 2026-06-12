package handlers

import (
	"net/http"
	"time"

	"github.com/dynamicers/bill/src/config"
	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type LoginReq struct {
	Account  string `json:"account" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "请输入账号和密码"})
		return
	}

	var user models.User
	if err := database.DB.Where("account = ?", req.Account).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "账号不存在，请联系管理员创建账号",
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "密码错误",
		})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"account": user.Account,
		"exp":     time.Now().Add(30 * 24 * time.Hour).Unix(),
	})

	tokenStr, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "生成 token 失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "登录成功",
		"data": gin.H{
			"token": tokenStr,
			"user":  user,
		},
	})
}
