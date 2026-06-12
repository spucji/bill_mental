package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Account   string         `json:"account" gorm:"not null;uniqueIndex"`
	Password  string         `json:"-" gorm:"not null"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Tag struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Name      string         `json:"name" gorm:"not null"`
	Records   []Record       `json:"-" gorm:"many2many:record_tags;"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Category struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Name      string         `json:"name" gorm:"not null"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Platform struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Name      string         `json:"name" gorm:"not null"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type Record struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	UserID     uint           `json:"user_id" gorm:"not null;index"`
	Date       time.Time      `json:"date" gorm:"not null;index"`
	Type       string         `json:"type" gorm:"not null;index"`
	Amount     float64        `json:"amount" gorm:"not null"`
	Note       string         `json:"note"`
	Tags       []Tag          `json:"tags" gorm:"many2many:record_tags;"`
	CategoryID *uint          `json:"category_id"`
	Category   *Category      `json:"category"`
	PlatformID *uint          `json:"platform_id"`
	Platform   *Platform      `json:"platform"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
}
