// profile页面逻辑
interface UserInfo {
  name: string;
  id: string;
  avatar: string;
}

interface Stats {
  postsCount: number;
  imagesCount: number;
  textCount: number;
}

Page({
  data: {
    userInfo: {
      name: 'User_0012',
      id: '0012',
      avatar: 'https://i.pravatar.cc/120?img=12'
    } as UserInfo,
    stats: {
      postsCount: 0,
      imagesCount: 0,
      textCount: 0
    } as Stats
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    // 页面显示时刷新统计数据
    this.loadStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
    this.setData({ userInfo });
  },

  // 加载统计数据
  loadStats() {
    // 从全局数据获取统计信息
    const app = getApp();
    if (app.globalData && app.globalData.stats) {
      this.setData({ stats: app.globalData.stats });
      return;
    }

    // 如果没有全局数据，从本地存储的动态计算
    this.calculateStatsFromPosts();
  },

  // 从动态数据计算统计
  calculateStatsFromPosts() {
    const posts = wx.getStorageSync('posts') || [];
    const stats = {
      postsCount: posts.length,
      imagesCount: posts.reduce((sum: number, post: any) => sum + (post.images?.length || 0), 0),
      textCount: posts.reduce((sum: number, post: any) => sum + (post.text?.trim() ? 1 : 0), 0)
    };
    this.setData({ stats });
  },

  // 设置点击
  onSettingClick() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  // 关于点击
  onAboutClick() {
    wx.showModal({
      title: '关于 kkNote',
      content: '一个基于 TDesign 的微信小程序动态分享应用',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});