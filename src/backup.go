package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func runBackupCLI() {
	args := os.Args[2:] // ./bill backup <本地文件> <云端路径>

	if len(args) != 2 {
		fmt.Println("用法: bill backup <本地文件路径> <云端对象路径>")
		fmt.Println()
		fmt.Println("环境变量:")
		fmt.Println("  S3_ENDPOINT    对象存储地址（如 https://oss-cn-hangzhou.aliyuncs.com）")
		fmt.Println("  S3_BUCKET      存储桶名称")
		fmt.Println("  S3_ACCESS_KEY  Access Key")
		fmt.Println("  S3_SECRET_KEY  Secret Key")
		fmt.Println()
		fmt.Println("示例:")
		fmt.Println("  bill backup ./bill.db backups/bill-1.db")
		os.Exit(1)
	}

	localPath := args[0]
	remoteKey := args[1]

	endpoint := os.Getenv("S3_ENDPOINT")
	bucket := os.Getenv("S3_BUCKET")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")

	if endpoint == "" || bucket == "" || accessKey == "" || secretKey == "" {
		log.Fatalf("缺少 S3 环境变量: S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY")
	}

	file, err := os.Open(localPath)
	if err != nil {
		log.Fatalf("无法打开文件 %s: %v", localPath, err)
	}
	defer file.Close()

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion("us-east-1"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		log.Fatalf("创建 S3 客户端失败: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	fmt.Printf("上传 %s → s3://%s/%s ...\n", localPath, bucket, remoteKey)
	_, err = client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(remoteKey),
		Body:   file,
	})
	if err != nil {
		log.Fatalf("上传失败: %v", err)
	}
	fmt.Println("✓ 上传完成")
}
