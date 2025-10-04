// moment页面逻辑
interface Post {
  id: string;
  text: string;
  images: string[];
  avatar: string;
  time: string;
  createdAt: number;
}

Page({
  data: {
    posts: [] as Post[],
    showPublish: false,
    publishText: '',
    publishImages: [] as any[],
    gridConfig: {
      column: 3,
      width: 120,
      height: 120
    },
    currentDate: {
      year: '',
      month: '',
      day: ''
    },
    weatherInfo: {
      temp: '22',
      desc: '晴朗',
      icon: '☀️'
    },
    countdownDays: 0,
    lunarDate: ''
  },

  onLoad() {
    this.loadSampleData();
    this.updateDateInfo();
    this.updateCountdown();
    this.updateLunarDate();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadPosts();
    this.updateDateInfo();
    this.updateCountdown();
    this.updateLunarDate();
  },

  // 加载示例数据
  loadSampleData() {
    const sampleImages = [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500534310201-bbddc30730ca?q=80&w=600&auto=format&fit=crop"
    ];

    const samplePosts: Post[] = [
      {
        id: '1',
        text: '周末踏青，心情很好',
        images: [sampleImages[0], sampleImages[1]],
        avatar: 'https://i.pravatar.cc/80?img=1',
        time: '12-25 14:30',
        createdAt: Date.now() - 3600000
      },
      {
        id: '2',
        text: '城市一角',
        images: [sampleImages[2]],
        avatar: 'https://i.pravatar.cc/80?img=2',
        time: '12-25 13:15',
        createdAt: Date.now() - 7200000
      },
      {
        id: '3',
        text: '记录此刻的美好',
        images: [sampleImages[0], sampleImages[1], sampleImages[2], sampleImages[3]],
        avatar: 'https://i.pravatar.cc/80?img=3',
        time: '12-25 11:45',
        createdAt: Date.now() - 10800000
      }
    ];

    this.setData({
      posts: samplePosts
    });
  },

  // 从本地存储加载动态
  loadPosts() {
    const posts = wx.getStorageSync('posts') || [];
    this.setData({ posts });
  },

  // 保存动态到本地存储
  savePosts() {
    wx.setStorageSync('posts', this.data.posts);
  },

  // 显示发布弹窗
  showPublishPopup() {
    this.setData({ showPublish: true });
  },

  // 隐藏发布弹窗
  hidePublishPopup() {
    this.setData({ showPublish: false });
  },

  // 发布弹窗显示状态变化
  onPublishVisibleChange(e: any) {
    this.setData({ showPublish: e.detail.visible });
  },

  // 文字内容变化
  onTextChange(e: any) {
    this.setData({ publishText: e.detail.value });
  },

  // 图片变化
  onImageChange(e: any) {
    this.setData({ publishImages: e.detail.value });
  },

  // 重置发布内容
  resetPublish() {
    this.setData({
      publishText: '',
      publishImages: []
    });
  },

  // 提交发布
  submitPublish() {
    const { publishText, publishImages } = this.data;
    
    if (!publishText.trim() && publishImages.length === 0) {
      wx.showToast({
        title: '请输入内容或选择图片',
        icon: 'none'
      });
      return;
    }

    const newPost: Post = {
      id: Date.now().toString(),
      text: publishText.trim(),
      images: publishImages.map((img: any) => img.url || img),
      avatar: 'https://i.pravatar.cc/80?img=' + (Math.floor(Math.random() * 70) + 1),
      time: this.formatTime(new Date()),
      createdAt: Date.now()
    };

    const posts = [newPost, ...this.data.posts];
    this.setData({ posts });
    this.savePosts();

    // 重置发布内容
    this.resetPublish();
    this.hidePublishPopup();

    // 显示成功提示
    wx.showToast({
      title: '发布成功',
      icon: 'success'
    });

    // 通知其他页面更新统计
    this.notifyStatsUpdate();
  },

  // 格式化时间
  formatTime(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  // 更新日期信息
  updateDateInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    const currentDate = {
      year: year.toString(),
      month: month.toString(),
      day: day.toString()
    };

    // 模拟天气信息
    const weatherTypes = [
      { desc: '晴朗', icon: '☀️', temp: 20 + Math.floor(Math.random() * 10) },
      { desc: '多云', icon: '⛅', temp: 15 + Math.floor(Math.random() * 8) },
      { desc: '下雨', icon: '🌧️', temp: 10 + Math.floor(Math.random() * 6) }
    ];
    
    const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    const weatherInfo = {
      temp: randomWeather.temp.toString(),
      desc: randomWeather.desc,
      icon: randomWeather.icon
    };

    this.setData({
      currentDate,
      weatherInfo
    });
  },

  // 更新倒计时
  updateCountdown() {
    const targetDate = new Date('2025-09-17');
    const today = new Date();
    const timeDiff = today.getTime() - targetDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    this.setData({
      countdownDays: Math.max(0, daysDiff)
    });
  },

  // 更新农历日期
  updateLunarDate() {
    const now = new Date();
    const lunarDate = this.getLunarDate(now);
    this.setData({ lunarDate });
  },

  // 获取农历日期（简化版本，实际项目中建议使用专业的农历库）
  getLunarDate(date: Date): string {
    // 这里使用简化的农历转换，实际项目中建议使用专业的农历库如 solarlunar
    const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                      '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
    
    // 简化的农历计算（仅作演示，实际应使用专业算法）
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 这里使用一个简化的偏移计算，实际项目中应使用准确的农历算法
    const lunarMonth = ((month - 1 + Math.floor(Math.random() * 2)) % 12) + 1;
    const lunarDay = ((day - 1 + Math.floor(Math.random() * 2)) % 30) + 1;
    
    return `${lunarMonths[lunarMonth - 1]}月${lunarDays[lunarDay - 1]}`;
  },

  // 通知统计更新
  notifyStatsUpdate() {
    const { posts } = this.data;
    const stats = {
      postsCount: posts.length,
      imagesCount: posts.reduce((sum, post) => sum + (post.images?.length || 0), 0),
      textCount: posts.reduce((sum, post) => sum + (post.text?.trim() ? 1 : 0), 0)
    };

    // 通过事件总线通知其他页面
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.stats = stats;
  }
});