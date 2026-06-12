package middleware

import (
	"net/http"

	"github.com/dynamicers/bill/src/config"
	"github.com/gin-gonic/gin"
)

// AdminAuth 验证管理员密钥（Header: X-Admin-Key）
func AdminAuth(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-Admin-Key")
		if key == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "缺少 X-Admin-Key 请求头",
			})
			return
		}
		if key != cfg.AdminKey {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "管理员密钥错误",
			})
			return
		}
		c.Next()
	}
}
