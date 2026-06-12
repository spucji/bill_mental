package models

import (
	"time"

	"gorm.io/gorm"
)

type MentalProfile struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	UserID         uint           `json:"user_id" gorm:"not null;uniqueIndex"`
	Username       string         `json:"username"`
	LastReportTime *time.Time     `json:"last_report_time"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}

type MentalChatRecord struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Theme     string         `json:"theme" gorm:"not null;index"`
	Content   string         `json:"content" gorm:"type:text;not null"`
	Role      string         `json:"role" gorm:"not null;index"`
	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

type MentalMoodData struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Theme     string         `json:"theme" gorm:"not null;index"`
	Score     float64        `json:"score" gorm:"not null"`
	CreatedAt time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
