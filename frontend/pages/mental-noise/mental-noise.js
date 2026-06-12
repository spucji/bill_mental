// pages/noise/noise.js

Page({
  data: {
    currentTheme: 'sister',
    isPlaying: false,
    currentNoise: '',
    playingName: '',
    noiseList: [
      { type: 'rain', name: '小雨', icon: '🌧️', fileName: 'rain.mp3' },
      { type: 'forest', name: '森林', icon: '🌲', fileName: 'forest.mp3' },
      { type: 'wave', name: '波浪', icon: '🌊', fileName: 'waterfall.mp3' },
      { type: 'zen', name: '禅定', icon: '🧘', fileName: 'gifted-girl.mp3' },
      { type: 'campfire', name: '篝火', icon: '🏕️', fileName: 'campfire-in-the-woods.mp3' },
      { type: 'bird', name: '鸟鸣', icon: '🕊️', fileName: 'birds-chirping.mp3' }
    ]
  },

  onShow() {
    const app = getApp();
    if (app && app.globalData) {
      this.setData({ currentTheme: app.globalData.currentTheme });
    }
    const colors = { sister: '#2e7d32', younger_sister: '#d81b60', friend: '#ef6c00' };
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: colors[this.data.currentTheme] || '#2e7d32'
    });

    wx.setInnerAudioOption({
      obeyMuteSwitch: false,
      speakerOn: true
    });
  },

  onLoad() {
    this.audioCtx = wx.createInnerAudioContext();
    this.audioCtx.loop = true;
  },

  async getAudioResource(item) {
    const fs = wx.getFileSystemManager();
    const localFilePath = `${wx.env.USER_DATA_PATH}/${item.fileName}`;

    try {
      fs.accessSync(localFilePath);
      return localFilePath;
    } catch (e) {
      console.log('无缓存，准备下载');
    }

    wx.showLoading({ title: '资源加载中...', mask: true });

    try {
      const audioBuffer = await this.fetchBuffer(item.fileName);
      fs.writeFileSync(localFilePath, audioBuffer, 'binary');
      return localFilePath;
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      return null;
    } finally {
      wx.hideLoading();
    }
  },

  // 统一调用封装后的请求下载资源
  fetchBuffer(fileName) {
    const app = getApp();
    return new Promise((resolve, reject) => {
      app.request({
        url: `/api/mental/sounds/${fileName}`,
        method: 'GET',
        responseType: 'arraybuffer',
        success: (res) => {
          if (res.statusCode === 200) resolve(res.data);
          else reject(new Error('Audio Fetch Error'));
        },
        fail: reject
      });
    });
  },

  async playNoise(e) {
    const type = e.currentTarget.dataset.type;
    const target = this.data.noiseList.find(i => i.type === type);

    if (this.data.currentNoise === type && this.data.isPlaying) {
      this.stopNoise();
      return;
    }

    const audioPath = await this.getAudioResource(target);
    if (audioPath) {
      this.audioCtx.stop();
      this.audioCtx.src = audioPath;
      this.audioCtx.play();
      this.setData({ currentNoise: type, playingName: target.name, isPlaying: true });
      wx.vibrateShort();
    }
  },

  stopNoise() {
    if (this.audioCtx) this.audioCtx.stop();
    this.setData({ isPlaying: false, currentNoise: '' });
  },

  onUnload() {
    if (this.audioCtx) this.audioCtx.destroy();
  }
});
