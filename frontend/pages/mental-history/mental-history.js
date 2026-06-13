// pages/history/history.js
const app = getApp();

Page({
  data: {
    themeOptions: ['全部', '情绪缓冲垫', '脱敏·爱自己', '聪明的小羊'],
    themeKeys: ['all', 'sister', 'younger_sister', 'friend'],
    themeIdx: 0,
    startDate: '',
    endDate: '',
    records: []
  },

  onLoad() {
    // 设置默认结束日期为今天
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      endDate: today
    });
    this.fetchHistory();
  },

  onThemeChange(e) {
    this.setData({
      themeIdx: e.detail.value
    }, () => {
      this.fetchHistory();
    });
  },

  onDateChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      [type]: e.detail.value
    }, () => {
      this.fetchHistory();
    });
  },

  fetchHistory() {
    wx.showLoading({
      title: '正在读取印记...'
    });

    // --- 使用 app.js 封装的通用请求方法 ---
    app.request({
      url: '/api/mental/history',
      method: 'GET',
      data: {
        theme: this.data.themeKeys[this.data.themeIdx],
        start_date: this.data.startDate,
        end_date: this.data.endDate
      },
      success: (res) => {
        // 注意：兼容处理 res.data，部分环境返回结构可能不同
        const responseData = res.data;
        
        if (Array.isArray(responseData)) {
          // 核心美化逻辑：为每一条记录映射对应的 theme_key
          const formattedRecords = responseData.map(item => {
            let key = 'sister'; // 默认值
            
            // 根据后端返回的主题名进行关键词匹配，映射回前端样式的 key
            const themeName = item.theme_name || '';
            if (themeName.includes('脱敏') || themeName.includes('自己')) {
              key = 'younger_sister';
            } else if (themeName.includes('小羊') || themeName.includes('成长')) {
              key = 'friend';
            }
            
            return {
              ...item,
              theme_key: key // 对应 wxss 中的 .dot-sister, .tag-sister 等类名
            };
          });

          this.setData({
            records: formattedRecords
          });
        } else {
          wx.showToast({
            title: '暂无记录',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取历史记录失败：', err);
        wx.showToast({
          title: '连接服务器失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
        // 停止下拉刷新动画
        wx.stopPullDownRefresh();
      }
    });
  },

  // 支持下拉刷新
  onPullDownRefresh() {
    this.fetchHistory();
  },

  goSpaceSelect() {
    wx.navigateTo({ url: '/pages/space-select/space-select' });
  }
});
