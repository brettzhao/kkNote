// app.ts
import { initCloud } from './utils/auth';

interface UserInfo {
  openid: string;
  nickName: string;
  avatarUrl: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  language: string;
}

interface IAppOption {
  globalData: {
    userInfo?: UserInfo;
    isLoggedIn: boolean;
    stats?: {
      postsCount: number;
      imagesCount: number;
      textCount: number;
    };
  };
}

App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    stats: {
      postsCount: 0,
      imagesCount: 0,
      textCount: 0
    }
  },

  onLaunch() {
    console.log('kkNote 小程序启动');
    this.initApp();
  },

  onShow() {
    console.log('kkNote 小程序显示');
  },

  onHide() {
    console.log('kkNote 小程序隐藏');
  },

  // 初始化应用
  initApp() {
    console.log('应用初始化');
    
    // 初始化云开发
    const cloudInitResult = initCloud();
    if (!cloudInitResult) {
      console.warn('云开发初始化失败，部分功能可能不可用');
    }
    
    // 检查用户登录状态
    this.checkUserLoginStatus();
    
    // 检查本地存储的动态数据
    this.loadPostsFromStorage();
  },

  // 检查用户登录状态
  checkUserLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const openid = wx.getStorageSync('openid');
      
      if (userInfo && openid) {
        this.globalData.userInfo = userInfo;
        this.globalData.isLoggedIn = true;
        console.log('用户已登录:', userInfo.nickName);
      } else {
        this.globalData.isLoggedIn = false;
        console.log('用户未登录');
      }
    } catch (error) {
      console.error('检查用户登录状态失败', error);
      this.globalData.isLoggedIn = false;
    }
  },

  // 设置用户信息
  setUserInfo(userInfo: UserInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('openid', userInfo.openid);
  },

  // 清除用户信息
  clearUserInfo() {
    this.globalData.userInfo = undefined;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
  },

  // 从本地存储加载动态数据
  loadPostsFromStorage() {
    const posts = wx.getStorageSync('posts') || [];
    this.updateGlobalStats(posts);
  },

  // 更新全局统计数据
  updateGlobalStats(posts: any[]) {
    const stats = {
      postsCount: posts.length,
      imagesCount: posts.reduce((sum, post) => sum + (post.images?.length || 0), 0),
      textCount: posts.reduce((sum, post) => sum + (post.text?.trim() ? 1 : 0), 0)
    };
    this.globalData.stats = stats;
  }
});