Page({
  data: {
    username: '',
    welcomeMsg: '',
    isLoading: true
  },

  onLoad() {
    const app = getApp();
    app.request({
      url: '/api/mental/profile',
      method: 'GET',
      success: (res) => {
        const profile = res.data || {};
        app.globalData.username = profile.username || '';
        wx.setStorageSync('mentalUsername', app.globalData.username);
        this.handleUserLogic({ username: app.globalData.username });
      },
      fail: () => {
        wx.showToast({ title: '心灵空间同步失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    });
  },

  handleUserLogic(userData) {
    if (userData.username) {
      this.setWelcome(userData.username);
    } else {
      // 有ID没名字 = 新用户
      this.setData({ isLoading: false });
      this.showNameModal();
    }
  },

  setWelcome(name) {
    const hour = new Date().getHours();
    let greet = "你好";
    if (hour < 9) greet = "早安";
    else if (hour < 12) greet = "上午好";
    else if (hour < 18) greet = "下午好";
    else greet = "晚上好";

    this.setData({
      username: name,
      welcomeMsg: `${greet}，${name}。新的一天我们会好好的。`,
      isLoading: false
    });
  },

  showNameModal() {
    wx.showModal({
      title: '初次见面',
      editable: true,
      placeholderText: '给自己起一个温暖的名字吧',
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveName(res.content);
        } else if (res.cancel) {
          // 如果用户点取消，设置默认名确保流程继续
          this.saveName("旅人");
        }
      }
    });
  },

  saveName(name) {
    const app = getApp();
    this.setData({ isLoading: true });
    
    app.request({
      url: '/api/mental/profile',
      method: 'POST',
      data: { 
        username: name 
      },
      success: (res) => {
        const profile = res.data || {};
        app.globalData.username = profile.username || name;
        wx.setStorageSync('mentalUsername', app.globalData.username);
        this.setWelcome(app.globalData.username);
      },
      fail: (err) => {
        console.error("保存用户名失败", err);
        wx.showToast({ title: '保存失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    });
  },

  selectTheme(e) {
    getApp().globalData.currentTheme = e.currentTarget.dataset.theme;
    wx.navigateTo({ url: '/pages/mental-chat/mental-chat' });
  },

  goToTool(e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({ url: url });
  }
});
