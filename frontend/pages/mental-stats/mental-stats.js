// stats.js

Page({
  data: {
    currentTheme: 'sister',
    themeOptions: ['情绪缓冲垫', '脱敏爱自己', '聪明的小羊'],
    themeKeys: ['sister', 'younger_sister', 'friend'],
    themeIndex: 0,
    rangeOptions: ['今日', '最近3天', '最近7天', '最近14天'],
    rangeIndex: 1,
    statsImage: '',
    scoreBars: [],
    statsExplanation: '',
    statsMsg: '点击上方按钮生成报告'
  },

  onShow() {
    const app = getApp();
    const theme = app.globalData.currentTheme || 'sister';
    const themeIdx = this.data.themeKeys.indexOf(theme);
    this.setData({ 
      currentTheme: theme,
      themeIndex: themeIdx !== -1 ? themeIdx : 0
    });
    const colors = { sister: '#2e7d32', younger_sister: '#d81b60', friend: '#ef6c00' };
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: colors[this.data.currentTheme] || '#2e7d32'
    });
  },

  onThemeChange(e) {
    const theme = this.data.themeKeys[e.detail.value];
    const app = getApp();
    app.globalData.currentTheme = theme;
    this.setData({ 
      themeIndex: e.detail.value,
      currentTheme: theme 
    });
  },

  onRangeChange(e) { this.setData({ rangeIndex: e.detail.value }); },

  // 生成分主题综合周报
  fetchWeeklyReport() {
    const app = getApp();
    wx.showLoading({ title: '正在分析汇总...' });

    app.request({
      url: '/api/mental/weekly-report',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.has_report) {
          wx.showModal({
            title: '本周心灵总结',
            content: res.data.report,
            showCancel: false,
            confirmText: '收到'
          });
        } else {
          wx.showToast({ title: '记录太少，下周再来吧', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '获取周报失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  fetchStats() {
    const app = getApp();
    const days = [0, 3, 7, 14][this.data.rangeIndex];
    
    wx.showLoading({ title: '报告生成中...', mask: true });

    app.request({
      url: '/api/mental/statistics',
      method: 'GET',
      data: {
        theme: this.data.currentTheme,
        range_days: days
      },
      success: (res) => {
        const data = res.data || {};
        if (data.scores && data.scores.length > 0) {
          this.setData({
            statsImage: '',
            scoreLabels: data.labels || [],
            scoreBars: data.scores.map(function (score, idx) {
              return {
                label: (data.labels || [])[idx] || String(idx + 1),
                score: Number(score).toFixed(1),
                height: Math.max(8, Number(score) * 16)
              };
            }),
            statsExplanation: data.explanation || '分析完成。',
            statsMsg: "" 
          });
        } else {
          this.setData({ statsImage: "", scoreBars: [], statsMsg: data.message || "暂无记录", statsExplanation: "" });
        }
      },
      fail: () => {
        wx.showToast({ title: '获取统计失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});
