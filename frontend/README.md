# 记账小程序前端

## 使用步骤

### 1. 修改服务器地址
在 `app.js` 中将 `baseURL` 改为你的后端服务器地址：
```js
baseURL: 'https://your-server.com'
```
也可以在「我的」页面中动态修改。

### 2. 配置 AppID
在 `project.config.json` 中填写你的小程序 AppID：
```json
"appid": "wx1234567890"
```

### 3. 导入微信开发者工具
1. 打开微信开发者工具
2. 选择「导入项目」
3. 目录选择 `frontend/`
4. AppID 填入你的小程序 AppID（测试可用测试号）

### 4. 配置合法域名
在小程序管理后台 → 开发管理 → 服务器域名中，将后端 API 域名加入 request 和 uploadFile 合法域名。

## 页面结构

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录 | pages/login | 输入账号登录 |
| 明细 | pages/records | 收支列表、按月筛选、类型筛选 |
| 添加/编辑 | pages/record-edit | 表单录入 + 语音输入 |
| 标签管理 | pages/tags | 增删改标签 |
| 统计 | pages/analysis | 汇总卡片 + 图表 + 按账户/标签明细 |
| 我的 | pages/mine | 个人信息、标签入口、服务器设置、退出 |

## 语音输入流程

1. 长按「语音输入」按钮开始录音
2. 松开按钮停止录音
3. 音频上传到后端 → ASR 转文字 → LLM 提取结构化字段
4. 自动填充表单（金额/账户/备注/标签等）

需要后端配置 AI_API_KEY / ASR_APP_ID / ASR_TOKEN 环境变量。
