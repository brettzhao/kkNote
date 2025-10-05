// profile页面逻辑
import { initCloud } from '../../utils/auth';
import { getOpenid, saveOrUpdateUserInfo, getUserInfo, getUserInfoById, calculateUserStats } from '../../utils/cloud';

interface UserInfo {
  openid: string;
  nickName: string;
  avatarUrl: string;
  gender: number;
  city: string;
  province: string;
  country: string;
  language: string;
  createTime?: Date;
  updateTime?: Date;
}

interface Stats {
  postsCount: number;
  imagesCount: number;
  textCount: number;
  totalWords: number;
  avgWords: number;
  activeDays: number;
}

Page({
  data: {
    userInfo: {} as UserInfo,
    isLoggedIn: false,
    isLoading: true, // 添加loading状态
    defaultAvatar: 'icon/avatar_un_login.png',
    currentTime: '',
    stats: {
      postsCount: 0,
      imagesCount: 0,
      textCount: 0,
      totalWords: 0,
      avgWords: 0,
      activeDays: 0
    } as Stats
  },

  onLoad() {
    console.log('Profile页面加载');
    
    // 设置当前时间
    this.setData({
      currentTime: new Date().toLocaleString()
    });
    
    // 初始化云开发
    initCloud();
    
    // 自动获取openid并加载用户数据
    this.autoLoadUserData();
    this.loadStats();
  },

  onShow() {
    // 页面显示时实时刷新统计数据
    console.log('Profile页面显示，开始实时更新统计数据...');
    this.loadStats();
  },

  // 自动加载用户数据（每次登录新建记录）
  async autoLoadUserData() {
    try {
      console.log('开始自动加载用户数据...');
      
      // 显示loading状态
      this.setData({ isLoading: true });
      
      // 先检查本地存储中是否有openid
      let openid = wx.getStorageSync('openid');
      
      if (!openid) {
        console.log('本地未找到openid，尝试获取...');
        try {
          // 自动获取openid
          openid = await getOpenid();
          console.log('自动获取openid成功:', openid);
          
          // 保存到本地存储
          wx.setStorageSync('openid', openid);
        } catch (error) {
          console.error('获取openid失败:', error);
          this.setData({ 
            isLoggedIn: false,
            userInfo: {} as UserInfo
          });
          return;
        }
      }
      
      // 检查是否为指定用户
      const targetOpenid = 'okU9A1yvJI1WS_NfmEo0wMY9Lyl8';
      const specificRecordId = '2d0db0d268e24ae5017b3a42206552ea';
      
      if (openid !== targetOpenid) {
        console.log('当前用户不是指定用户，查询特定_id记录，openid:', openid);
        
        // 非指定用户，查询特定_id的记录
        try {
          const userInfo = await getUserInfoById(specificRecordId);
          console.log('查询特定_id记录成功:', userInfo);
          
          if (userInfo) {
            this.setData({
              isLoggedIn: true,
              userInfo: userInfo,
              isLoading: false // 隐藏loading状态
            });
            
            // 更新本地存储
            wx.setStorageSync('userInfo', userInfo);
          } else {
            console.warn('未找到特定_id记录，使用默认用户信息');
            const defaultUserInfo = {
              openid: openid,
              nickName: '微信用户',
              avatarUrl: this.data.defaultAvatar,
              gender: 0,
              city: '',
              province: '',
              country: '',
              language: 'zh_CN'
            };
            
            this.setData({
              isLoggedIn: true,
              userInfo: defaultUserInfo,
              isLoading: false
            });
            
            wx.setStorageSync('userInfo', defaultUserInfo);
          }
        } catch (error) {
          console.error('查询特定_id记录失败:', error);
          
          // 查询失败时使用默认用户信息
          const defaultUserInfo = {
            openid: openid,
            nickName: '微信用户',
            avatarUrl: this.data.defaultAvatar,
            gender: 0,
            city: '',
            province: '',
            country: '',
            language: 'zh_CN'
          };
          
          this.setData({
            isLoggedIn: true,
            userInfo: defaultUserInfo,
            isLoading: false
          });
          
          wx.setStorageSync('userInfo', defaultUserInfo);
        }
      } else {
        console.log('当前用户是指定用户，使用正常流程，openid:', openid);
        
        // 指定用户，使用正常流程
        const newUserInfo = {
          openid: openid,
          nickName: '微信用户',
          avatarUrl: this.data.defaultAvatar,
          gender: 0,
          city: '',
          province: '',
          country: '',
          language: 'zh_CN',
          createTime: new Date(),
          updateTime: new Date()
        };
        
        // 保存或获取用户记录
        try {
          const userInfo = await saveOrUpdateUserInfo(newUserInfo);
          console.log('获取用户记录成功:', userInfo);
          
          this.setData({
            isLoggedIn: true,
            userInfo: userInfo,
            isLoading: false // 隐藏loading状态
          });
          
          // 更新本地存储
          wx.setStorageSync('userInfo', userInfo);
        } catch (saveError) {
          console.warn('保存或获取用户记录失败:', saveError);
          
          // 如果保存失败，使用新创建的记录
          this.setData({
            isLoggedIn: true,
            userInfo: newUserInfo,
            isLoading: false // 隐藏loading状态
          });
          
          // 更新本地存储
          wx.setStorageSync('userInfo', newUserInfo);
        }
      }
      
    } catch (error) {
      console.error('自动加载用户数据失败:', error);
      // 出错时使用本地存储作为备选
      const userInfo = wx.getStorageSync('userInfo') || {};
      const isLoggedIn = !!(userInfo.openid);
      this.setData({ 
        isLoggedIn, 
        userInfo,
        isLoading: false // 隐藏loading状态
      });
    }
  },


  // 加载用户信息（从云数据库）
  async loadUserInfo() {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        console.log('未找到openid，无法加载用户信息');
        return;
      }
      
      // 检查是否为指定用户
      const targetOpenid = 'okU9A1yvJI1WS_NfmEo0wMY9Lyl8';
      const specificRecordId = '2d0db0d268e24ae5017b3a42206552ea';
      
      let userInfo;
      
      if (openid !== targetOpenid) {
        console.log('当前用户不是指定用户，查询特定_id记录，openid:', openid);
        // 非指定用户，查询特定_id的记录
        userInfo = await getUserInfoById(specificRecordId);
      } else {
        console.log('当前用户是指定用户，查询正常记录，openid:', openid);
        // 指定用户，查询正常记录
        userInfo = await getUserInfo(openid);
      }
      
      if (userInfo) {
        console.log('从云数据库加载用户信息成功:', userInfo);
        this.setData({ userInfo });
        
        // 更新本地存储
        wx.setStorageSync('userInfo', userInfo);
      } else {
        console.log('云数据库中未找到用户信息');
        // 如果云数据库中没有，使用本地存储
        const localUserInfo = wx.getStorageSync('userInfo') || {};
        this.setData({ userInfo: localUserInfo });
      }
      
    } catch (error) {
      console.error('加载用户信息失败:', error);
      // 出错时使用本地存储
      const userInfo = wx.getStorageSync('userInfo') || {};
      this.setData({ userInfo });
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      console.log('开始加载用户统计数据...');
      
      // 获取当前用户的openid
      const openid = wx.getStorageSync('openid');
      console.log('当前openid:', openid);
      
      if (!openid) {
        console.log('未找到openid，无法加载统计数据');
        // 设置默认统计数据
        const defaultStats = {
          postsCount: 0,
          imagesCount: 0,
          textCount: 0,
          totalWords: 0,
          avgWords: 0,
          activeDays: 0
        };
        this.setData({ stats: defaultStats });
        return;
      }
      
      // 简化逻辑：直接使用当前openid查询统计数据
      console.log('使用openid查询统计数据:', openid);
      
      // 计算用户统计数据
      const stats = await calculateUserStats(openid);
      console.log('用户统计数据加载成功:', stats);
      
      this.setData({
        stats: stats
      });
      
      console.log('统计数据已设置到页面数据中');
      
    } catch (error) {
      console.error('加载统计数据失败:', error);
      
      // 出错时使用默认统计数据
      const defaultStats = {
        postsCount: 0,
        imagesCount: 0,
        textCount: 0,
        totalWords: 0,
        avgWords: 0,
        activeDays: 0
      };
      
      console.log('使用默认统计数据:', defaultStats);
      this.setData({
        stats: defaultStats
      });
    }
  },

  // 用户卡片点击
  onUserCardTap() {
    // 用户卡片点击处理
    console.log('用户卡片被点击，当前用户信息:', this.data.userInfo);
  },

  // 关于点击
  onAboutClick() {
    wx.showModal({
      title: '关于 kkNote',
      content: '一个基于 TDesign 的微信小程序动态分享应用',
      showCancel: false
    });
  }
});