package database

import (
	"fmt"
	"log"

	"github.com/dynamicers/bill/src/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init(dbPath string) {
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("连接 SQLite 失败: %v", err)
	}
	log.Printf("SQLite 数据库: %s", dbPath)

	err = DB.AutoMigrate(
		&models.User{},
		&models.Tag{},
		&models.Category{},
		&models.Platform{},
		&models.Record{},
	)
	if err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	// 复合唯一索引：同一用户下名称唯一
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name)")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name)")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_platforms_user_name ON platforms(user_id, name)")

	// 已有用户缺少密码则设为 1234
	hash, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)
	DB.Model(&models.User{}).Where("password = ''").Update("password", string(hash))

	fmt.Println("数据库初始化完成")
}
