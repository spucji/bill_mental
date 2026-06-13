// index.js

Page({
  data: {
    currentTheme: 'sister',
    themeConfigs: {
      sister: { 
        title: '情绪转译舱', 
        subtitle: '把焦虑留在这里，带走平静', 
        inputPlaceholder: '是不是又焦虑了，告诉我你现在的委屈和压力...', 
        objectiveLabel: '你的压力点和焦虑点：', 
        comfortLabel: '给你抱抱，还请放轻松啊：' 
      },
      younger_sister: { 
        title: '脱敏·爱自己', 
        subtitle: '你是自己的课题，而非他人的评价', 
        inputPlaceholder: '刚才谁的评价让你不爽了，让你敏感了？都说什么了？...', 
        objectiveLabel: '谁在CPU你：', 
        comfortLabel: '咱不理他们：' 
      },
      friend: { 
        title: '聪明的小羊', 
        subtitle: '像手工钩织和打理花束一样，雕刻主体性', 
        inputPlaceholder: '今天有什么决定是为你自己做的？今天看到了自己在什么方面的成长？今天又做了什么手工呢？...', 
        objectiveLabel: '主体性闪光时刻：', 
        comfortLabel: '小羊陪你一起成长：' 
      }
    },
    userInput: '', 
    result: null, 
    loading: false,
    greetingText: '', 
    subGreeting: '每一个情绪瞬间都值得被温柔对待',
    showBreathing: false, 
    isInhaling: false, 
    breathingHint: '',
    shredText: '', 
    isShredding: false,
    starCount: 0
  },

  onLoad(options) {
    this.updateGreeting();
    const app = getApp();
    if (app && app.globalData) {
      const theme = options.theme || app.globalData.currentTheme || 'sister';
      this.switchTheme(theme);
    }
  },

  onShow() {
    this.updateGreeting();
    const app = getApp();
    if (app && app.globalData) {
      const themeInApp = app.globalData.currentTheme;
      if (themeInApp && themeInApp !== this.data.currentTheme) {
        this.switchTheme(themeInApp);
      }
    }
  },

  updateGreeting() {
    const app = getApp();
    const name = app.globalData.username || '亲爱的';
    const hour = new Date().getHours();
    let baseGreeting = '';
    if (hour < 9) baseGreeting = `早安，${name}。新的一天我们会好好的`;
    else if (hour < 12) baseGreeting = `上午好，${name}。记得相信自己哦`;
    else if (hour < 14) baseGreeting = `午后好，${name}。休息一下喝口水`;
    else if (hour < 18) baseGreeting = `下午好，${name}。累了的话就打个盹`;
    else if (hour < 22) baseGreeting = `晚上好，${name}。记得早点休息哦`;
    else baseGreeting = `晚安，${name}。我会一直陪着你`;
    this.setData({ greetingText: baseGreeting });
  },

  // 跳转至历史记录页面
  viewHistory() {
    wx.navigateTo({
      url: '/pages/mental-history/mental-history'
    });
  },

  goSpaceSelect() {
    wx.navigateTo({ url: '/pages/space-select/space-select' });
  },

  switchTheme(e) {
    const theme = (typeof e === 'string') ? e : e.currentTarget.dataset.theme;
    const config = this.data.themeConfigs[theme];
    if (!config) return;

    this.setData({
      currentTheme: theme,
      themeTitle: config.title,
      themeSubtitle: config.subtitle,
      inputPlaceholder: config.inputPlaceholder,
      objectiveLabel: config.objectiveLabel,
      comfortLabel: config.comfortLabel,
      result: null,
      starCount: 0,
      showBreathing: false,
      shredText: ''
    });
    
    const navColors = { sister: '#2e7d32', younger_sister: '#d81b60', friend: '#ef6c00' };
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: navColors[theme] || '#2e7d32'
    });
    
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.currentTheme = theme;
    }
  },

  onInput(e) { this.setData({ userInput: e.detail.value }); },
  
  submitEmotion() {
    if (!this.data.userInput || this.data.loading) return;
    
    const lastInput = this.data.userInput;
    const app = getApp();

    this.setData({ loading: true });

    // 使用 app.js 封装的统一请求方法
    app.request({
      url: '/api/mental/analyze',
      method: 'POST',
      data: { 
        text: lastInput, 
        theme: this.data.currentTheme 
      },
      success: (res) => {
        const data = res.data;
        if (!data) return;
        this.setData({ result: data, userInput: '' });
        if (data.recommend_intervention || lastInput.includes('爆炸') || lastInput.includes('受不了')) {
          this.triggerSmartIntervention(this.data.currentTheme, lastInput);
        }
      },
      fail: (err) => {
        wx.showModal({
          title: '对话发送失败',
          content: err && err.message ? err.message : '请检查服务器地址、HTTPS 域名和 AI_API_KEY',
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  triggerSmartIntervention(theme, lastInput) {
    const msgs = { 
      sister: '捕捉到压力，做个呼吸练习吗？', 
      younger_sister: '要把这些评价丢进碎纸机吗？', 
      friend: '去点亮成长小羊吗？' 
    };

    wx.showModal({
      title: '心灵贴士',
      content: msgs[theme],
      confirmText: '去执行',
      success: (res) => {
        if (res.confirm) {
          if (theme === 'sister') this.startBreathing(); 
          else if (theme === 'younger_sister') this.setData({ shredText: lastInput }); 
          wx.pageScrollTo({ selector: '.intervention-card', duration: 500 });
        }
      }
    });
  },

  startBreathing() {
    if (this.breathTimer) clearInterval(this.breathTimer);
    this.setData({ showBreathing: true, isInhaling: true, breathingHint: '慢慢吸气...' });
    this.breathTimer = setInterval(() => {
      const nextStatus = !this.data.isInhaling;
      this.setData({ isInhaling: nextStatus, breathingHint: nextStatus ? '慢慢吸气...' : '缓缓呼气...' });
    }, 4000);
  },

  closeBreathing() { 
    if (this.breathTimer) clearInterval(this.breathTimer); 
    this.setData({ showBreathing: false }); 
  },

  onShredInput(e) { this.setData({ shredText: e.detail.value }); },
  
  startShred() {
    if (!this.data.shredText) return;
    this.setData({ isShredding: true });
    wx.vibrateShort();
    setTimeout(() => { 
      this.setData({ isShredding: false, shredText: '' }); 
      wx.showToast({ title: '负能量已化为碎片', icon: 'success' }); 
    }, 2000);
  },

  lightStar() {
    if (this.data.starCount < 7) {
      this.setData({ starCount: this.data.starCount + 1 });
      wx.vibrateShort();
    }
  },
  resetSheep() { this.setData({ starCount: 0 }); },

  emergencyStop() {
    this.startBreathing();
    wx.pageScrollTo({ selector: '.intervention-card', duration: 400 });
  },

  emergencyShred() {
    if (this.data.userInput) {
      this.setData({ shredText: this.data.userInput });
      this.startShred();
    }
  },

  emergencySheep() {
    this.setData({ starCount: this.data.starCount + 1 });
    wx.vibrateShort();
  }
});
