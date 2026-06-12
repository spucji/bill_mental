package services

import (
	"time"

	"github.com/dynamicers/bill/src/database"
	"github.com/dynamicers/bill/src/models"
)

type ChartQuery struct {
	UserID     uint
	StartDate  string
	EndDate    string
	Type       string // income / expense / all
	TagIDs     []uint
	CategoryID *uint
	PlatformID *uint
	MinAmount  float64
	MaxAmount  float64
}

type SummaryData struct {
	TotalIncome  float64      `json:"total_income"`
	TotalExpense float64      `json:"total_expense"`
	NetAmount    float64      `json:"net_amount"`
	RecordCount  int64        `json:"record_count"`
	ByTag        []TagSummary `json:"by_tag"`
	ByCategory   []NameAmount `json:"by_category"`
	ByPlatform   []NameAmount `json:"by_platform"`
}

type TagSummary struct {
	TagName string  `json:"tag_name"`
	Amount  float64 `json:"amount"`
}

type NameAmount struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
}

func queryRecords(q ChartQuery) ([]models.Record, error) {
	query := database.DB.Where("user_id = ?", q.UserID).Preload("Tags").Preload("Category").Preload("Platform")

	if q.StartDate != "" {
		if t, err := time.Parse("2006-01-02", q.StartDate); err == nil {
			query = query.Where("date >= ?", t)
		}
	}
	if q.EndDate != "" {
		if t, err := time.Parse("2006-01-02", q.EndDate); err == nil {
			query = query.Where("date <= ?", t)
		}
	}
	if q.Type != "" && q.Type != "all" {
		query = query.Where("type = ?", q.Type)
	}
	if q.MinAmount > 0 {
		query = query.Where("amount >= ?", q.MinAmount)
	}
	if q.MaxAmount > 0 {
		query = query.Where("amount <= ?", q.MaxAmount)
	}
	if q.CategoryID != nil {
		query = query.Where("category_id = ?", *q.CategoryID)
	}
	if q.PlatformID != nil {
		query = query.Where("platform_id = ?", *q.PlatformID)
	}
	if len(q.TagIDs) > 0 {
		subQuery := database.DB.Table("record_tags").
			Select("record_id").
			Where("tag_id IN ?", q.TagIDs)
		query = query.Where("id IN (?)", subQuery)
	}

	var records []models.Record
	if err := query.Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func GetSummary(q ChartQuery) (*SummaryData, error) {
	records, err := queryRecords(q)
	if err != nil {
		return nil, err
	}

	s := &SummaryData{
		RecordCount: int64(len(records)),
	}

	tagMap := make(map[string]float64)
	catMap := make(map[string]float64)
	platMap := make(map[string]float64)

	for _, r := range records {
		if r.Type == "income" {
			s.TotalIncome += r.Amount
		} else {
			s.TotalExpense += r.Amount
		}

		for _, t := range r.Tags {
			tagMap[t.Name] += r.Amount
		}

		catName := "未分类"
		if r.Category != nil {
			catName = r.Category.Name
		}
		catMap[catName] += r.Amount

		platName := "未知平台"
		if r.Platform != nil {
			platName = r.Platform.Name
		}
		platMap[platName] += r.Amount
	}

	s.NetAmount = s.TotalIncome - s.TotalExpense

	for k, v := range tagMap {
		s.ByTag = append(s.ByTag, TagSummary{TagName: k, Amount: v})
	}
	for k, v := range catMap {
		s.ByCategory = append(s.ByCategory, NameAmount{Name: k, Amount: v})
	}
	for k, v := range platMap {
		s.ByPlatform = append(s.ByPlatform, NameAmount{Name: k, Amount: v})
	}

	return s, nil
}
