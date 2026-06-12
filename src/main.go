package main

import (
	"fmt"
	"io"
	"log"
	"os"

	"github.com/dynamicers/bill/src/config"
	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/handlers"
	"github.com/dynamicers/bill/src/middleware"
	"github.com/dynamicers/bill/src/models"
	"github.com/gin-gonic/gin"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	cfg := config.Load()

	// 日志轮转
	setupLogging(cfg)

	database.Init(cfg.DBPath)

	// CLI 运维模式: ./bill admin <command>
	if len(os.Args) >= 2 && os.Args[1] == "admin" {
		runAdminCLI(os.Args[2:])
		return
	}
	if len(os.Args) >= 2 && os.Args[1] == "backup" {
		runBackupCLI()
		return
	}

	runServer(cfg)
}

func setupLogging(cfg *config.Config) {
	if cfg.LogPath == "" {
		return // 无文件日志，仅输出 stderr
	}

	log.SetOutput(io.MultiWriter(os.Stderr, &lumberjack.Logger{
		Filename:   cfg.LogPath,
		MaxSize:    10, // MB
		MaxBackups: 7,  // 保留 7 个备份
		MaxAge:     30, // 天
		Compress:   true,
	}))
}

func runServer(cfg *config.Config) {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Key")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")

	// 登录
	authH := handlers.NewAuthHandler(cfg)
	api.POST("/login", authH.Login)

	// 管理员 API
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.AdminAuth(cfg))
	adminH := handlers.NewAdminHandler()
	adminGroup.GET("/users", adminH.ListUsers)
	adminGroup.POST("/users", adminH.CreateUser)
	adminGroup.DELETE("/users/:id", adminH.DeleteUser)

	// 用户 API
	auth := api.Group("")
	auth.Use(middleware.AuthRequired(cfg))

	tagH := handlers.NewTagHandler()
	auth.GET("/tags", tagH.List)
	auth.POST("/tags", tagH.Create)
	auth.PUT("/tags/:id", tagH.Update)
	auth.DELETE("/tags/:id", tagH.Delete)

	catH := handlers.NewCategoryHandler()
	auth.GET("/categories", catH.List)
	auth.POST("/categories", catH.Create)
	auth.PUT("/categories/:id", catH.Update)
	auth.DELETE("/categories/:id", catH.Delete)

	platH := handlers.NewPlatformHandler()
	auth.GET("/platforms", platH.List)
	auth.POST("/platforms", platH.Create)
	auth.PUT("/platforms/:id", platH.Update)
	auth.DELETE("/platforms/:id", platH.Delete)

	// 修改密码
	auth.PUT("/password", adminH.ChangePassword)

	recordH := handlers.NewRecordHandler()
	auth.GET("/records", recordH.List)
	auth.GET("/records/:id", recordH.Get)
	auth.POST("/records", recordH.Create)
	auth.PUT("/records/:id", recordH.Update)
	auth.DELETE("/records/:id", recordH.Delete)

	analysisH := handlers.NewAnalysisHandler()
	auth.GET("/analysis/summary", analysisH.Summary)

	voiceH := handlers.NewVoiceHandler(cfg)
	auth.POST("/records/voice", voiceH.ParseVoice)

	mentalH := handlers.NewMentalHandler(cfg)
	mental := auth.Group("/mental")
	mental.GET("/profile", mentalH.GetProfile)
	mental.POST("/profile", mentalH.UpdateProfile)
	mental.POST("/analyze", mentalH.Analyze)
	mental.GET("/history", mentalH.History)
	mental.GET("/weekly-report", mentalH.WeeklyReport)
	mental.GET("/statistics", mentalH.Statistics)
	mental.GET("/sounds/:filename", mentalH.Sound)

	addr := ":" + cfg.ServerPort

	if cfg.TLSCert != "" && cfg.TLSKey != "" {
		log.Printf("HTTPS 服务启动于 %s", addr)
		if err := r.RunTLS(addr, cfg.TLSCert, cfg.TLSKey); err != nil {
			log.Fatalf("启动失败: %v", err)
		}
	} else {
		log.Printf("HTTP 服务启动于 %s", addr)
		if err := r.Run(addr); err != nil {
			log.Fatalf("启动失败: %v", err)
		}
	}
}

// ========== CLI 运维工具 ==========

func runAdminCLI(args []string) {
	if len(args) == 0 {
		fmt.Println(`运维工具:
  bill admin list-users                    列出所有用户
  bill admin create-user <账号>             创建用户（初始密码 1234）
  bill admin reset-password <账号>          重置密码为 1234
  bill admin delete-user <账号|ID>          删除用户（含其所有记录）`)
		return
	}

	switch args[0] {
	case "list-users", "list":
		var users []models.User
		database.DB.Order("id").Find(&users)
		if len(users) == 0 {
			fmt.Println("（暂无用户）")
			return
		}
		fmt.Println("ID\t账号")
		for _, u := range users {
			fmt.Printf("%d\t%s\n", u.ID, u.Account)
		}

	case "create-user", "create":
		if len(args) < 2 {
			fmt.Println("用法: bill admin create-user <账号>")
			return
		}
		var existing models.User
		if err := database.DB.Where("account = ?", args[1]).First(&existing).Error; err == nil {
			fmt.Printf("账号 %s 已存在 (ID=%d)\n", args[1], existing.ID)
			return
		}
		user := models.User{
			Account:  args[1],
			Password: handlers.HashPassword("1234"),
		}
		database.DB.Create(&user)
		handlers.SeedDefaults(user.ID)
		fmt.Printf("创建成功: ID=%d 账号=%s 初始密码=1234\n", user.ID, user.Account)

	case "reset-password", "reset-pw", "reset":
		if len(args) < 2 {
			fmt.Println("用法: bill admin reset-password <账号>")
			return
		}
		var user models.User
		if err := database.DB.Where("account = ?", args[1]).First(&user).Error; err != nil {
			fmt.Printf("用户不存在: %s\n", args[1])
			return
		}
		user.Password = handlers.HashPassword("1234")
		database.DB.Save(&user)
		fmt.Printf("已重置密码: 账号=%s 新密码=1234\n", user.Account)

	case "delete-user", "delete":
		if len(args) < 2 {
			fmt.Println("用法: bill admin delete-user <账号|ID>")
			return
		}
		var user models.User
		if err := database.DB.First(&user, args[1]).Error; err != nil {
			if err2 := database.DB.Where("account = ?", args[1]).First(&user).Error; err2 != nil {
				fmt.Printf("用户不存在: %s\n", args[1])
				return
			}
		}
		database.DB.Where("user_id = ?", user.ID).Delete(&models.Record{})
		database.DB.Delete(&user)
		fmt.Printf("已删除: ID=%d 账号=%s（含该用户所有记录）\n", user.ID, user.Account)

	default:
		fmt.Printf("未知命令: %s\n", args[0])
		fmt.Println("可用: list-users, create-user, reset-password, delete-user")
	}
}
